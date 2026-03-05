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

  afterEach(() => {
    if (previousEnv === undefined) {
      delete process.env.S1_DEBUG_SYNC;
    } else {
      process.env.S1_DEBUG_SYNC = previousEnv;
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
});
