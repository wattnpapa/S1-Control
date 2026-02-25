import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { openDatabaseWithRetry } from './db/connection';
import { SettingsStore } from './db/settings-store';
import { registerIpc } from './ipc/register-ipc';
import { ensureDefaultAdmin } from './services/auth';
import { BackupCoordinator } from './services/backup';
import { resolveEinsatzBaseDir, resolveSystemDbPath } from './services/einsatz-files';
import { UpdaterService } from './services/updater';
import type { SessionUser } from '../shared/types';
import { IPC_CHANNEL } from '../shared/ipc';

function toNatoVersionTag(date: Date): string {
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const mon = months[date.getUTCMonth()] ?? 'jan';
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${dd}${hh}${mm}${mon}${yy}`;
}

function resolveAppVersionLabel(): string {
  return process.env.S1_APP_VERSION || app.getVersion() || toNatoVersionTag(new Date());
}

function resolveRendererUrl(): string {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    return devServer;
  }

  return `file://${path.join(__dirname, '../dist-renderer/index.html')}`;
}

async function bootstrap(): Promise<void> {
  await app.whenReady();
  const envVersion = process.env.S1_APP_VERSION;
  if (envVersion) {
    app.setVersion(envVersion);
  }
  const versionLabel = resolveAppVersionLabel();

  app.setAboutPanelOptions({
    applicationName: 'S1-Control',
    applicationVersion: versionLabel,
    version: versionLabel,
    copyright: `Copyright © ${new Date().getFullYear()} Johannes Rudolph`,
  });

  const settingsStore = new SettingsStore(app.getPath('userData'));
  const envPath = process.env.S1_DB_PATH;
  const defaultBaseDir = path.join(app.getPath('userData'), 'einsaetze');
  const configuredRawPath = settingsStore.get().dbPath ?? envPath ?? defaultBaseDir;
  const configuredBaseDir = resolveEinsatzBaseDir(configuredRawPath);
  const defaultSystemDbPath = resolveSystemDbPath(defaultBaseDir);
  const configuredSystemDbPath = resolveSystemDbPath(configuredBaseDir);

  let startupWarning: string | null = null;

  const openWithFallback = () => {
    try {
      return openDatabaseWithRetry(configuredSystemDbPath);
    } catch (initialError) {
      const initialMessage = initialError instanceof Error ? initialError.message : String(initialError);
      startupWarning = `Konfigurierter DB-Pfad konnte nicht geöffnet werden (${configuredSystemDbPath}).\n${initialMessage}`;

      try {
        settingsStore.set({ dbPath: defaultBaseDir });
        return openDatabaseWithRetry(defaultSystemDbPath);
      } catch (fallbackError) {
        const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        const tempPath = path.join(app.getPath('temp'), '_system-fallback.sqlite');
        startupWarning = `${startupWarning}\nFallback auf Standardpfad fehlgeschlagen (${defaultSystemDbPath}).\n${fallbackMessage}\nEs wird eine temporäre DB genutzt (${tempPath}).`;
        return openDatabaseWithRetry(tempPath);
      }
    }
  };

  let dbContext = openWithFallback();
  ensureDefaultAdmin(dbContext);
  const backupCoordinator = new BackupCoordinator();
  const updater = new UpdaterService((state) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNEL.UPDATER_STATE_CHANGED, state);
    }
  });

  let currentUser: SessionUser | null = null;

  registerIpc({
    getDbContext: () => dbContext,
    setDbContext: (ctx) => {
      try {
        dbContext.sqlite.close();
      } catch {
        // already closed
      }
      dbContext = ctx;
    },
    backupCoordinator,
    updater,
    settingsStore,
    getDefaultDbPath: () => defaultBaseDir,
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
  void updater.checkForUpdates();
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
    backupCoordinator.stop();
    app.quit();
  });
}

process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Unerwarteter Fehler im Main-Prozess', error?.stack || String(error));
});

void bootstrap();
