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
 * Chooses the primary app window and avoids targeting the strength-display window.
 */
function resolveMainWindowForDevTools(): BrowserWindow | null {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    const focusedUrl = focused.webContents.getURL();
    if (!focusedUrl.includes('display=strength')) {
      return focused;
    }
  }
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) {
      continue;
    }
    const url = win.webContents.getURL();
    if (!url.includes('display=strength')) {
      return win;
    }
  }
  return focused && !focused.isDestroyed() ? focused : BrowserWindow.getAllWindows()[0] ?? null;
}

/**
 * Opens main-window devtools on a dedicated control lane.
 */
async function openMainDevToolsControlLane(): Promise<void> {
  const requestTs = Date.now();
  const mainWindow = resolveMainWindowForDevTools();
  if (!mainWindow || mainWindow.isDestroyed()) {
    debugSync('devtools', 'open:skip-no-window', { requestTs });
    return;
  }
  const contents = mainWindow.webContents;
  debugSync('devtools', 'open:request', {
    requestTs,
    alreadyOpen: contents.isDevToolsOpened(),
  });
  if (contents.isDevToolsOpened()) {
    contents.devToolsWebContents?.focus();
    logDevtoolsVisible(requestTs);
    return;
  }

  for (const mode of ['detach', 'right', 'bottom'] as const) {
    contents.openDevTools({ mode, activate: true });
    await waitForDevToolsStateTick();
    if (!contents.isDevToolsOpened()) {
      continue;
    }
    logDevtoolsVisible(requestTs, mode);
    mainWindow.focus();
    return;
  }

  contents.toggleDevTools();
  await waitForDevToolsStateTick();
  const open = contents.isDevToolsOpened();
  const visibleTs = Date.now();
  debugSync('devtools', 'open:result', {
    open,
    requestTs,
    visibleTs,
    latencyMs: visibleTs - requestTs,
  });
  if (!open) {
    const standaloneDevTools = new BrowserWindow({
      width: 1200,
      height: 800,
      show: true,
      autoHideMenuBar: true,
      title: 'S1-Control DevTools',
    });
    contents.setDevToolsWebContents(standaloneDevTools.webContents);
    contents.openDevTools({ mode: 'detach', activate: true });
    await waitForDevToolsStateTick();
    if (!contents.isDevToolsOpened()) {
      throw new Error('DevTools konnten nicht geöffnet werden.');
    }
  }
  mainWindow.focus();
}

/**
 * Emits standardized DevTools visibility metrics.
 */
function logDevtoolsVisible(requestTs: number, mode?: 'detach' | 'right' | 'bottom'): void {
  const visibleTs = Date.now();
  debugSync('devtools', 'open:visible', {
    mode,
    requestTs,
    visibleTs,
    latencyMs: visibleTs - requestTs,
  });
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

  // Dedicated control lane: no shared wrap/queue for DevTools actions.
  ipcMain.handle(IPC_CHANNEL.OPEN_MAIN_DEVTOOLS, async () => openMainDevToolsControlLane());
}
