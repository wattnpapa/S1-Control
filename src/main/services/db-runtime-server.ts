/* eslint-disable max-lines */
import process from 'node:process';
import { asc, eq, gte, lt } from 'drizzle-orm';
import { openDatabaseWithRetry, type DbContext } from '../db/connection';
import { listAbschnittDetails, listAbschnittDetailsBatch, listAbschnitte } from './einsatz-read-service';
import { toSafeError } from './errors';
import { debugSync } from './debug';
import {
  createAbschnitt,
  createEinheit,
  createEinheitHelfer,
  createFahrzeug,
  deleteEinheitHelfer,
  hasUndoableCommand,
  splitEinheit,
  updateAbschnitt,
  updateEinheit,
  updateEinheitHelfer,
  updateFahrzeug,
} from './einsatz';
import {
  acquireRecordEditLock,
  ensureRecordEditLockOwnership,
  listRecordEditLocks,
  refreshRecordEditLock,
  releaseRecordEditLock,
} from './record-lock';
import { activeClient, einsatzEinheitHelfer } from '../db/schema';
import { moveEinheit, moveFahrzeug, undoLastCommand } from './command';
import {
  isDbRuntimeRequest,
  type DbRuntimeRequest,
  type DbRuntimeResponseUnion,
} from '../../shared/db-runtime';

const PRESENCE_STALE_MS = 2 * 60 * 1000;

class DbRuntimeServer {
  private ctx: DbContext | null = null;

  private activeDbPath: string | null = null;

  private readonly startedAt = Date.now();

  public bind(): void {
    process.on('message', (raw: unknown) => {
      if (!isDbRuntimeRequest(raw)) {
        return;
      }
      void this.handle(raw);
    });
  }

  // eslint-disable-next-line max-lines-per-function, complexity
  private async handle(request: DbRuntimeRequest): Promise<void> {
    try {
      // eslint-disable-next-line sonarjs/max-switch-cases
      switch (request.type) {
        case 'list-abschnitte': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = listAbschnitte(ctx, request.payload.einsatzId);
          this.sendOk(request, result);
          return;
        }
        case 'list-abschnitt-details': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = listAbschnittDetails(ctx, request.payload.einsatzId, request.payload.abschnittId);
          this.sendOk(request, result);
          return;
        }
        case 'list-abschnitt-details-batch': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = listAbschnittDetailsBatch(ctx, request.payload.einsatzId);
          this.sendOk(request, result);
          return;
        }
        case 'create-abschnitt': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = createAbschnitt(ctx, {
            einsatzId: request.payload.einsatzId,
            name: request.payload.name,
            systemTyp: request.payload.systemTyp,
            parentId: request.payload.parentId,
          });
          this.sendOk(request, result);
          return;
        }
        case 'update-abschnitt': {
          const ctx = this.ensureContext(request.payload.dbPath);
          updateAbschnitt(ctx, {
            einsatzId: request.payload.einsatzId,
            abschnittId: request.payload.abschnittId,
            name: request.payload.name,
            systemTyp: request.payload.systemTyp,
            parentId: request.payload.parentId,
          });
          this.sendOk(request, { ok: true });
          return;
        }
        case 'create-einheit': {
          const ctx = this.ensureContext(request.payload.dbPath);
          createEinheit(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'update-einheit': {
          const ctx = this.ensureContext(request.payload.dbPath);
          ensureRecordEditLockOwnership(
            ctx,
            {
              einsatzId: request.payload.input.einsatzId,
              entityType: 'EINHEIT',
              entityId: request.payload.input.einheitId,
            },
            request.payload.identity,
          );
          updateEinheit(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'create-fahrzeug': {
          const ctx = this.ensureContext(request.payload.dbPath);
          createFahrzeug(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'update-fahrzeug': {
          const ctx = this.ensureContext(request.payload.dbPath);
          ensureRecordEditLockOwnership(
            ctx,
            {
              einsatzId: request.payload.input.einsatzId,
              entityType: 'FAHRZEUG',
              entityId: request.payload.input.fahrzeugId,
            },
            request.payload.identity,
          );
          updateFahrzeug(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'create-einheit-helfer': {
          const ctx = this.ensureContext(request.payload.dbPath);
          ensureRecordEditLockOwnership(
            ctx,
            {
              einsatzId: request.payload.input.einsatzId,
              entityType: 'EINHEIT',
              entityId: request.payload.input.einsatzEinheitId,
            },
            request.payload.identity,
          );
          createEinheitHelfer(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'update-einheit-helfer': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const einsatzEinheitId = this.resolveHelferEinheitId(ctx, request.payload.input.helferId);
          ensureRecordEditLockOwnership(
            ctx,
            {
              einsatzId: request.payload.input.einsatzId,
              entityType: 'EINHEIT',
              entityId: einsatzEinheitId,
            },
            request.payload.identity,
          );
          updateEinheitHelfer(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'delete-einheit-helfer': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const einsatzEinheitId = this.resolveHelferEinheitId(ctx, request.payload.input.helferId);
          ensureRecordEditLockOwnership(
            ctx,
            {
              einsatzId: request.payload.input.einsatzId,
              entityType: 'EINHEIT',
              entityId: einsatzEinheitId,
            },
            request.payload.identity,
          );
          deleteEinheitHelfer(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'split-einheit': {
          const ctx = this.ensureContext(request.payload.dbPath);
          splitEinheit(ctx, request.payload.input);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'move-einheit': {
          const ctx = this.ensureContext(request.payload.dbPath);
          moveEinheit(ctx, request.payload.input, request.payload.user);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'move-fahrzeug': {
          const ctx = this.ensureContext(request.payload.dbPath);
          moveFahrzeug(ctx, request.payload.input, request.payload.user);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'undo-last-command': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = undoLastCommand(ctx, request.payload.einsatzId, request.payload.user);
          this.sendOk(request, result);
          return;
        }
        case 'has-undoable-command': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = hasUndoableCommand(ctx, request.payload.einsatzId);
          this.sendOk(request, result);
          return;
        }
        case 'presence-heartbeat': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const now = new Date().toISOString();
          const staleCutoff = new Date(Date.now() - PRESENCE_STALE_MS).toISOString();
          const result = ctx.db.transaction((tx) => {
            tx.delete(activeClient).where(lt(activeClient.lastSeen, staleCutoff)).run();
            tx.insert(activeClient)
              .values({
                clientId: request.payload.clientId,
                computerName: request.payload.computerName,
                ipAddress: request.payload.ipAddress,
                dbPath: request.payload.dbPath,
                lastSeen: now,
                startedAt: request.payload.startedAt,
                isMaster: false,
              })
              .onConflictDoUpdate({
                target: activeClient.clientId,
                set: {
                  computerName: request.payload.computerName,
                  ipAddress: request.payload.ipAddress,
                  dbPath: request.payload.dbPath,
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
            return { isMaster: (leader?.clientId ?? request.payload.clientId) === request.payload.clientId };
          });
          this.sendOk(request, result);
          return;
        }
        case 'presence-list-active': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const staleCutoff = new Date(Date.now() - PRESENCE_STALE_MS).toISOString();
          const rows = ctx.db
            .select()
            .from(activeClient)
            .where(gte(activeClient.lastSeen, staleCutoff))
            .orderBy(asc(activeClient.computerName), asc(activeClient.startedAt))
            .all();
          const leader = ctx.db
            .select({ clientId: activeClient.clientId })
            .from(activeClient)
            .where(gte(activeClient.lastSeen, staleCutoff))
            .orderBy(asc(activeClient.startedAt), asc(activeClient.clientId))
            .get();
          const leaderId = leader?.clientId ?? request.payload.selfClientId;
          const result = rows.map((row) => ({
            clientId: row.clientId,
            computerName: row.computerName,
            ipAddress: row.ipAddress,
            dbPath: row.dbPath,
            lastSeen: row.lastSeen,
            isMaster: row.clientId === leaderId,
            isSelf: row.clientId === request.payload.selfClientId,
          }));
          this.sendOk(request, result);
          return;
        }
        case 'presence-remove-self': {
          const ctx = this.ensureContext(request.payload.dbPath);
          ctx.db.delete(activeClient).where(eq(activeClient.clientId, request.payload.clientId)).run();
          this.sendOk(request, { ok: true });
          return;
        }
        case 'backup-run-once': {
          const ctx = this.ensureContext(request.payload.dbPath);
          await ctx.sqlite.backup(request.payload.targetPath);
          this.sendOk(request, { ok: true });
          return;
        }
        case 'acquire-edit-lock': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = acquireRecordEditLock(
            ctx,
            {
              einsatzId: request.payload.einsatzId,
              entityType: request.payload.entityType,
              entityId: request.payload.entityId,
            },
            request.payload.identity,
          );
          this.sendOk(request, result);
          return;
        }
        case 'refresh-edit-lock': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = refreshRecordEditLock(
            ctx,
            {
              einsatzId: request.payload.einsatzId,
              entityType: request.payload.entityType,
              entityId: request.payload.entityId,
            },
            request.payload.identity,
          );
          this.sendOk(request, result);
          return;
        }
        case 'release-edit-lock': {
          const ctx = this.ensureContext(request.payload.dbPath);
          releaseRecordEditLock(
            ctx,
            {
              einsatzId: request.payload.einsatzId,
              entityType: request.payload.entityType,
              entityId: request.payload.entityId,
            },
            request.payload.identity,
          );
          this.sendOk(request, { ok: true });
          return;
        }
        case 'list-edit-locks': {
          const ctx = this.ensureContext(request.payload.dbPath);
          const result = listRecordEditLocks(
            ctx,
            request.payload.einsatzId,
            request.payload.selfClientId,
          );
          this.sendOk(request, result);
          return;
        }
        case 'runtime-health': {
          this.sendOk(request, {
            currentDbPath: this.activeDbPath,
            pid: process.pid,
            uptimeMs: Date.now() - this.startedAt,
          });
          return;
        }
        default: {
          this.sendError(request, { message: `Unbekannte Operation: ${(request as { type: string }).type}` });
        }
      }
    } catch (error) {
      const safe = toSafeError(error);
      this.sendError(request, safe);
    }
  }

  private ensureContext(dbPath: string): DbContext {
    if (this.ctx && this.activeDbPath === dbPath) {
      return this.ctx;
    }
    if (this.ctx) {
      try {
        this.ctx.sqlite.close();
      } catch {
        // ignore close errors during context switch
      }
      this.ctx = null;
    }
    this.ctx = openDatabaseWithRetry(dbPath);
    this.activeDbPath = dbPath;
    debugSync('db-runtime', 'context-open', { dbPath, pid: process.pid });
    return this.ctx;
  }

  private resolveHelferEinheitId(ctx: DbContext, helferId: string): string {
    const row = ctx.db
      .select({ einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId })
      .from(einsatzEinheitHelfer)
      .where(eq(einsatzEinheitHelfer.id, helferId))
      .get();
    if (!row) {
      throw new Error('Helfer nicht gefunden.');
    }
    return row.einsatzEinheitId;
  }

  private sendOk<T extends DbRuntimeRequest, TResult>(request: T, result: TResult): void {
    const response: DbRuntimeResponseUnion = {
      kind: 'db-runtime-response',
      requestId: request.requestId,
      type: request.type,
      ok: true,
      result,
    } as DbRuntimeResponseUnion;
    process.send?.(response);
  }

  private sendError(
    request: DbRuntimeRequest,
    safe: {
      message: string;
      code?: string;
    },
  ): void {
    const response: DbRuntimeResponseUnion = {
      kind: 'db-runtime-response',
      requestId: request.requestId,
      type: request.type,
      ok: false,
      error: {
        message: safe.message,
        code: safe.code,
      },
    };
    process.send?.(response);
  }
}

export function startDbRuntimeServer(): void {
  const server = new DbRuntimeServer();
  server.bind();
}
