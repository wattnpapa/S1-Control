import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { openDatabaseWithRetry } from './db/connection';
import { SettingsStore } from './db/settings-store';
import { registerIpc } from './ipc/register-ipc';
import { ensureDefaultAdmin } from './services/auth';
import { BackupCoordinator } from './services/backup';
import { resolveEinsatzBaseDir, resolveSystemDbPath } from './services/einsatz-files';
import { StrengthDisplayService } from './services/strength-display';
import { UpdaterService } from './services/updater';
import type { SessionUser } from '../shared/types';
import { IPC_CHANNEL } from '../shared/ipc';

function toBuildVersion(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}.${month}.${day}.${hour}.${minute}`;
}

function fromSemverToBuildVersion(value: string): string | null {
  const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match;
  return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}.${hour.padStart(2, '0')}.${minute.padStart(2, '0')}`;
}

function resolveAppVersionLabel(): string {
  const envVersion = process.env.S1_APP_VERSION;
  if (envVersion) {
    return envVersion;
  }
  const semverVersion = process.env.S1_APP_SEMVER || app.getVersion();
  const mapped = fromSemverToBuildVersion(semverVersion);
  if (mapped) {
    return mapped;
  }
  if (semverVersion && semverVersion !== '0.1.0') {
    return semverVersion;
  }
  return toBuildVersion(new Date());
}

function withVersion(details: string): string {
  return `Version: ${resolveAppVersionLabel()}\n\n${details}`;
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
  const envSemver = process.env.S1_APP_SEMVER;
  if (envSemver) {
    app.setVersion(envSemver);
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
  const strengthDisplay = new StrengthDisplayService(resolveRendererUrl);

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
    strengthDisplay,
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
  void updater.checkForUpdates().catch(() => undefined);
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
  dialog.showErrorBox(
    'Unerwarteter Fehler im Main-Prozess',
    withVersion(error?.stack || String(error)),
  );
});

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.stack || reason.message : String(reason);
  dialog.showErrorBox('Unerwarteter Initialisierungsfehler', withVersion(message));
});

void bootstrap().catch((error) => {
  dialog.showErrorBox(
    'Startfehler',
    withVersion(error instanceof Error ? error.stack || error.message : String(error)),
  );
});
