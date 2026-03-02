import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { openDatabaseWithRetry } from './db/connection';
import { SettingsStore } from './db/settings-store';
import { registerIpc } from './ipc/register-ipc';
import { ensureDefaultAdmin } from './services/auth';
import { BackupCoordinator } from './services/backup';
import { ClientPresenceService } from './services/clients';
import { resolveEinsatzBaseDir, resolveSystemDbPath } from './services/einsatz-files';
import { StrengthDisplayService } from './services/strength-display';
import { EinsatzSyncService } from './services/einsatz-sync';
import { UpdaterService } from './services/updater';
import { onDebugSyncLog } from './services/debug';
import type { SessionUser } from '../shared/types';
import { IPC_CHANNEL } from '../shared/ipc';

const EINSATZ_FILE_EXTENSIONS = ['.s1control', '.sqlite'];
let pendingOpenFilePath: string | null = null;

/**
 * Handles Is Einsatz File Path.
 */
function isEinsatzFilePath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return EINSATZ_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Handles Set Pending Open File Path.
 */
function setPendingOpenFilePath(filePath: string): void {
  if (!isEinsatzFilePath(filePath)) {
    return;
  }
  pendingOpenFilePath = filePath;
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IPC_CHANNEL.PENDING_OPEN_FILE, filePath);
  }
}

/**
 * Handles Consume Pending Open File Path.
 */
function consumePendingOpenFilePath(): string | null {
  const next = pendingOpenFilePath;
  pendingOpenFilePath = null;
  return next;
}

/**
 * Handles Find Open File Path In Argv.
 */
function findOpenFilePathInArgv(argv: string[]): string | null {
  for (const arg of argv) {
    if (isEinsatzFilePath(arg)) {
      return arg;
    }
  }
  return null;
}

/**
 * Handles To Build Version.
 */
function toBuildVersion(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}.${month}.${day}.${hour}.${minute}`;
}

/**
 * Handles From Semver To Build Version.
 */
function fromSemverToBuildVersion(value: string): string | null {
  const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match;
  return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}.${hour.padStart(2, '0')}.${minute.padStart(2, '0')}`;
}

/**
 * Handles Resolve App Version Label.
 */
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

/**
 * Handles With Version.
 */
function withVersion(details: string): string {
  return `Version: ${resolveAppVersionLabel()}\n\n${details}`;
}

/**
 * Handles Resolve Renderer Url.
 */
function resolveRendererUrl(): string {
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    return devServer;
  }

  return `file://${path.join(__dirname, '../dist-renderer/index.html')}`;
}

/**
 * Handles Bootstrap.
 */
async function bootstrap(): Promise<void> {
  const initialOpenFilePath = findOpenFilePathInArgv(process.argv.slice(1));
  if (initialOpenFilePath) {
    setPendingOpenFilePath(initialOpenFilePath);
  }

  const singleInstanceLock = app.requestSingleInstanceLock();
  if (!singleInstanceLock) {
    app.quit();
    return;
  }

  app.on('second-instance', (_event, argv) => {
    const openPath = findOpenFilePathInArgv(argv);
    if (openPath) {
      setPendingOpenFilePath(openPath);
    }
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      win.focus();
    }
  });

  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    setPendingOpenFilePath(filePath);
  });

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

  /**
   * Handles Open With Fallback.
   */
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
        const tempPath = path.join(app.getPath('temp'), '_system-fallback.s1control');
        startupWarning = `${startupWarning}\nFallback auf Standardpfad fehlgeschlagen (${defaultSystemDbPath}).\n${fallbackMessage}\nEs wird eine temporäre DB genutzt (${tempPath}).`;
        return openDatabaseWithRetry(tempPath);
      }
    }
  };

  let dbContext = openWithFallback();
  ensureDefaultAdmin(dbContext);
  const clientPresence = new ClientPresenceService();
  clientPresence.start(dbContext);
  const backupCoordinator = new BackupCoordinator(() => clientPresence.canWriteBackups());
  const einsatzSync = new EinsatzSyncService((signal) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNEL.EINSATZ_CHANGED, signal);
    }
  });
  einsatzSync.start(dbContext.path);
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
    clientPresence,
    einsatzSync,
    updater,
    strengthDisplay,
    settingsStore,
    getDefaultDbPath: () => defaultBaseDir,
    consumePendingOpenFilePath,
    getSessionUser: () => currentUser,
    setSessionUser: (user) => {
      currentUser = user;
    },
  });

  onDebugSyncLog((line) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNEL.DEBUG_SYNC_LOG_ADDED, line);
    }
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
    clientPresence.stop(true);
    einsatzSync.stop();
    updater.shutdown();
    app.quit();
  });

  app.on('before-quit', () => {
    backupCoordinator.stop();
    clientPresence.stop(true);
    einsatzSync.stop();
    updater.shutdown();
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
