import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { debugSync } from '../services/debug';
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

  ipcMain.handle(
    IPC_CHANNEL.OPEN_MAIN_DEVTOOLS,
    wrap(async () => {
      const mainWindow = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
      if (!mainWindow || mainWindow.isDestroyed()) {
        debugSync('devtools', 'open:skip-no-window');
        return;
      }
      const contents = mainWindow.webContents;
      debugSync('devtools', 'open:attempt', { alreadyOpen: contents.isDevToolsOpened() });
      if (!contents.isDevToolsOpened()) {
        // Docked mode is more reliable than detached windows on some macOS/Electron builds.
        contents.openDevTools({ mode: 'right', activate: true });
      }
      if (!contents.isDevToolsOpened()) {
        contents.toggleDevTools();
      }
      debugSync('devtools', 'open:result', { open: contents.isDevToolsOpened() });
      mainWindow.focus();
    }),
  );
}
