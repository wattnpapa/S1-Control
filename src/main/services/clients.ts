import os from 'node:os';
import crypto from 'node:crypto';
import type { ActiveClientInfo } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { systemFilePath } from '../db/connection';
import { readSystemFile, writeSystemFile } from '../json-store/system-store';
import { debugSync } from './debug';

const HEARTBEAT_MS = 5 * 1000;
const STALE_MS = 2 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function staleCutoffIso(): string {
  return new Date(Date.now() - STALE_MS).toISOString();
}

function detectPrimaryIp(): string {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return '127.0.0.1';
}

export class ClientPresenceService {
  private dbPath: string | null = null;

  private timer: NodeJS.Timeout | null = null;

  private readonly clientId = crypto.randomUUID();

  private readonly startedAt = nowIso();

  private isMaster = false;

  private disabled = false;

  private cachedActiveClients: ActiveClientInfo[] = [];

  constructor(
    private readonly _dbBridge: unknown = null,
    private readonly _useDbUtilityProcess = false,
  ) {}

  public getClientId(): string {
    return this.clientId;
  }

  public getComputerName(): string {
    return os.hostname();
  }

  public start(ctx: DbContext): void {
    this.stop(true);
    this.dbPath = ctx.path;
    this.disabled = false;
    debugSync('clients', 'start', { clientId: this.clientId, dbPath: ctx.path });
    this.heartbeat();
    this.timer = setInterval(() => {
      this.heartbeat();
    }, HEARTBEAT_MS);
  }

  public stop(removeEntry = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const dbPath = this.dbPath;
    if (removeEntry && dbPath) {
      try {
        // Direkt lesen/schreiben ohne Lock (stop ist terminal, kein concurrent write erwartet)
        const sysPath = systemFilePath(dbPath);
        const sys = readSystemFile(sysPath);
        sys.activeClients = sys.activeClients.filter((c) => c.clientId !== this.clientId);
        writeSystemFile(sysPath, sys);
        debugSync('clients', 'stop:removed-self', { clientId: this.clientId, dbPath });
      } catch {
        // ignore shutdown errors
      }
    }
    this.dbPath = null;
    this.isMaster = false;
  }

  public canWriteBackups(): boolean {
    return this.isMaster;
  }

  public listActiveClients(): ActiveClientInfo[] {
    if (!this.dbPath || this.disabled) {
      return this.cachedActiveClients;
    }
    try {
      const system = readSystemFile(systemFilePath(this.dbPath));
      const cutoff = staleCutoffIso();
      const active = system.activeClients.filter((c) => c.lastSeen >= cutoff);
      const leader = [...active].sort((a, b) => {
        const cmp = a.startedAt.localeCompare(b.startedAt);
        return cmp !== 0 ? cmp : a.clientId.localeCompare(b.clientId);
      })[0];
      const leaderId = leader?.clientId ?? this.clientId;
      this.isMaster = leaderId === this.clientId;
      this.cachedActiveClients = active.map((c) => ({
        clientId: c.clientId,
        computerName: c.computerName,
        ipAddress: c.ipAddress,
        dbPath: c.dbPath,
        lastSeen: c.lastSeen,
        isMaster: c.clientId === leaderId,
        isSelf: c.clientId === this.clientId,
      }));
      return this.cachedActiveClients;
    } catch {
      return this.cachedActiveClients;
    }
  }

  private heartbeat(): void {
    const dbPath = this.dbPath;
    if (!dbPath || this.disabled) {
      return;
    }
    const now = nowIso();
    const cutoff = staleCutoffIso();
    const computerName = os.hostname();
    const ipAddress = detectPrimaryIp();

    try {
      // Lockfrei: Heartbeat ist idempotent; bei Konflikt schreibt der nächste Heartbeat
      const sysPath = systemFilePath(dbPath);
      const system = readSystemFile(sysPath);
      system.activeClients = system.activeClients.filter((c) => c.lastSeen >= cutoff);
      const existing = system.activeClients.find((c) => c.clientId === this.clientId);
      if (existing) {
        existing.computerName = computerName;
        existing.ipAddress = ipAddress;
        existing.dbPath = dbPath;
        existing.lastSeen = now;
      } else {
        system.activeClients.push({
          clientId: this.clientId,
          computerName,
          ipAddress,
          dbPath,
          lastSeen: now,
          startedAt: this.startedAt,
          isMaster: false,
        });
      }
      const leader = [...system.activeClients].sort((a, b) => {
        const cmp = a.startedAt.localeCompare(b.startedAt);
        return cmp !== 0 ? cmp : a.clientId.localeCompare(b.clientId);
      })[0];
      const leaderId = leader?.clientId ?? this.clientId;
      this.isMaster = leaderId === this.clientId;
      writeSystemFile(sysPath, system);
      debugSync('clients', 'heartbeat', { clientId: this.clientId, dbPath, leaderId, isMaster: this.isMaster });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      debugSync('clients', 'heartbeat:failed', { clientId: this.clientId, dbPath, message });
    }
  }
}
