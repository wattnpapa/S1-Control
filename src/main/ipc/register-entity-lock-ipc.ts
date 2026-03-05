import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import {
  acquireRecordEditLock,
  listRecordEditLocks,
  refreshRecordEditLock,
  releaseRecordEditLock,
} from '../services/record-lock';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Registers record edit lock handlers.
 */
export function registerEditLockHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.ACQUIRE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['acquireEditLock']>[0]) => {
      const user = requireUser();
      return acquireRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        helpers.lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.REFRESH_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['refreshEditLock']>[0]) => {
      const user = requireUser();
      return refreshRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        helpers.lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.RELEASE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['releaseEditLock']>[0]) => {
      const user = requireUser();
      releaseRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        helpers.lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EDIT_LOCKS,
    wrap(async (einsatzId: string) => {
      requireUser();
      return listRecordEditLocks(state.getDbContext(), einsatzId, state.clientPresence.getClientId());
    }),
  );
}
