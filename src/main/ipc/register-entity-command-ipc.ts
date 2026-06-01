import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../services/command';
import { hasUndoableCommand, splitEinheit } from '../services/einsatz';
import { debugSync } from '../services/debug';
import type { EntityIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Registers movement, split and undo handlers.
 */
export function registerEntityCommandHandlers(common: RegistrarCommon, helpers: EntityIpcHelpers): void {
  const { state, wrap, requireUser } = common;

  ipcMain.handle(
    IPC_CHANNEL.SPLIT_EINHEIT,
    wrap(async (input: Parameters<RendererApi['splitEinheit']>[0]) => {
      requireUser();
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'split-einheit',
            { dbPath: ctx.path, input },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'split-einheit');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:split-einheit', { einsatzId: input.einsatzId, message });
        }
      }
      const splitCtx = state.getDbContext();
      splitEinheit(splitCtx, input);
      await splitCtx.save();
      helpers.notifyEinsatzChanged(input.einsatzId, 'split-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['moveEinheit']>[0]) => {
      const user = requireUser();
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'move-einheit',
            { dbPath: ctx.path, input, user },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'move-einheit');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:move-einheit', { einsatzId: input.einsatzId, message });
        }
      }
      const moveEinCtx = state.getDbContext();
      moveEinheit(moveEinCtx, input, user);
      await moveEinCtx.save();
      helpers.notifyEinsatzChanged(input.einsatzId, 'move-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['moveFahrzeug']>[0]) => {
      const user = requireUser();
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          await state.dbBridge.request(
            'move-fahrzeug',
            { dbPath: ctx.path, input, user },
            'normal',
          );
          helpers.notifyEinsatzChanged(input.einsatzId, 'move-fahrzeug');
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:move-fahrzeug', { einsatzId: input.einsatzId, message });
        }
      }
      const moveFzCtx = state.getDbContext();
      moveFahrzeug(moveFzCtx, input, user);
      await moveFzCtx.save();
      helpers.notifyEinsatzChanged(input.einsatzId, 'move-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UNDO_LAST,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          const undone = await state.dbBridge.request(
            'undo-last-command',
            { dbPath: ctx.path, einsatzId, user },
            'normal',
          );
          if (undone) {
            helpers.notifyEinsatzChanged(einsatzId, 'undo-command');
          }
          return undone;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:undo-last', { einsatzId, message });
        }
      }
      const undoCtx = state.getDbContext();
      const undone = undoLastCommand(undoCtx, einsatzId, user);
      if (undone) {
        await undoCtx.save();
        helpers.notifyEinsatzChanged(einsatzId, 'undo-command');
      }
      return undone;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.HAS_UNDO,
    wrap(async (einsatzId: string) => {
      const ctx = state.getDbContext();
      if (state.useDbUtilityProcess && state.dbBridge.isEnabled()) {
        try {
          return await state.dbBridge.request(
            'has-undoable-command',
            { dbPath: ctx.path, einsatzId },
            'high',
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          debugSync('db-bridge', 'fallback:has-undo', { einsatzId, message });
        }
      }
      return hasUndoableCommand(ctx.einsatz, einsatzId);
    }),
  );
}
