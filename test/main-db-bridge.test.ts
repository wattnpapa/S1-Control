import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeChild extends EventEmitter {
  public killed = false;

  public sent: unknown[] = [];

  public pid = 12345;

  public send(message: unknown): void {
    this.sent.push(message);
  }

  public kill(): void {
    this.killed = true;
    this.emit('exit', 0, null);
  }
}

const hoisted = vi.hoisted(() => {
  const fakeChildren: FakeChild[] = [];
  const forkMock = vi.fn(() => {
    const child = new FakeChild();
    fakeChildren.push(child);
    return child as unknown as import('node:child_process').ChildProcess;
  });
  const debugMock = vi.fn();
  return { forkMock, debugMock, fakeChildren };
});

vi.mock('node:child_process', () => ({
  fork: hoisted.forkMock,
}));

vi.mock('../src/main/services/debug', () => ({
  debugSync: hoisted.debugMock,
}));

import { MainDbBridge } from '../src/main/services/main-db-bridge';
import { DB_RUNTIME_TIMEOUT_MS } from '../src/shared/db-runtime';

describe('main db bridge', () => {
  beforeEach(() => {
    hoisted.forkMock.mockClear();
    hoisted.debugMock.mockClear();
    hoisted.fakeChildren.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects requests when runtime is disabled', async () => {
    const bridge = new MainDbBridge();
    bridge.start(false);

    await expect(bridge.request('runtime-health', {}, 'high')).rejects.toThrow('DB-Runtime ist deaktiviert.');
    expect(bridge.isEnabled()).toBe(false);
    expect(hoisted.forkMock).not.toHaveBeenCalled();
  });

  it('spawns child and resolves successful responses', async () => {
    const bridge = new MainDbBridge();
    bridge.start(true);
    expect(bridge.isEnabled()).toBe(true);
    expect(hoisted.forkMock).toHaveBeenCalledTimes(1);

    const child = hoisted.fakeChildren[0]!;
    const pending = bridge.request('runtime-health', {}, 'high');
    const sent = child.sent.at(-1) as { requestId: string; type: string; kind: string; timeoutMs: number; priority: string };

    expect(sent.kind).toBe('db-runtime-request');
    expect(sent.type).toBe('runtime-health');
    expect(sent.timeoutMs).toBe(DB_RUNTIME_TIMEOUT_MS.high);
    expect(sent.priority).toBe('high');

    child.emit('message', {
      kind: 'db-runtime-response',
      requestId: sent.requestId,
      type: 'runtime-health',
      ok: true,
      result: { currentDbPath: '/tmp/a.s1control', pid: 42, uptimeMs: 123 },
    });

    await expect(pending).resolves.toEqual({ currentDbPath: '/tmp/a.s1control', pid: 42, uptimeMs: 123 });
  });

  it('rejects with response error and preserves error code', async () => {
    const bridge = new MainDbBridge();
    bridge.start(true);
    const child = hoisted.fakeChildren[0]!;

    const pending = bridge.request('runtime-health', {}, 'normal');
    const sent = child.sent.at(-1) as { requestId: string };

    child.emit('message', {
      kind: 'db-runtime-response',
      requestId: sent.requestId,
      type: 'runtime-health',
      ok: false,
      error: { message: 'kaputt', code: 'BROKEN' },
    });

    await expect(pending).rejects.toMatchObject({ message: 'kaputt', code: 'BROKEN' });
  });

  it('times out pending requests and stop() rejects in-flight requests', async () => {
    vi.useFakeTimers();

    const bridge = new MainDbBridge();
    bridge.start(true);

    const timeoutPromise = bridge.request('runtime-health', {}, 'high');
    vi.advanceTimersByTime(DB_RUNTIME_TIMEOUT_MS.high + 1);
    await expect(timeoutPromise).rejects.toThrow('DB-Runtime Timeout (runtime-health, 1200ms)');

    const stopPromise = bridge.request('runtime-health', {}, 'low');
    bridge.stop();
    await expect(stopPromise).rejects.toThrow('DB-Runtime wurde beendet.');
  });

  it('rejects pending requests when child exits and respawns on next request', async () => {
    const bridge = new MainDbBridge();
    bridge.start(true);

    const child = hoisted.fakeChildren[0]!;
    const pending = bridge.request('runtime-health', {}, 'normal');
    child.emit('exit', 1, 'SIGTERM');

    await expect(pending).rejects.toThrow('DB-Runtime wurde unerwartet beendet.');

    const nextPromise = bridge.request('runtime-health', {}, 'normal');
    expect(hoisted.forkMock).toHaveBeenCalledTimes(2);
    const nextChild = hoisted.fakeChildren[1]!;
    const sent = nextChild.sent.at(-1) as { requestId: string };
    nextChild.emit('message', {
      kind: 'db-runtime-response',
      requestId: sent.requestId,
      type: 'runtime-health',
      ok: true,
      result: { currentDbPath: null, pid: 77, uptimeMs: 1 },
    });

    await expect(nextPromise).resolves.toEqual({ currentDbPath: null, pid: 77, uptimeMs: 1 });
  });
});
