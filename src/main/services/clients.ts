import os from 'node:os';
import crypto from 'node:crypto';
import { asc, eq, gte, lt } from 'drizzle-orm';
import type { ActiveClientInfo } from '../../shared/types';
import type { DbRuntimeClient } from '../../shared/db-runtime';
import type { DbContext } from '../db/connection';
import { activeClient } from '../db/schema';
import { debugSync } from './debug';

const HEARTBEAT_MS = 5 * 1000;
// A stricter 30s window causes false stale detection when client clocks drift.
const STALE_MS = 2 * 60 * 1000;

/**
 * Handles Is Lock Contention Error.
 */
function isLockContentionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('database is locked') ||
    message.includes('SQLITE_BUSY') ||
    message.includes('SQLITE_LOCKED') ||
    message.includes('locking protocol')
  );
}

/**
 * Handles Is Corruption Error.
 */
function isCorruptionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('database disk image is malformed') || message.includes('malformed');
}

/**
 * Handles Now Iso.
 */
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Handles Stale Cutoff Iso.
 */
function staleCutoffIso(): string {
  return new Date(Date.now() - STALE_MS).toISOString();
}

/**
 * Handles Detect Primary Ip.
 */
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

  private disabled = false;

  constructor(
    private readonly dbBridge: DbRuntimeClient | null = null,
    private readonly useDbUtilityProcess = false,
  ) {}

  /**
   * Handles Get Client Id.
   */
  public getClientId(): string {
    return this.clientId;
  }

  /**
   * Handles Get Computer Name.
   */
  public getComputerName(): string {
    return os.hostname();
  }

  /**
   * Handles Start.
   */
  public start(ctx: DbContext): void {
    this.stop(true);
    this.ctx = ctx;
    this.disabled = false;
    debugSync('clients', 'start', { clientId: this.clientId, dbPath: ctx.path });
    this.heartbeat();
    this.timer = setInterval(() => {
      this.heartbeat();
    }, HEARTBEAT_MS);
  }

  /**
   * Handles Stop.
   */
  public stop(removeEntry = true): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (removeEntry && this.ctx) {
      try {
        if (this.useDbUtilityProcess && this.dbBridge) {
          void this.dbBridge
            .request(
              'presence-remove-self',
              {
                dbPath: this.ctx.path,
                clientId: this.clientId,
              },
              'low',
            )
            .catch(() => undefined);
        } else {
          this.ctx.db.delete(activeClient).where(eq(activeClient.clientId, this.clientId)).run();
        }
        debugSync('clients', 'stop:removed-self', { clientId: this.clientId, dbPath: this.ctx.path });
      } catch {
        // ignore shutdown errors
      }
    }
    this.ctx = null;
    this.isMaster = false;
  }

  /**
   * Handles Can Write Backups.
   */
  public canWriteBackups(): boolean {
    return this.isMaster;
  }

  /**
   * Handles List Active Clients.
   */
  public listActiveClients(): ActiveClientInfo[] {
    if (!this.ctx || this.disabled) {
      return [];
    }
    if (this.useDbUtilityProcess && this.dbBridge) {
      return [];
    }
    try {
      const rows = this.ctx.db
        .select()
        .from(activeClient)
        .where(gte(activeClient.lastSeen, staleCutoffIso()))
        .orderBy(asc(activeClient.computerName), asc(activeClient.startedAt))
        .all();
      const leader = this.ctx.db
        .select({ clientId: activeClient.clientId })
        .from(activeClient)
        .where(gte(activeClient.lastSeen, staleCutoffIso()))
        .orderBy(asc(activeClient.startedAt), asc(activeClient.clientId))
        .get();
      const leaderId = leader?.clientId ?? this.clientId;
      this.isMaster = leaderId === this.clientId;
      debugSync('clients', 'list', {
        clientId: this.clientId,
        dbPath: this.ctx.path,
        visibleClients: rows.length,
        isMaster: this.isMaster,
      });
      return rows.map((row) => ({
        clientId: row.clientId,
        computerName: row.computerName,
        ipAddress: row.ipAddress,
        dbPath: row.dbPath,
        lastSeen: row.lastSeen,
        isMaster: row.clientId === leaderId,
        isSelf: row.clientId === this.clientId,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isCorruptionError(error)) {
        this.disablePresence('list:corruption', message);
        return [];
      }
      throw error;
    }
  }

  /**
   * Handles Heartbeat.
   */
  private heartbeat(): void {
    if (!this.ctx) {
      return;
    }
    const ctx = this.ctx;
    const now = nowIso();
    const staleCutoff = staleCutoffIso();
    const computerName = os.hostname();
    const ipAddress = detectPrimaryIp();

    try {
      if (this.useDbUtilityProcess && this.dbBridge) {
        void this.heartbeatViaUtility(ctx.path, computerName, ipAddress);
        return;
      }
      ctx.db.transaction((tx) => {
        tx.delete(activeClient).where(lt(activeClient.lastSeen, staleCutoff)).run();

        tx.insert(activeClient)
          .values({
            clientId: this.clientId,
            computerName,
            ipAddress,
            dbPath: ctx.path,
            lastSeen: now,
            startedAt: this.startedAt,
            isMaster: false,
          })
          .onConflictDoUpdate({
            target: activeClient.clientId,
            set: {
              computerName,
              ipAddress,
              dbPath: ctx.path,
              lastSeen: now,
            },
          })
          .run();

        const leader = tx
          .select({ clientId: activeClient.clientId })
          .from(activeClient)
          .where(gte(activeClient.lastSeen, staleCutoff))
          .orderBy(asc(activeClient.startedAt), asc(activeClient.clientId))
          .get();
        const leaderId = leader?.clientId ?? this.clientId;

        if (leaderId === this.clientId) {
          tx.delete(activeClient)
            .where(lt(activeClient.lastSeen, staleCutoff))
            .run();
        }
        this.isMaster = leaderId === this.clientId;
        debugSync('clients', 'heartbeat', {
          clientId: this.clientId,
          dbPath: ctx.path,
          leaderId,
          isMaster: this.isMaster,
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isLockContentionError(error)) {
        debugSync('clients', 'heartbeat:skipped-lock', {
          clientId: this.clientId,
          dbPath: ctx.path,
          message,
        });
        return;
      }
      if (isCorruptionError(error)) {
        this.disablePresence('heartbeat:corruption', message);
        return;
      }
      debugSync('clients', 'heartbeat:failed', {
        clientId: this.clientId,
        dbPath: ctx.path,
        message,
      });
    }
  }

  /**
   * Runs heartbeat over DB utility process.
   */
  private async heartbeatViaUtility(dbPath: string, computerName: string, ipAddress: string): Promise<void> {
    if (!this.dbBridge) {
      return;
    }
    try {
      const result = await this.dbBridge.request(
        'presence-heartbeat',
        {
          dbPath,
          clientId: this.clientId,
          computerName,
          ipAddress,
          startedAt: this.startedAt,
        },
        'low',
      );
      this.isMaster = result.isMaster;
      debugSync('clients', 'heartbeat', {
        clientId: this.clientId,
        dbPath,
        leaderId: result.isMaster ? this.clientId : 'other',
        isMaster: this.isMaster,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isLockContentionError(error)) {
        debugSync('clients', 'heartbeat:skipped-lock', {
          clientId: this.clientId,
          dbPath,
          message,
        });
        return;
      }
      if (isCorruptionError(error)) {
        this.disablePresence('heartbeat:corruption', message);
        return;
      }
      debugSync('clients', 'heartbeat:failed', {
        clientId: this.clientId,
        dbPath,
        message,
      });
    }
  }

  /**
   * Handles Disable Presence.
   */
  private disablePresence(reason: string, message: string): void {
    this.disabled = true;
    this.isMaster = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    debugSync('clients', 'presence-disabled', {
      clientId: this.clientId,
      reason,
      message,
      dbPath: this.ctx?.path,
    });
  }
}
