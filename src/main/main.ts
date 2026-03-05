import path from 'node:path';
import { app, BrowserWindow, dialog } from 'electron';
import { openDatabaseWithRetry, type DbContext } from './db/connection';
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
 * Applies pending file-open request from CLI args.
 */
function applyInitialOpenFileFromArgs(): void {
  const initialOpenFilePath = findOpenFilePathInArgv(process.argv.slice(1));
  if (initialOpenFilePath) {
    setPendingOpenFilePath(initialOpenFilePath);
  }
}

/**
 * Registers single-instance behavior and second-instance handlers.
 */
function setupSingleInstanceHandling(): boolean {
  const singleInstanceLock = app.requestSingleInstanceLock();
  if (!singleInstanceLock) {
    app.quit();
    return false;
  }
  app.on('second-instance', (_event, argv) => {
    const openPath = findOpenFilePathInArgv(argv);
    if (openPath) {
      setPendingOpenFilePath(openPath);
    }
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      return;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    win.focus();
  });
  return true;
}

/**
 * Registers macOS file-open handler.
 */
function setupOpenFileHandler(): void {
  app.on('open-file', (event, filePath) => {
    event.preventDefault();
    setPendingOpenFilePath(filePath);
  });
}

/**
 * Applies runtime versioning and about-panel metadata.
 */
function setupVersionMetadata(): string {
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
  return versionLabel;
}

/**
 * Resolves configured and fallback database paths.
 */
function resolveDbPaths(settingsStore: SettingsStore): {
  defaultBaseDir: string;
  defaultSystemDbPath: string;
  configuredSystemDbPath: string;
} {
  const envPath = process.env.S1_DB_PATH;
  const defaultBaseDir = path.join(app.getPath('userData'), 'einsaetze');
  const configuredRawPath = settingsStore.get().dbPath ?? envPath ?? defaultBaseDir;
  const configuredBaseDir = resolveEinsatzBaseDir(configuredRawPath);
  return {
    defaultBaseDir,
    defaultSystemDbPath: resolveSystemDbPath(defaultBaseDir),
    configuredSystemDbPath: resolveSystemDbPath(configuredBaseDir),
  };
}

/**
 * Opens system DB with fallback strategy.
 */
function openSystemDbWithFallback(
  settingsStore: SettingsStore,
  paths: { defaultBaseDir: string; defaultSystemDbPath: string; configuredSystemDbPath: string },
): { dbContext: DbContext; startupWarning: string | null } {
  try {
    return { dbContext: openDatabaseWithRetry(paths.configuredSystemDbPath), startupWarning: null };
  } catch (initialError) {
    const initialMessage = initialError instanceof Error ? initialError.message : String(initialError);
    const firstWarning = `Konfigurierter DB-Pfad konnte nicht geöffnet werden (${paths.configuredSystemDbPath}).\n${initialMessage}`;
    try {
      settingsStore.set({ dbPath: paths.defaultBaseDir });
      return {
        dbContext: openDatabaseWithRetry(paths.defaultSystemDbPath),
        startupWarning: firstWarning,
      };
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      const tempPath = path.join(app.getPath('temp'), '_system-fallback.s1control');
      return {
        dbContext: openDatabaseWithRetry(tempPath),
        startupWarning: `${firstWarning}\nFallback auf Standardpfad fehlgeschlagen (${paths.defaultSystemDbPath}).\n${fallbackMessage}\nEs wird eine temporäre DB genutzt (${tempPath}).`,
      };
    }
  }
}

/**
 * Creates main app window.
 */
async function createMainWindow(): Promise<void> {
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
 * Forwards debug sync log lines to renderer windows.
 */
function setupDebugSyncForwarding(): void {
  onDebugSyncLog((line) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(IPC_CHANNEL.DEBUG_SYNC_LOG_ADDED, line);
    }
  });
}

/**
 * Stops long-running background services.
 */
function stopServices(
  backupCoordinator: BackupCoordinator,
  clientPresence: ClientPresenceService,
  einsatzSync: EinsatzSyncService,
  updater: UpdaterService,
): void {
  backupCoordinator.stop();
  clientPresence.stop(true);
  einsatzSync.stop();
  updater.shutdown();
}

/**
 * Registers app lifecycle handlers.
 */
function setupLifecycleHandlers(
  backupCoordinator: BackupCoordinator,
  clientPresence: ClientPresenceService,
  einsatzSync: EinsatzSyncService,
  updater: UpdaterService,
): void {
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow();
    }
  });
  app.on('window-all-closed', () => {
    stopServices(backupCoordinator, clientPresence, einsatzSync, updater);
    app.quit();
  });
  app.on('before-quit', () => {
    stopServices(backupCoordinator, clientPresence, einsatzSync, updater);
  });
}

/**
 * Handles Bootstrap.
 */
async function bootstrap(): Promise<void> {
  applyInitialOpenFileFromArgs();
  if (!setupSingleInstanceHandling()) {
    return;
  }
  setupOpenFileHandler();
  await app.whenReady();
  setupVersionMetadata();

  const settingsStore = new SettingsStore(app.getPath('userData'));
  const paths = resolveDbPaths(settingsStore);
  const dbBootstrap = openSystemDbWithFallback(settingsStore, paths);
  let dbContext = dbBootstrap.dbContext;
  const startupWarning = dbBootstrap.startupWarning;
  ensureDefaultAdmin(dbContext);
  const clientPresence = new ClientPresenceService();
  clientPresence.start(dbContext);
  const backupCoordinator = new BackupCoordinator(() => clientPresence.canWriteBackups());
  const lanPeerUpdatesEnabled = settingsStore.get().lanPeerUpdatesEnabled ?? false;
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
  }, lanPeerUpdatesEnabled);
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
    getDefaultDbPath: () => paths.defaultBaseDir,
    consumePendingOpenFilePath,
    getSessionUser: () => currentUser,
    setSessionUser: (user) => {
      currentUser = user;
    },
  });
  setupDebugSyncForwarding();
  await createMainWindow();
  void updater.checkForUpdates().catch(() => undefined);
  if (startupWarning) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Datenbankpfad Hinweis',
      message: startupWarning,
    }).catch(() => undefined);
  }
  setupLifecycleHandlers(backupCoordinator, clientPresence, einsatzSync, updater);
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
