import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { createFahrzeug, updateFahrzeug } from '../services/einsatz';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
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
      createFahrzeug(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['updateFahrzeug']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'FAHRZEUG', entityId: input.fahrzeugId },
        helpers.lockIdentity(user),
      );
      updateFahrzeug(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-fahrzeug');
    }),
  );
}
