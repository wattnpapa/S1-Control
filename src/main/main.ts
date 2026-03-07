import { app, BrowserWindow, dialog, globalShortcut, shell } from 'electron';
import path from 'node:path';
import { openDatabaseWithRetry, type DbContext } from './db/connection';
import { SettingsStore } from './db/settings-store';
import { registerIpc } from './ipc/register-ipc';
import { setupVersionMetadata, withVersion } from './services/app-version';
import { ensureDefaultAdmin } from './services/auth';
import { BackupCoordinator } from './services/backup';
import { ClientPresenceService } from './services/clients';
import { resolveEinsatzBaseDir, resolveSystemDbPath } from './services/einsatz-files';
import { EinsatzReadCache } from './services/einsatz-read-cache';
import { StrengthDisplayService } from './services/strength-display';
import { EinsatzSyncService } from './services/einsatz-sync';
import { UpdaterService } from './services/updater';
import { debugSync, onDebugSyncLog } from './services/debug';
import { broadcastToAllWindows, createMainWindow, resolveRendererUrl } from './services/main-window';
import { runStartupRecovery } from './services/startup-recovery';
import { MainDbBridge } from './services/main-db-bridge';
import type { SessionUser } from '../shared/types';
import { IPC_CHANNEL } from '../shared/ipc';

const EINSATZ_FILE_EXTENSIONS = ['.s1control', '.sqlite'];
let pendingOpenFilePath: string | null = null;
let bootstrapUpdater: UpdaterService | null = null;
let appShuttingDown = false;
let strengthPrewarmEarlyTimer: NodeJS.Timeout | null = null;
let strengthPrewarmRetryTimer: NodeJS.Timeout | null = null;
const PERF_SAFE_MODE = process.env.S1_PERF_SAFE_MODE === '1';
const DISABLE_LAN_UPDATE_PEER = PERF_SAFE_MODE;
const DISABLE_UDP_SYNC = PERF_SAFE_MODE;
const DISABLE_CLIENT_HEARTBEAT = PERF_SAFE_MODE;
const USE_DB_UTILITY_PROCESS = process.env.S1_DB_UTILITY_PROCESS === '1';

/**
 * Applies runtime feature workarounds for current Electron/macOS combinations.
 */
function applyRuntimeWorkarounds(): void {
  // Work around startup crashes in newer macOS builds where V8 compile hints
  // can trigger early SIGTRAP in Electron before app bootstrap completes.
  app.commandLine.appendSwitch('disable-features', 'V8CompileHints');
}

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
 * Forwards debug sync log lines to renderer windows.
 */
function setupDebugSyncForwarding(): void {
  onDebugSyncLog((line) => {
    broadcastToAllWindows(IPC_CHANNEL.DEBUG_SYNC_LOG_ADDED, line);
  });
}

/**
 * Stops long-running background services.
 */
function stopServices(input: {
  backupCoordinator: BackupCoordinator;
  clientPresence: ClientPresenceService;
  einsatzSync: EinsatzSyncService;
  updater: UpdaterService;
  dbBridge: MainDbBridge;
}): void {
  const { backupCoordinator, clientPresence, einsatzSync, updater, dbBridge } = input;
  backupCoordinator.stop();
  // Avoid blocking shutdown on busy DB writes; stale entries are auto-cleaned by TTL.
  clientPresence.stop(false);
  einsatzSync.stop();
  updater.shutdown();
  dbBridge.stop();
}

/**
 * Clears pending strength-monitor prewarm timers.
 */
function clearStrengthPrewarmTimers(): void {
  if (strengthPrewarmEarlyTimer) {
    clearTimeout(strengthPrewarmEarlyTimer);
    strengthPrewarmEarlyTimer = null;
  }
  if (strengthPrewarmRetryTimer) {
    clearTimeout(strengthPrewarmRetryTimer);
    strengthPrewarmRetryTimer = null;
  }
}

/**
 * Registers app lifecycle handlers.
 */
function setupLifecycleHandlers(input: {
  backupCoordinator: BackupCoordinator;
  clientPresence: ClientPresenceService;
  einsatzSync: EinsatzSyncService;
  updater: UpdaterService;
  strengthDisplay: StrengthDisplayService;
  dbBridge: MainDbBridge;
}): void {
  const { backupCoordinator, clientPresence, einsatzSync, updater, strengthDisplay, dbBridge } = input;
  let stopped = false;
  let forceExitTimer: NodeJS.Timeout | null = null;
  const stopOnce = () => {
    if (stopped) {
      return;
    }
    stopped = true;
    stopServices({
      backupCoordinator,
      clientPresence,
      einsatzSync,
      updater,
      dbBridge,
    });
  };
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createMainWindow().then((win) => {
        wireMainWindowCloseBehavior(win, strengthDisplay);
      });
    }
  });
  app.on('window-all-closed', () => {
    appShuttingDown = true;
    clearStrengthPrewarmTimers();
    debugSync('lifecycle', 'window-all-closed');
    stopOnce();
    app.quit();
    if (!forceExitTimer) {
      forceExitTimer = setTimeout(() => {
        debugSync('lifecycle', 'force-exit', { reason: 'window-all-closed-timeout' });
        app.exit(0);
      }, 250);
    }
  });
  app.on('before-quit', () => {
    appShuttingDown = true;
    clearStrengthPrewarmTimers();
    debugSync('lifecycle', 'before-quit');
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.destroy();
      }
    }
    stopOnce();
    if (!forceExitTimer) {
      forceExitTimer = setTimeout(() => {
        debugSync('lifecycle', 'force-exit', { reason: 'before-quit-timeout' });
        app.exit(0);
      }, 250);
    }
  });
  app.on('will-quit', () => {
    clearStrengthPrewarmTimers();
    debugSync('lifecycle', 'will-quit');
    if (forceExitTimer) {
      clearTimeout(forceExitTimer);
      forceExitTimer = null;
    }
  });
}

/**
 * Wires main-window close behavior and ensures auxiliary windows are closed.
 */
function wireMainWindowCloseBehavior(win: BrowserWindow, strengthDisplay: StrengthDisplayService): void {
  const marker = win as BrowserWindow & { __s1MainCloseWired?: boolean };
  if (marker.__s1MainCloseWired) {
    return;
  }
  marker.__s1MainCloseWired = true;
  win.on('close', () => {
    strengthDisplay.closeWindow(false);
  });
}

/**
 * Registers renderer debugging shortcuts.
 */
function registerDebugShortcuts(): void {
  const toggleFocusedWindowDevTools = () => {
    const focused = BrowserWindow.getFocusedWindow();
    if (!focused) {
      return;
    }
    focused.webContents.toggleDevTools();
  };
  globalShortcut.register('CommandOrControl+Shift+I', toggleFocusedWindowDevTools);
  globalShortcut.register('F12', toggleFocusedWindowDevTools);
  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}

/**
 * Handles Bootstrap.
 */
async function bootstrap(): Promise<void> {
  applyRuntimeWorkarounds();
  applyInitialOpenFileFromArgs();
  if (!setupSingleInstanceHandling()) {
    return;
  }
  setupOpenFileHandler();
  await app.whenReady();
  setupVersionMetadata();

  const settingsStore = new SettingsStore(app.getPath('userData'));
  const lanPeerUpdatesEnabled = settingsStore.get().lanPeerUpdatesEnabled ?? false;
  const effectiveLanPeerEnabled = DISABLE_LAN_UPDATE_PEER ? false : lanPeerUpdatesEnabled;
  debugSync('bootstrap', 'feature-flags', {
    perfSafeMode: PERF_SAFE_MODE,
    dbUtilityProcessEnabled: USE_DB_UTILITY_PROCESS,
    lanUpdatePeerEnabled: effectiveLanPeerEnabled,
    udpSyncEnabled: !DISABLE_UDP_SYNC,
    clientHeartbeatEnabled: !DISABLE_CLIENT_HEARTBEAT,
  });
  const updater = new UpdaterService((state) => {
    broadcastToAllWindows(IPC_CHANNEL.UPDATER_STATE_CHANGED, state);
  }, effectiveLanPeerEnabled);
  bootstrapUpdater = updater;

  const paths = resolveDbPaths(settingsStore);
  const dbBootstrap = openSystemDbWithFallback(settingsStore, paths);
  let dbContext = dbBootstrap.dbContext;
  const startupWarning = dbBootstrap.startupWarning;
  ensureDefaultAdmin(dbContext);
  const clientPresence = new ClientPresenceService();
  if (!DISABLE_CLIENT_HEARTBEAT) {
    clientPresence.start(dbContext);
  }
  const backupCoordinator = new BackupCoordinator(() =>
    DISABLE_CLIENT_HEARTBEAT ? true : clientPresence.canWriteBackups(),
  );
  const einsatzSync = new EinsatzSyncService((signal) => {
    broadcastToAllWindows(IPC_CHANNEL.EINSATZ_CHANGED, signal);
  });
  if (!DISABLE_UDP_SYNC) {
    einsatzSync.start(dbContext.path);
  }
  const strengthDisplay = new StrengthDisplayService(resolveRendererUrl);
  const einsatzReadCache = new EinsatzReadCache();
  const dbBridge = new MainDbBridge();
  dbBridge.start(USE_DB_UTILITY_PROCESS);

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
      einsatzReadCache.clearAll();
    },
    backupCoordinator,
    clientPresence,
    einsatzSync,
    updater,
    strengthDisplay,
    einsatzReadCache,
    settingsStore,
    getDefaultDbPath: () => paths.defaultBaseDir,
    consumePendingOpenFilePath,
    getSessionUser: () => currentUser,
    setSessionUser: (user) => {
      currentUser = user;
    },
    clientHeartbeatEnabled: !DISABLE_CLIENT_HEARTBEAT,
    lanPeerUpdatesAllowed: !DISABLE_LAN_UPDATE_PEER,
    perfSafeMode: PERF_SAFE_MODE,
    useDbUtilityProcess: USE_DB_UTILITY_PROCESS,
    dbBridge,
  });
  setupDebugSyncForwarding();
  registerDebugShortcuts();
  const mainWindow = await createMainWindow();
  wireMainWindowCloseBehavior(mainWindow, strengthDisplay);
  mainWindow.once('ready-to-show', () => {
    debugSync('strength-display', 'prewarm-scheduled');
    strengthPrewarmEarlyTimer = setTimeout(() => {
      try {
        if (appShuttingDown || BrowserWindow.getAllWindows().length === 0) {
          return;
        }
        strengthDisplay.prewarmWindow();
        debugSync('strength-display', 'prewarm-started', strengthDisplay.getHealth());
      } catch {
        // best effort prewarm only
      } finally {
        strengthPrewarmEarlyTimer = null;
      }
    }, 150);
  });
  strengthPrewarmRetryTimer = setTimeout(() => {
    try {
      if (appShuttingDown || BrowserWindow.getAllWindows().length === 0) {
        return;
      }
      strengthDisplay.prewarmWindow();
      debugSync('strength-display', 'prewarm-retry', strengthDisplay.getHealth());
    } catch {
      // best effort prewarm only
    } finally {
      strengthPrewarmRetryTimer = null;
    }
  }, 1200);
  if (startupWarning) {
    dialog.showMessageBox({
      type: 'warning',
      title: 'Datenbankpfad Hinweis',
      message: startupWarning,
    }).catch(() => undefined);
  }
  setupLifecycleHandlers({
    backupCoordinator,
    clientPresence,
    einsatzSync,
    updater,
    strengthDisplay,
    dbBridge,
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

void bootstrap().catch(async (error) => {
  const updater = bootstrapUpdater ?? new UpdaterService(() => undefined, false);
  await runStartupRecovery(error, {
    updater,
    withVersion,
    showErrorBox: (title, content) => dialog.showErrorBox(title, content),
    showMessageBox: async (options) => dialog.showMessageBox(options),
    openExternal: async (url) => shell.openExternal(url),
  });
});
