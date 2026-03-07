import process from 'node:process';
import { openDatabaseWithRetry, type DbContext } from '../db/connection';
import { listAbschnittDetails, listAbschnittDetailsBatch, listAbschnitte } from './einsatz-read-service';
import { toSafeError } from './errors';
import { debugSync } from './debug';
import {
  isDbRuntimeRequest,
  type DbRuntimeRequest,
  type DbRuntimeResponseUnion,
} from '../../shared/db-runtime';

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

  private async handle(request: DbRuntimeRequest): Promise<void> {
    try {
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
