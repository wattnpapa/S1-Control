import os from 'node:os';
import crypto from 'node:crypto';
import { asc, eq, gte, lt } from 'drizzle-orm';
import type { ActiveClientInfo } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { activeClient } from '../db/schema';

const HEARTBEAT_MS = 5 * 1000;
const STALE_MS = 30 * 1000;

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
  private ctx: DbContext | null = null;

  private timer: NodeJS.Timeout | null = null;

  private readonly clientId = crypto.randomUUID();

  private readonly startedAt = nowIso();

  private isMaster = false;

  public start(ctx: DbContext): void {
    this.stop(true);
    this.ctx = ctx;
    void this.heartbeat();
    this.timer = setInterval(() => {
      void this.heartbeat();
    }, HEARTBEAT_MS);
  }

  public stop(removeEntry = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (removeEntry && this.ctx) {
      try {
        this.ctx.db.delete(activeClient).where(eq(activeClient.clientId, this.clientId)).run();
      } catch {
        // ignore shutdown errors
      }
    }
    this.ctx = null;
    this.isMaster = false;
  }

  public canWriteBackups(): boolean {
    return this.isMaster;
  }

  public listActiveClients(): ActiveClientInfo[] {
    if (!this.ctx) {
      return [];
    }
    void this.heartbeat();
    const rows = this.ctx.db
      .select()
      .from(activeClient)
      .where(gte(activeClient.lastSeen, staleCutoffIso()))
      .orderBy(asc(activeClient.computerName), asc(activeClient.startedAt))
      .all();
    return rows.map((row) => ({
      clientId: row.clientId,
      computerName: row.computerName,
      ipAddress: row.ipAddress,
      lastSeen: row.lastSeen,
      isMaster: row.isMaster,
      isSelf: row.clientId === this.clientId,
    }));
  }

  private async heartbeat(): Promise<void> {
    if (!this.ctx) {
      return;
    }
    const ctx = this.ctx;
    const now = nowIso();
    const staleCutoff = staleCutoffIso();
    const computerName = os.hostname();
    const ipAddress = detectPrimaryIp();

    ctx.db.transaction((tx) => {
      tx.delete(activeClient).where(lt(activeClient.lastSeen, staleCutoff)).run();

      tx.insert(activeClient)
        .values({
          clientId: this.clientId,
          computerName,
          ipAddress,
          lastSeen: now,
          startedAt: this.startedAt,
          isMaster: false,
        })
        .onConflictDoUpdate({
          target: activeClient.clientId,
          set: {
            computerName,
            ipAddress,
            lastSeen: now,
          },
        })
        .run();

      const leader = tx
        .select({ clientId: activeClient.clientId })
        .from(activeClient)
        .orderBy(asc(activeClient.startedAt), asc(activeClient.clientId))
        .get();
      const leaderId = leader?.clientId ?? this.clientId;
      tx.update(activeClient)
        .set({ isMaster: false })
        .run();
      tx.update(activeClient)
        .set({ isMaster: true })
        .where(eq(activeClient.clientId, leaderId))
        .run();
      this.isMaster = leaderId === this.clientId;
    });
  }
}
