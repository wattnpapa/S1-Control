import path from 'node:path';
import http from 'node:http';
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
 * Waits until the Vite dev server responds before loading it.
 * Only used in dev mode to avoid ERR_ABORTED on fast Electron starts.
 */
async function waitForDevServer(url: string, maxWaitMs = 10_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const ready = await new Promise<boolean>((resolve) => {
      const req = http.get(url, (res) => { res.destroy(); resolve(res.statusCode !== undefined); });
      req.on('error', () => resolve(false));
      req.setTimeout(500, () => { req.destroy(); resolve(false); });
    });
    if (ready) {
      return;
    }
    await new Promise((r) => setTimeout(r, 200));
  }
}

/**
 * Creates and loads the main application window.
 */
export async function createMainWindow(): Promise<BrowserWindow> {
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

  const url = resolveRendererUrl();
  if (process.env.VITE_DEV_SERVER_URL && process.env.NODE_ENV !== 'test') {
    await waitForDevServer(url);
    // Vite may accept the TCP connection before it's fully serving HTML.
    // Retry loadURL up to 10 times with 300ms gaps on ERR_ABORTED (-3).
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await win.loadURL(url);
        return win;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code ?? String(err);
        if (!String(code).includes('-3') && !String(code).includes('ERR_ABORTED')) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    await win.loadURL(url);
  } else {
    await win.loadURL(url);
  }
  return win;
}

/**
 * Sends IPC payload to all open windows.
 */
export function broadcastToAllWindows<T>(channel: string, payload: T): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload);
  }
}
