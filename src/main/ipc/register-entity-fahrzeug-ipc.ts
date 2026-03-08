import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { createFahrzeug, updateFahrzeug } from '../services/einsatz';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
import { debugSync } from '../services/debug';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Registers IPC handlers for creating and updating vehicles.
 */
export function registerFahrzeugHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.CREATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['createFahrzeug']>[0]) => {
      requireUser();
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'create-fahrzeug',
            { dbPath: ctx.path, input },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'create-fahrzeug');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:create-fahrzeug', { einsatzId: input.einsatzId, message });
        }
      }
      createFahrzeug(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['updateFahrzeug']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'update-fahrzeug',
            { dbPath: ctx.path, input, identity },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'update-fahrzeug');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:update-fahrzeug', { einsatzId: input.einsatzId, message });
        }
      }
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'FAHRZEUG', entityId: input.fahrzeugId },
        identity,
      );
      updateFahrzeug(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-fahrzeug');
    }),
  );
}
