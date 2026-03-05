import { toSafeError } from '../services/errors';
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
  const wrap = <T extends unknown[], R>(handler: (...args: T) => R | Promise<R>) => {
    return async (_event: Electron.IpcMainInvokeEvent, ...args: T): Promise<R> => {
      try {
        return await handler(...args);
      } catch (error) {
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
