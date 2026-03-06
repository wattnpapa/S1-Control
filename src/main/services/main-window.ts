import path from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow } from 'electron';

/**
 * Builds file-path candidates for packaged renderer entry.
 */
function rendererEntryCandidates(): string[] {
  const appPath = app.getAppPath();
  return [
    path.join(__dirname, '../dist-renderer/index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(appPath, 'dist-renderer/index.html'),
    path.join(appPath, 'dist/index.html'),
  ];
}

/**
 * Resolves the first existing renderer entry path.
 */
function resolveRendererEntryPath(): string {
  for (const candidate of rendererEntryCandidates()) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return path.join(__dirname, '../dist-renderer/index.html');
}

/**
 * Resolves renderer URL for dev/prod modes.
 */
export function resolveRendererUrl(): string {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    return devServer;
  }
  return pathToFileURL(resolveRendererEntryPath()).toString();
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
