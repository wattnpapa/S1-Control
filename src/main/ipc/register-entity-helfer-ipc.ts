import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import {
  createEinheitHelfer,
  deleteEinheitHelfer,
  listEinheitHelfer,
  updateEinheitHelfer,
} from '../services/einsatz';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';
import { resolveHelferEinheitId } from './register-entity-helfer-support';

/**
 * Registers IPC handlers for unit helper CRUD operations.
 */
export function registerHelferHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.LIST_EINHEIT_HELFER,
    wrap(async (einheitId: string) => listEinheitHelfer(state.getDbContext(), einheitId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['createEinheitHelfer']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einsatzEinheitId },
        helpers.lockIdentity(user),
      );
      createEinheitHelfer(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['updateEinheitHelfer']>[0]) => {
      const user = requireUser();
      const einsatzEinheitId = resolveHelferEinheitId(state.getDbContext(), input.helferId);
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: einsatzEinheitId },
        helpers.lockIdentity(user),
      );
      updateEinheitHelfer(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.DELETE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['deleteEinheitHelfer']>[0]) => {
      const user = requireUser();
      const einsatzEinheitId = resolveHelferEinheitId(state.getDbContext(), input.helferId);
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: einsatzEinheitId },
        helpers.lockIdentity(user),
      );
      deleteEinheitHelfer(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'delete-helfer');
    }),
  );
}
