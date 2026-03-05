import path from 'node:path';
import { BrowserWindow } from 'electron';

/**
 * Resolves renderer URL for dev/prod modes.
 */
export function resolveRendererUrl(): string {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    return devServer;
  }
  return `file://${path.join(__dirname, '../dist-renderer/index.html')}`;
}

/**
 * Creates and loads the main application window.
 */
export async function createMainWindow(): Promise<void> {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  await win.loadURL(resolveRendererUrl());
}

/**
 * Sends IPC payload to all open windows.
 */
export function broadcastToAllWindows<T>(channel: string, payload: T): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}
