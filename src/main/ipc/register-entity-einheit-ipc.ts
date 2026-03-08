import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { createEinheit, updateEinheit } from '../services/einsatz';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
import { debugSync } from '../services/debug';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Registers IPC handlers for creating and updating units.
 */
export function registerEinheitHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['createEinheit']>[0]) => {
      requireUser();
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'create-einheit',
            { dbPath: ctx.path, input },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'create-einheit');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:create-einheit', { einsatzId: input.einsatzId, message });
        }
      }
      createEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['updateEinheit']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'update-einheit',
            { dbPath: ctx.path, input, identity },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'update-einheit');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:update-einheit', { einsatzId: input.einsatzId, message });
        }
      }
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einheitId },
        identity,
      );
      updateEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-einheit');
    }),
  );
}
