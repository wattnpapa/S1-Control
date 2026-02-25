import path from 'node:path';
import { dialog, ipcMain, shell } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import type { SessionUser } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { openDatabaseWithRetry } from '../db/connection';
import { SettingsStore } from '../db/settings-store';
import { ensureDefaultAdmin, ensureSessionUserRecord, login } from '../services/auth';
import { BackupCoordinator, resolveBackupDir } from '../services/backup';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../services/command';
import { toSafeError } from '../services/errors';
import {
  createEinsatzDbFileName,
  createEinsatzInOwnDatabase,
  listEinsaetzeFromDbPaths,
  readPrimaryEinsatzFromDbFile,
  resolveEinsatzBaseDir,
  resolveSystemDbPath,
} from '../services/einsatz-files';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createFahrzeug,
  splitEinheit,
  hasUndoableCommand,
  listAbschnittDetails,
  listAbschnitte,
} from '../services/einsatz';
import { exportEinsatzakte } from '../services/export';
import { UpdaterService } from '../services/updater';

interface AppState {
  getDbContext: () => DbContext;
  setDbContext: (ctx: DbContext) => void;
  backupCoordinator: BackupCoordinator;
  updater: UpdaterService;
  settingsStore: SettingsStore;
  getDefaultDbPath: () => string;
  getSessionUser: () => SessionUser | null;
  setSessionUser: (user: SessionUser | null) => void;
}

export function registerIpc(state: AppState): void {
  const wrap = <T extends unknown[], R>(handler: (...args: T) => R | Promise<R>) => {
    return async (_event: Electron.IpcMainInvokeEvent, ...args: T): Promise<R> => {
      try {
        return await handler(...args);
      } catch (error) {
        const safe = toSafeError(error);
        const wrapped = new Error(safe.message);
        if (safe.code) {
          (wrapped as Error & { code?: string }).code = safe.code;
        }
        throw wrapped;
      }
    };
  };

  const requireUser = (): SessionUser => {
    const user = state.getSessionUser();
    if (!user) {
      throw new Error('Nicht angemeldet');
    }
    return user;
  };

  const getBaseDir = (): string => resolveEinsatzBaseDir(state.settingsStore.get().dbPath ?? state.getDefaultDbPath());
  const getRecentDbPaths = (): string[] => state.settingsStore.get().recentEinsatzDbPaths ?? [];

  const persistRecentDbPaths = (dbPaths: string[]): void => {
    const unique = Array.from(new Set(dbPaths)).slice(0, 5);
    state.settingsStore.set({ recentEinsatzDbPaths: unique });
  };

  const rememberRecentDbPath = (dbPath: string): void => {
    const next = [dbPath, ...getRecentDbPaths().filter((item) => item !== dbPath)];
    persistRecentDbPaths(next);
  };

  const getValidRecentDbPaths = (): string[] => {
    const valid: string[] = [];
    for (const dbPath of getRecentDbPaths()) {
      if (!readPrimaryEinsatzFromDbFile(dbPath)) {
        continue;
      }
      valid.push(dbPath);
    }
    if (valid.length !== getRecentDbPaths().length) {
      persistRecentDbPaths(valid);
    }
    return valid;
  };

  const resolveRecentDbPathByEinsatzId = (einsatzId: string): string | null => {
    for (const dbPath of getValidRecentDbPaths()) {
      const einsatz = readPrimaryEinsatzFromDbFile(dbPath);
      if (einsatz?.id === einsatzId) {
        return dbPath;
      }
    }
    return null;
  };

  ipcMain.handle(IPC_CHANNEL.GET_SESSION, wrap(async () => state.getSessionUser()));

  ipcMain.handle(
    IPC_CHANNEL.LOGIN,
    wrap(async (input: Parameters<RendererApi['login']>[0]) => {
      const user = login(state.getDbContext(), input.name, input.passwort);
      state.setSessionUser(user);
      return user;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LOGOUT,
    wrap(async () => {
      state.backupCoordinator.stop();
      state.setSessionUser(null);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_SETTINGS,
    wrap(async () => {
      const stored = state.settingsStore.get();
      return { dbPath: stored.dbPath ?? state.getDefaultDbPath() };
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.SET_DB_PATH,
    wrap(async (dbPath: string) => {
      const baseDir = resolveEinsatzBaseDir(dbPath);
      const nextContext = openDatabaseWithRetry(resolveSystemDbPath(baseDir));
      ensureDefaultAdmin(nextContext);
      state.backupCoordinator.stop();
      state.setDbContext(nextContext);
      state.settingsStore.set({ dbPath: baseDir });
      return { dbPath: baseDir };
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EINSAETZE,
    wrap(async () => {
      return listEinsaetzeFromDbPaths(getValidRecentDbPaths());
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const dbPath = resolveRecentDbPathByEinsatzId(einsatzId);
      if (!dbPath) {
        return false;
      }
      const nextContext = openDatabaseWithRetry(dbPath);
      ensureDefaultAdmin(nextContext);
      const dbUser = ensureSessionUserRecord(nextContext, user);
      state.setSessionUser(dbUser);
      state.setDbContext(nextContext);
      state.backupCoordinator.start(nextContext);
      rememberRecentDbPath(dbPath);
      return true;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ_DIALOG,
    wrap(async () => {
      const user = requireUser();
      const result = await dialog.showOpenDialog({
        title: 'Einsatz-Datei öffnen',
        defaultPath: getBaseDir(),
        filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
        properties: ['openFile'],
      });

      const selected = result.filePaths[0];
      if (result.canceled || !selected) {
        return null;
      }

      const einsatzMeta = readPrimaryEinsatzFromDbFile(selected);
      if (!einsatzMeta) {
        throw new Error('Die gewählte Datei enthält keinen gültigen Einsatz.');
      }

      const nextContext = openDatabaseWithRetry(selected);
      ensureDefaultAdmin(nextContext);
      const dbUser = ensureSessionUserRecord(nextContext, user);
      state.setSessionUser(dbUser);
      state.setDbContext(nextContext);
      state.backupCoordinator.start(nextContext);
      rememberRecentDbPath(selected);
      state.settingsStore.set({ dbPath: path.dirname(selected) });
      return einsatzMeta;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINSATZ,
    wrap(async (input: Parameters<RendererApi['createEinsatz']>[0]) => {
      const user = requireUser();
      const created = createEinsatzInOwnDatabase(getBaseDir(), input, user);
      const dbUser = ensureSessionUserRecord(created.ctx, user);
      state.setSessionUser(dbUser);
      state.setDbContext(created.ctx);
      state.backupCoordinator.start(created.ctx);
      return created.einsatz;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINSATZ_DIALOG,
    wrap(async (input: Parameters<RendererApi['createEinsatzWithDialog']>[0]) => {
      const user = requireUser();
      const baseDir = getBaseDir();
      const saveResult = await dialog.showSaveDialog({
        title: 'Einsatz-Datei speichern',
        defaultPath: path.join(baseDir, createEinsatzDbFileName(input.name)),
        filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
      });

      const selected = saveResult.filePath;
      if (saveResult.canceled || !selected) {
        return null;
      }

      const normalized = selected.toLowerCase().endsWith('.sqlite') ? selected : `${selected}.sqlite`;
      const created = createEinsatzInOwnDatabase(path.dirname(normalized), input, user, normalized);
      const dbUser = ensureSessionUserRecord(created.ctx, user);
      state.setSessionUser(dbUser);
      state.setDbContext(created.ctx);
      state.backupCoordinator.start(created.ctx);
      rememberRecentDbPath(normalized);
      state.settingsStore.set({ dbPath: path.dirname(normalized) });
      return created.einsatz;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.ARCHIVE_EINSATZ,
    wrap(async (einsatzId: string) => {
      requireUser();
      archiveEinsatz(state.getDbContext(), einsatzId);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITTE,
    wrap(async (einsatzId: string) => listAbschnitte(state.getDbContext(), einsatzId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_ABSCHNITT,
    wrap(async (input: Parameters<RendererApi['createAbschnitt']>[0]) => {
      requireUser();
      return createAbschnitt(state.getDbContext(), input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ABSCHNITT_DETAILS,
    wrap(async (einsatzId: string, abschnittId: string) =>
      listAbschnittDetails(state.getDbContext(), einsatzId, abschnittId),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['createEinheit']>[0]) => {
      requireUser();
      createEinheit(state.getDbContext(), input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['createFahrzeug']>[0]) => {
      requireUser();
      createFahrzeug(state.getDbContext(), input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.SPLIT_EINHEIT,
    wrap(async (input: Parameters<RendererApi['splitEinheit']>[0]) => {
      requireUser();
      splitEinheit(state.getDbContext(), input);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['moveEinheit']>[0]) => {
      const user = requireUser();
      moveEinheit(state.getDbContext(), input, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['moveFahrzeug']>[0]) => {
      const user = requireUser();
      moveFahrzeug(state.getDbContext(), input, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UNDO_LAST,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      return undoLastCommand(state.getDbContext(), einsatzId, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.HAS_UNDO,
    wrap(async (einsatzId: string) => hasUndoableCommand(state.getDbContext(), einsatzId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.RESTORE_BACKUP,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const dbPath = resolveRecentDbPathByEinsatzId(einsatzId);
      if (!dbPath) {
        return false;
      }

      const result = await dialog.showOpenDialog({
        title: 'Backup laden',
        defaultPath: resolveBackupDir(dbPath),
        filters: [{ name: 'SQLite', extensions: ['sqlite'] }],
        properties: ['openFile'],
      });
      const selected = result.filePaths[0];
      if (result.canceled || !selected) {
        return false;
      }

      const activeContext = state.getDbContext();
      activeContext.sqlite.close();
      await state.backupCoordinator.restoreBackup(dbPath, selected);
      const nextContext = openDatabaseWithRetry(dbPath);
      ensureDefaultAdmin(nextContext);
      const dbUser = ensureSessionUserRecord(nextContext, user);
      state.setSessionUser(dbUser);
      state.setDbContext(nextContext);
      state.backupCoordinator.start(nextContext);
      return true;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.EXPORT_EINSATZAKTE,
    wrap(async (einsatzId: string) => {
      requireUser();
      const defaultPath = path.join(process.cwd(), `einsatzakte-${einsatzId}.zip`);
      const result = await dialog.showSaveDialog({
        title: 'Einsatzakte exportieren',
        defaultPath,
        filters: [{ name: 'ZIP', extensions: ['zip'] }],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      await exportEinsatzakte(state.getDbContext(), einsatzId, result.filePath);
      return { outputPath: result.filePath };
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_UPDATER_STATE,
    wrap(async () => state.updater.getState()),
  );

  ipcMain.handle(
    IPC_CHANNEL.CHECK_UPDATES,
    wrap(async () => {
      await state.updater.checkForUpdates();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.DOWNLOAD_UPDATE,
    wrap(async () => {
      await state.updater.downloadUpdate();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.INSTALL_UPDATE,
    wrap(async () => {
      state.updater.installDownloadedUpdate();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EXTERNAL_URL,
    wrap(async (url: string) => {
      if (!/^https:\/\//i.test(url)) {
        throw new Error('Nur HTTPS-URLs sind erlaubt.');
      }
      await shell.openExternal(url);
    }),
  );
}
