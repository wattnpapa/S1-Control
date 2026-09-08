import crypto from 'node:crypto';
import path from 'node:path';
import { fork, type ChildProcess } from 'node:child_process';
import {
  DB_RUNTIME_TIMEOUT_MS,
  isDbRuntimeResponse,
  type DbOpPriority,
  type DbRuntimeClient,
  type DbRuntimeOpType,
  type DbRuntimeRequest,
  type DbRuntimeResponseUnion,
} from '../../shared/db-runtime';
import { debugSync } from './debug';

type PendingRequest = {
  type: DbRuntimeOpType;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

export class MainDbBridge implements DbRuntimeClient {
  private child: ChildProcess | null = null;

  private readonly pending = new Map<string, PendingRequest>();

  private enabled = false;

  public start(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      return;
    }
    this.spawn();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public stop(): void {
    for (const [requestId, entry] of this.pending.entries()) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('DB-Runtime wurde beendet.'));
      this.pending.delete(requestId);
    }
    if (!this.child) {
      return;
    }
    try {
      this.child.removeAllListeners();
      this.child.kill();
    } catch {
      // ignore shutdown kill errors
    } finally {
      this.child = null;
    }
  }

  public async request<TType extends DbRuntimeOpType>(
    type: TType,
    payload: Extract<DbRuntimeRequest, { type: TType }>['payload'],
    priority: DbOpPriority,
  ): Promise<Extract<DbRuntimeResponseUnion, { type: TType; ok: true }>['result']> {
    if (!this.enabled) {
      throw new Error('DB-Runtime ist deaktiviert.');
    }
    if (!this.child || this.child.killed) {
      this.spawn();
    }
    const child = this.child;
    if (!child) {
      throw new Error('DB-Runtime konnte nicht gestartet werden.');
    }
    const requestId = crypto.randomUUID();
    const timeoutMs = DB_RUNTIME_TIMEOUT_MS[priority];
    const request: Extract<DbRuntimeRequest, { type: TType }> = {
      kind: 'db-runtime-request',
      requestId,
      type,
      timeoutMs,
      priority,
      payload,
    } as Extract<DbRuntimeRequest, { type: TType }>;
    const startedAt = Date.now();

    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`DB-Runtime Timeout (${type}, ${timeoutMs}ms)`));
      }, timeoutMs);
      this.pending.set(requestId, {
        type,
        resolve,
        reject,
        timeout,
      });
      child.send(request);
      debugSync('db-bridge', 'request', {
        requestId,
        type,
        priority,
        timeoutMs,
      });
      const settle = (ok: boolean) => {
        debugSync('db-bridge', ok ? 'response-ok' : 'response-error', {
          requestId,
          type,
          ms: Date.now() - startedAt,
        });
      };
      const entry = this.pending.get(requestId);
      if (!entry) {
        return;
      }
      const originalResolve = entry.resolve;
      const originalReject = entry.reject;
      entry.resolve = (value) => {
        settle(true);
        originalResolve(value);
      };
      entry.reject = (error) => {
        settle(false);
        originalReject(error);
      };
    }) as Promise<Extract<DbRuntimeResponseUnion, { type: TType; ok: true }>['result']>;
  }

  private spawn(): void {
    const runtimeEntry = path.resolve(__dirname, '../db-runtime.js');
    const child = fork(runtimeEntry, [], {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      execArgv: [],
      env: process.env,
    });
    child.on('message', (raw: unknown) => {
      if (!isDbRuntimeResponse(raw)) {
        return;
      }
      this.handleResponse(raw);
    });
    child.on('exit', (code, signal) => {
      debugSync('db-bridge', 'exit', { code, signal });
      this.child = null;
      for (const [requestId, entry] of this.pending.entries()) {
        clearTimeout(entry.timeout);
        entry.reject(new Error('DB-Runtime wurde unerwartet beendet.'));
        this.pending.delete(requestId);
      }
    });
    this.child = child;
    debugSync('db-bridge', 'spawn', { pid: child.pid, runtimeEntry });
  }

  private handleResponse(response: DbRuntimeResponseUnion): void {
    const entry = this.pending.get(response.requestId);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timeout);
    this.pending.delete(response.requestId);
    if (response.ok) {
      entry.resolve(response.result);
      return;
    }
    const error = new Error(response.error.message);
    if (response.error.code) {
      (error as Error & { code?: string }).code = response.error.code;
    }
    entry.reject(error);
  }
}
