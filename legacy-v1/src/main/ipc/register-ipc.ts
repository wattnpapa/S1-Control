import { toSafeError } from '../services/errors';
import { debugSync } from '../services/debug';
import { registerAuthIpc } from './register-auth-ipc';
import { registerDisplayIpc } from './register-display-ipc';
import { createEinsatzIpcHelpers, createEntityIpcHelpers } from './register-einsatz-helpers';
import { registerEntityIpc } from './register-entity-ipc';
import { registerEinsatzIpc } from './register-einsatz-ipc';
import { registerSettingsIpc } from './register-settings-ipc';
import { registerSyncIpc } from './register-sync-ipc';
import { registerTacticalSignIpc } from './register-tactical-sign-ipc';
import { registerUpdaterIpc } from './register-updater-ipc';
import type { AppState } from './register-support';

/**
 * Handles Register Ipc.
 */
export function registerIpc(state: AppState): void {
  const SLOW_IPC_THRESHOLD_MS = 120;
  const wrap = <T extends unknown[], R>(handler: (...args: T) => R | Promise<R>) => {
    return async (event: Electron.IpcMainInvokeEvent, ...args: T): Promise<R> => {
      const startedAt = Date.now();
      try {
        const result = await handler(...args);
        const durationMs = Date.now() - startedAt;
        if (durationMs >= SLOW_IPC_THRESHOLD_MS) {
          debugSync('ipc', 'slow', {
            channel: event.channel,
            durationMs,
            argsCount: args.length,
          });
        }
        return result;
      } catch (error) {
        const durationMs = Date.now() - startedAt;
        if (durationMs >= SLOW_IPC_THRESHOLD_MS) {
          debugSync('ipc', 'slow-error', {
            channel: event.channel,
            durationMs,
            argsCount: args.length,
          });
        }
        const safe = toSafeError(error);
        const wrapped = new Error(safe.message);
        if (safe.code) {
          (wrapped as Error & { code?: string }).code = safe.code;
        }
        throw wrapped;
      }
    };
  };

  const requireUser = () => {
    const user = state.getSessionUser();
    if (!user) {
      throw new Error('Nicht angemeldet');
    }
    return user;
  };

  const common = { state, wrap, requireUser };
  const einsatzHelpers = createEinsatzIpcHelpers(state);
  const entityHelpers = createEntityIpcHelpers(state, einsatzHelpers.notifyEinsatzChanged);

  registerAuthIpc(common);
  registerSettingsIpc(common, einsatzHelpers);
  registerEinsatzIpc(common, einsatzHelpers, entityHelpers);
  registerEntityIpc(common, entityHelpers);
  registerSyncIpc(common);
  registerUpdaterIpc(common);
  registerTacticalSignIpc(common);
  registerDisplayIpc(common);
}
