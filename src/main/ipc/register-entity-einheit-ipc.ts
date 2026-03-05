import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { createEinheit, updateEinheit } from '../services/einsatz';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
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
      createEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['updateEinheit']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einheitId },
        helpers.lockIdentity(user),
      );
      updateEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-einheit');
    }),
  );
}
