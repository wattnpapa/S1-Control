import { describe, expect, it, vi } from 'vitest';
import { runStartupRecovery } from '../src/main/services/startup-recovery';
import type { UpdaterState } from '../src/shared/types';

function createDeps(params?: {
  state?: UpdaterState;
  dialogResponse?: number;
  checkThrows?: boolean;
}) {
  let state = params?.state ?? ({ stage: 'not-available' } satisfies UpdaterState);
  const updater = {
    checkForUpdates: params?.checkThrows
      ? vi.fn(async () => {
          throw new Error('check failed');
        })
      : vi.fn(async () => undefined),
    getState: vi.fn(() => state),
  };

  const deps = {
    updater,
    withVersion: vi.fn((message: string) => `[versioned] ${message}`),
    showErrorBox: vi.fn(() => undefined),
    showMessageBox: vi.fn(async () => ({ response: params?.dialogResponse ?? 1 })),
    openExternal: vi.fn(async () => undefined),
    setState: (next: UpdaterState) => {
      state = next;
    },
  };
  return deps;
}

describe('startup recovery', () => {
  it('always shows startup error and attempts update check', async () => {
    const deps = createDeps();
    await runStartupRecovery(new Error('kaputt'), deps);

    expect(deps.updater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(deps.showErrorBox).toHaveBeenCalledTimes(1);
    expect(deps.showMessageBox).toHaveBeenCalledTimes(1);
  });

  it('opens release page when user chooses recovery action', async () => {
    const deps = createDeps({ dialogResponse: 0, state: { stage: 'available', latestVersion: '2026.03.06.10.00' } });
    await runStartupRecovery(new Error('kaputt'), deps);

    expect(deps.openExternal).toHaveBeenCalledTimes(1);
    expect(deps.showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        buttons: ['Release-Seite öffnen', 'Schließen'],
      }),
    );
  });

  it('keeps release-page fallback available when update check fails', async () => {
    const deps = createDeps({ dialogResponse: 0, checkThrows: true });
    deps.setState({ stage: 'error', message: 'offline' });

    await runStartupRecovery(new Error('kaputt'), deps);

    expect(deps.updater.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(deps.openExternal).toHaveBeenCalledTimes(1);
  });
});
