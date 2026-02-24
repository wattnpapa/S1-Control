import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { openDatabaseWithRetry } from './db/connection';
import { SettingsStore } from './db/settings-store';
import { registerIpc } from './ipc/register-ipc';
import { ensureDefaultAdmin } from './services/auth';
import type { SessionUser } from '../shared/types';

function resolveRendererUrl(): string {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    return devServer;
  }

  return `file://${path.join(__dirname, '../dist-renderer/index.html')}`;
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  const settingsStore = new SettingsStore(app.getPath('userData'));
  const envPath = process.env.S1_DB_PATH;
  const defaultDbPath = path.join(app.getPath('userData'), 's1-control.sqlite');
  const configuredPath = settingsStore.get().dbPath ?? envPath ?? defaultDbPath;

  let startupWarning: string | null = null;

  const openWithFallback = () => {
    try {
      return openDatabaseWithRetry(configuredPath);
    } catch (initialError) {
      const initialMessage = initialError instanceof Error ? initialError.message : String(initialError);
      startupWarning = `Konfigurierter DB-Pfad konnte nicht geoeffnet werden (${configuredPath}).\n${initialMessage}`;

      try {
        settingsStore.set({ dbPath: defaultDbPath });
        return openDatabaseWithRetry(defaultDbPath);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        const tempPath = path.join(app.getPath('temp'), 's1-control-fallback.sqlite');
        startupWarning = `${startupWarning}\nFallback auf Standardpfad fehlgeschlagen (${defaultDbPath}).\n${fallbackMessage}\nEs wird eine temporaere DB genutzt (${tempPath}).`;
        return openDatabaseWithRetry(tempPath);
      }
    }
  };

  let dbContext = openWithFallback();
  ensureDefaultAdmin(dbContext);

  let currentUser: SessionUser | null = null;

  registerIpc({
    dbContext,
    setDbContext: (ctx) => {
      dbContext.sqlite.close();
      dbContext = ctx;
    },
    settingsStore,
    getDefaultDbPath: () => defaultDbPath,
    getSessionUser: () => currentUser,
    setSessionUser: (user) => {
      currentUser = user;
    },
  });

  const createWindow = async (): Promise<void> => {
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
  };

  await createWindow();
  if (startupWarning) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Datenbankpfad Hinweis',
      message: startupWarning,
    }).catch(() => undefined);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Unerwarteter Fehler im Main-Prozess', error?.stack || String(error));
});

void bootstrap();
