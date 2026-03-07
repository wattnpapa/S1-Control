import { BrowserWindow, ipcMain } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import { debugSync } from '../services/debug';
import type { RegistrarCommon } from './register-support';

/**
 * Waits for devtools state propagation in Chromium.
 */
async function waitForDevToolsStateTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 120));
}

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
    IPC_CHANNEL.GET_STRENGTH_DISPLAY_HEALTH,
    wrap(async () => state.strengthDisplay.getHealth()),
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
      if (contents.isDevToolsOpened()) {
        contents.devToolsWebContents?.focus();
        return;
      }

      for (const mode of ['detach', 'right', 'bottom'] as const) {
        contents.openDevTools({ mode, activate: true });
        await waitForDevToolsStateTick();
        if (contents.isDevToolsOpened()) {
          debugSync('devtools', 'open:ok', { mode });
          mainWindow.focus();
          return;
        }
      }

      contents.toggleDevTools();
      await waitForDevToolsStateTick();
      const open = contents.isDevToolsOpened();
      debugSync('devtools', 'open:result', { open });
      if (!open) {
        throw new Error('DevTools konnten nicht geöffnet werden.');
      }
      mainWindow.focus();
    }),
  );
}
