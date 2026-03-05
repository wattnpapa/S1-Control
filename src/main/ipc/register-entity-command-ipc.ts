import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../services/command';
import { hasUndoableCommand, splitEinheit } from '../services/einsatz';
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
      splitEinheit(state.getDbContext(), input);
      helpers.notifyEinsatzChanged(input.einsatzId, 'split-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['moveEinheit']>[0]) => {
      const user = requireUser();
      moveEinheit(state.getDbContext(), input, user);
      helpers.notifyEinsatzChanged(input.einsatzId, 'move-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['moveFahrzeug']>[0]) => {
      const user = requireUser();
      moveFahrzeug(state.getDbContext(), input, user);
      helpers.notifyEinsatzChanged(input.einsatzId, 'move-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UNDO_LAST,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const undone = undoLastCommand(state.getDbContext(), einsatzId, user);
      if (undone) {
        helpers.notifyEinsatzChanged(einsatzId, 'undo-command');
      }
      return undone;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.HAS_UNDO,
    wrap(async (einsatzId: string) => hasUndoableCommand(state.getDbContext(), einsatzId)),
  );
}
