import { ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import type { RegistrarCommon } from './register-support';

/**
 * Handles Register Display Ipc.
 */
export function registerDisplayIpc(common: RegistrarCommon): void {
  const { wrap, state } = common;

  ipcMain.handle(
    IPC_CHANNEL.OPEN_STRENGTH_DISPLAY_WINDOW,
    wrap(async () => {
      await state.strengthDisplay.openWindow();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CLOSE_STRENGTH_DISPLAY_WINDOW,
    wrap(async () => {
      state.strengthDisplay.closeWindow();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_STRENGTH_DISPLAY_STATE,
    wrap(async () => state.strengthDisplay.getState()),
  );

  ipcMain.handle(
    IPC_CHANNEL.SET_STRENGTH_DISPLAY_STATE,
    wrap(async (input: Parameters<RendererApi['setStrengthDisplayState']>[0]) => {
      state.strengthDisplay.setState(input);
    }),
  );
}
