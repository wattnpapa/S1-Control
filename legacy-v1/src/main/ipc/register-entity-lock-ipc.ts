import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import type { RecordEditLockInfo } from '../../shared/types';
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
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          return await state.dbBridge.request(
            'acquire-edit-lock',
            {
              dbPath: ctx.path,
              einsatzId: input.einsatzId,
              entityType: input.entityType,
              entityId: input.entityId,
              identity,
            },
            'high',
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Sperre konnte nicht über DB-Runtime gesetzt werden: ${message}`);
        }
      }
      return acquireRecordEditLock(
        ctx,
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        identity,
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.REFRESH_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['refreshEditLock']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          return await state.dbBridge.request(
            'refresh-edit-lock',
            {
              dbPath: ctx.path,
              einsatzId: input.einsatzId,
              entityType: input.entityType,
              entityId: input.entityId,
              identity,
            },
            'high',
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Sperren-Heartbeat über DB-Runtime fehlgeschlagen: ${message}`);
        }
      }
      return refreshRecordEditLock(
        ctx,
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        identity,
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.RELEASE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['releaseEditLock']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'release-edit-lock',
            {
              dbPath: ctx.path,
              einsatzId: input.einsatzId,
              entityType: input.entityType,
              entityId: input.entityId,
              identity,
            },
            'normal',
          );
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Sperre konnte nicht über DB-Runtime freigegeben werden: ${message}`);
        }
      }
      releaseRecordEditLock(
        ctx,
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        identity,
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EDIT_LOCKS,
    wrap(async (einsatzId: string) => {
      requireUser();
      return await listEditLocks(common, einsatzId);
    }),
  );
}

/**
 * Lists edit locks via DB runtime when enabled and falls back to local reads.
 */
async function listEditLocks(common: RegistrarCommon, einsatzId: string): Promise<RecordEditLockInfo[]> {
  const { state } = common;
  const ctx = state.getDbContext();
  if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
    try {
      return await state.dbBridge.request(
        'list-edit-locks',
        {
          dbPath: ctx.path,
          einsatzId,
          selfClientId: state.clientPresence.getClientId(),
        },
        'high',
      );
    } catch {
      // local fallback keeps edit workflow usable if utility process restarts
    }
  }
  return listRecordEditLocks(ctx, einsatzId, state.clientPresence.getClientId());
}
