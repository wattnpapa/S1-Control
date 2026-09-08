import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import {
  createEinheitHelfer,
  deleteEinheitHelfer,
  listEinheitHelfer,
  updateEinheitHelfer,
} from '../services/einsatz';
import { ensureRecordEditLockOwnership } from '../services/record-lock';
import { debugSync } from '../services/debug';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';
import { resolveHelferEinheitId } from './register-entity-helfer-support';

/**
 * Registers IPC handlers for unit helper CRUD operations.
 */
export function registerHelferHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.LIST_EINHEIT_HELFER,
    wrap(async (einheitId: string) => listEinheitHelfer(state.getDbContext().einsatz, einheitId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['createEinheitHelfer']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'create-einheit-helfer',
            { dbPath: ctx.path, input, identity },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'create-helfer');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:create-helfer', { einsatzId: input.einsatzId, message });
        }
      }
      const createHelferCtx = state.getDbContext();
      ensureRecordEditLockOwnership(
        createHelferCtx,
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einsatzEinheitId },
        identity,
      );
      createEinheitHelfer(createHelferCtx, input);
      await createHelferCtx.save();
      helpers.notifyEinsatzChanged(input.einsatzId, 'create-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['updateEinheitHelfer']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'update-einheit-helfer',
            { dbPath: ctx.path, input, identity },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'update-helfer');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:update-helfer', { einsatzId: input.einsatzId, message });
        }
      }
      const updateHelferCtx = state.getDbContext();
      const einsatzEinheitIdU = resolveHelferEinheitId(updateHelferCtx, input.helferId);
      ensureRecordEditLockOwnership(
        updateHelferCtx,
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: einsatzEinheitIdU },
        identity,
      );
      updateEinheitHelfer(updateHelferCtx, input);
      await updateHelferCtx.save();
      helpers.notifyEinsatzChanged(input.einsatzId, 'update-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.DELETE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['deleteEinheitHelfer']>[0]) => {
      const user = requireUser();
      const identity = helpers.lockIdentity(user);
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'delete-einheit-helfer',
            { dbPath: ctx.path, input, identity },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'delete-helfer');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:delete-helfer', { einsatzId: input.einsatzId, message });
        }
      }
      const deleteHelferCtx = state.getDbContext();
      const einsatzEinheitId = resolveHelferEinheitId(deleteHelferCtx, input.helferId);
      ensureRecordEditLockOwnership(
        deleteHelferCtx,
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: einsatzEinheitId },
        identity,
      );
      deleteEinheitHelfer(deleteHelferCtx, input);
      await deleteHelferCtx.save();
      helpers.notifyEinsatzChanged(input.einsatzId, 'delete-helfer');
    }),
  );
}
