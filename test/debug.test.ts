import { afterEach, describe, expect, it, vi } from 'vitest';

async function importDebugModuleWithEnv(value: string | undefined) {
  if (value === undefined) {
    delete process.env.S1_DEBUG_SYNC;
  } else {
    process.env.S1_DEBUG_SYNC = value;
  }
  vi.resetModules();
  return import('../src/main/services/debug');
}

describe('debug sync logging', () => {
  const previousEnv = process.env.S1_DEBUG_SYNC;
  const previousRateLimitEnv = process.env.S1_DEBUG_SYNC_MIN_INTERVAL_MS;

  afterEach(() => {
    if (previousEnv === undefined) {
      delete process.env.S1_DEBUG_SYNC;
    } else {
      process.env.S1_DEBUG_SYNC = previousEnv;
    }
    if (previousRateLimitEnv === undefined) {
      delete process.env.S1_DEBUG_SYNC_MIN_INTERVAL_MS;
    } else {
      process.env.S1_DEBUG_SYNC_MIN_INTERVAL_MS = previousRateLimitEnv;
    }
    vi.restoreAllMocks();
  });

  it('is disabled by default when S1_DEBUG_SYNC is not set', async () => {
    const debug = await importDebugModuleWithEnv(undefined);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    debug.debugSync('einsatz-sync', 'broadcast', { reason: 'update-einheit' });

    expect(debug.getDebugSyncLogLines()).toHaveLength(0);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('can be enabled explicitly via S1_DEBUG_SYNC=1', async () => {
    const debug = await importDebugModuleWithEnv('1');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    debug.debugSync('einsatz-sync', 'broadcast', { reason: 'update-einheit' });

    expect(debug.getDebugSyncLogLines()).toHaveLength(1);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it('rate-limits repeated sync debug lines per scope/message', async () => {
    process.env.S1_DEBUG_SYNC_MIN_INTERVAL_MS = '250';
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1100)
      .mockReturnValueOnce(1400);

    const debug = await importDebugModuleWithEnv('1');
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    debug.debugSync('einsatz-sync', 'received', { key: 1 });
    debug.debugSync('einsatz-sync', 'received', { key: 2 });
    debug.debugSync('einsatz-sync', 'received', { key: 3 });

    expect(debug.getDebugSyncLogLines()).toHaveLength(2);
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });
});
