import path from 'node:path';
import { eq } from 'drizzle-orm';
import { dialog, ipcMain, shell } from 'electron';
import { IPC_CHANNEL, type RendererApi } from '../../shared/ipc';
import type { SessionUser } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { openDatabaseWithRetry } from '../db/connection';
import { einsatzEinheitHelfer } from '../db/schema';
import { SettingsStore } from '../db/settings-store';
import { ensureDefaultAdmin, ensureSessionUserRecord, login } from '../services/auth';
import { BackupCoordinator, resolveBackupDir } from '../services/backup';
import { ClientPresenceService } from '../services/clients';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../services/command';
import { debugSync, getDebugSyncLogLines } from '../services/debug';
import { toSafeError } from '../services/errors';
import {
  createEinsatzDbFileName,
  createEinsatzInOwnDatabase,
  listEinsaetzeFromDbPathsWithUsage,
  readPrimaryEinsatzFromDbFile,
  resolveEinsatzBaseDir,
  resolveSystemDbPath,
} from '../services/einsatz-files';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createEinheitHelfer,
  createFahrzeug,
  deleteEinheitHelfer,
  updateAbschnitt,
  updateEinheit,
  updateEinheitHelfer,
  updateFahrzeug,
  splitEinheit,
  hasUndoableCommand,
  listEinsaetze as listEinsaetzeFromContext,
  listAbschnittDetails,
  listAbschnitte,
  listEinheitHelfer,
} from '../services/einsatz';
import { exportEinsatzakte } from '../services/export';
import {
  getTacticalFormationSvgDataUrl,
  getTacticalPersonSvgDataUrl,
  getTacticalVehicleSvgDataUrl,
} from '../services/tactical-signs';
import {
  inferTacticalSignConfig,
  listTacticalSignCatalog,
} from '../services/tactical-sign-inference';
import { StrengthDisplayService } from '../services/strength-display';
import { UpdaterService } from '../services/updater';
import { EinsatzSyncService } from '../services/einsatz-sync';
import {
  acquireRecordEditLock,
  ensureRecordEditLockOwnership,
  listRecordEditLocks,
  refreshRecordEditLock,
  releaseRecordEditLock,
} from '../services/record-lock';

interface AppState {
  getDbContext: () => DbContext;
  setDbContext: (ctx: DbContext) => void;
  backupCoordinator: BackupCoordinator;
  clientPresence: ClientPresenceService;
  einsatzSync: EinsatzSyncService;
  updater: UpdaterService;
  strengthDisplay: StrengthDisplayService;
  settingsStore: SettingsStore;
  getDefaultDbPath: () => string;
  consumePendingOpenFilePath: () => string | null;
  getSessionUser: () => SessionUser | null;
  setSessionUser: (user: SessionUser | null) => void;
}

/**
 * Handles Register Ipc.
 */
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

  const lockIdentity = (user: SessionUser) => ({
    clientId: state.clientPresence.getClientId(),
    computerName: state.clientPresence.getComputerName(),
    userName: user.name,
  });

  const getBaseDir = (): string => resolveEinsatzBaseDir(state.settingsStore.get().dbPath ?? state.getDefaultDbPath());
  const getRecentDbPaths = (): string[] => state.settingsStore.get().recentEinsatzDbPaths ?? [];
  const getUsageByPath = (): Record<string, string> => state.settingsStore.get().recentEinsatzUsageByPath ?? {};

  const persistRecentDbPaths = (dbPaths: string[]): void => {
    const unique = Array.from(new Set(dbPaths)).slice(0, 5);
    state.settingsStore.set({ recentEinsatzDbPaths: unique });
  };

  const rememberRecentDbPath = (dbPath: string, einsatzId?: string): void => {
    const next = [dbPath, ...getRecentDbPaths().filter((item) => item !== dbPath)];
    persistRecentDbPaths(next);
    const nextUsage = {
      ...getUsageByPath(),
      [dbPath]: new Date().toISOString(),
    };
    state.settingsStore.set({
      recentEinsatzUsageByPath: nextUsage,
      lastOpenedEinsatzId: einsatzId,
    });
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
      const usage = getUsageByPath();
      const nextUsage: Record<string, string> = {};
      for (const dbPath of valid) {
        if (usage[dbPath]) {
          nextUsage[dbPath] = usage[dbPath];
        }
      }
      state.settingsStore.set({ recentEinsatzUsageByPath: nextUsage });
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

  const openEinsatzByPathForUser = (selected: string, user: SessionUser): EinsatzListItem => {
    debugSync('einsatz', 'open-by-path:start', { selected, user: user.name });
    const nextContext = openDatabaseWithRetry(selected);
    try {
      ensureDefaultAdmin(nextContext);
      const einsatzMeta = listEinsaetzeFromContext(nextContext)[0] ?? readPrimaryEinsatzFromDbFile(selected);
      if (!einsatzMeta) {
        const fileName = path.basename(selected).toLowerCase();
        if (fileName.startsWith('_system.')) {
          throw new Error('Die gewählte Datei ist die Systemdatenbank (_system). Bitte eine Einsatzdatei öffnen.');
        }
        throw new Error(
          'Die gewählte Datei enthält keinen gültigen Einsatz. Bitte die originale Einsatzdatei (.s1control) auswählen.',
        );
      }

      const dbUser = ensureSessionUserRecord(nextContext, user);
      state.setSessionUser(dbUser);
      state.setDbContext(nextContext);
      state.clientPresence.start(nextContext);
      state.einsatzSync.setContext({ dbPath: nextContext.path, einsatzId: einsatzMeta.id });
      state.backupCoordinator.start(nextContext);
      rememberRecentDbPath(selected, einsatzMeta.id);
      state.settingsStore.set({ dbPath: path.dirname(selected) });
      debugSync('einsatz', 'open-by-path:ok', {
        selected,
        einsatzId: einsatzMeta.id,
        dbPath: nextContext.path,
      });
      return einsatzMeta;
    } catch (error) {
      try {
        nextContext.sqlite.close();
      } catch {
        // ignore close errors on failed open flow
      }
      throw error;
    }
  };

  const notifyEinsatzChanged = (einsatzId: string, reason: string, dbPath = state.getDbContext().path): void => {
    state.einsatzSync.broadcastChange({ einsatzId, dbPath, reason });
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
      return {
        dbPath: stored.dbPath ?? state.getDefaultDbPath(),
        lanPeerUpdatesEnabled: stored.lanPeerUpdatesEnabled ?? false,
      };
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
      state.clientPresence.start(nextContext);
      state.einsatzSync.setContext({ dbPath: nextContext.path, einsatzId: null });
      state.settingsStore.set({ dbPath: baseDir });
      return {
        dbPath: baseDir,
        lanPeerUpdatesEnabled: state.settingsStore.get().lanPeerUpdatesEnabled ?? false,
      };
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.SET_LAN_PEER_UPDATES_ENABLED,
    wrap(async (enabled: boolean) => {
      state.settingsStore.set({ lanPeerUpdatesEnabled: enabled });
      state.updater.setLanPeerEnabled(enabled);
      const stored = state.settingsStore.get();
      return {
        dbPath: stored.dbPath ?? state.getDefaultDbPath(),
        lanPeerUpdatesEnabled: stored.lanPeerUpdatesEnabled ?? false,
      };
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EINSAETZE,
    wrap(async () => {
      return listEinsaetzeFromDbPathsWithUsage(getValidRecentDbPaths(), getUsageByPath());
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
      state.clientPresence.start(nextContext);
      state.einsatzSync.setContext({ dbPath: nextContext.path, einsatzId });
      state.backupCoordinator.start(nextContext);
      rememberRecentDbPath(dbPath, einsatzId);
      state.settingsStore.set({ dbPath: path.dirname(dbPath) });
      return true;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ_BY_PATH,
    wrap(async (dbPath: string) => {
      const user = requireUser();
      return openEinsatzByPathForUser(dbPath, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_EINSATZ_DIALOG,
    wrap(async () => {
      const user = requireUser();
      const result = await dialog.showOpenDialog({
        title: 'Einsatz-Datei öffnen',
        defaultPath: getBaseDir(),
        filters: [
          { name: 'S1-Control Einsatzdatei', extensions: ['s1control'] },
          { name: 'Legacy SQLite', extensions: ['sqlite'] },
        ],
        properties: ['openFile'],
      });

      const selected = result.filePaths[0];
      if (result.canceled || !selected) {
        debugSync('einsatz', 'open-dialog:cancel');
        return null;
      }
      debugSync('einsatz', 'open-dialog:selected', { selected });

      return openEinsatzByPathForUser(selected, user);
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CONSUME_PENDING_OPEN_FILE,
    wrap(async () => state.consumePendingOpenFilePath()),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINSATZ,
    wrap(async (input: Parameters<RendererApi['createEinsatz']>[0]) => {
      const user = requireUser();
      const created = createEinsatzInOwnDatabase(getBaseDir(), input, user);
      const dbUser = ensureSessionUserRecord(created.ctx, user);
      state.setSessionUser(dbUser);
      state.setDbContext(created.ctx);
      state.clientPresence.start(created.ctx);
      state.einsatzSync.setContext({ dbPath: created.ctx.path, einsatzId: created.einsatz.id });
      state.backupCoordinator.start(created.ctx);
      if (created.einsatz.dbPath) {
        rememberRecentDbPath(created.einsatz.dbPath, created.einsatz.id);
      }
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
        filters: [
          { name: 'S1-Control Einsatzdatei', extensions: ['s1control'] },
          { name: 'Legacy SQLite', extensions: ['sqlite'] },
        ],
      });

      const selected = saveResult.filePath;
      if (saveResult.canceled || !selected) {
        debugSync('einsatz', 'create-dialog:cancel');
        return null;
      }

      const normalized =
        selected.toLowerCase().endsWith('.s1control') || selected.toLowerCase().endsWith('.sqlite')
          ? selected
          : `${selected}.s1control`;
      debugSync('einsatz', 'create-dialog:selected', { selected, normalized });
      const created = createEinsatzInOwnDatabase(path.dirname(normalized), input, user, normalized);
      const dbUser = ensureSessionUserRecord(created.ctx, user);
      state.setSessionUser(dbUser);
      state.setDbContext(created.ctx);
      state.clientPresence.start(created.ctx);
      state.einsatzSync.setContext({ dbPath: created.ctx.path, einsatzId: created.einsatz.id });
      state.backupCoordinator.start(created.ctx);
      rememberRecentDbPath(normalized, created.einsatz.id);
      state.settingsStore.set({ dbPath: path.dirname(normalized) });
      debugSync('einsatz', 'create-dialog:ok', {
        einsatzId: created.einsatz.id,
        dbPath: normalized,
      });
      return created.einsatz;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.ARCHIVE_EINSATZ,
    wrap(async (einsatzId: string) => {
      requireUser();
      archiveEinsatz(state.getDbContext(), einsatzId);
      notifyEinsatzChanged(einsatzId, 'archive-einsatz');
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
      const abschnitt = createAbschnitt(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'create-abschnitt');
      return abschnitt;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_ABSCHNITT,
    wrap(async (input: Parameters<RendererApi['updateAbschnitt']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'ABSCHNITT', entityId: input.abschnittId },
        lockIdentity(user),
      );
      updateAbschnitt(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'update-abschnitt');
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
      notifyEinsatzChanged(input.einsatzId, 'create-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['updateEinheit']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einheitId },
        lockIdentity(user),
      );
      updateEinheit(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'update-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['createFahrzeug']>[0]) => {
      requireUser();
      createFahrzeug(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'create-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['updateFahrzeug']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'FAHRZEUG', entityId: input.fahrzeugId },
        lockIdentity(user),
      );
      updateFahrzeug(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'update-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EINHEIT_HELFER,
    wrap(async (einheitId: string) => listEinheitHelfer(state.getDbContext(), einheitId)),
  );

  ipcMain.handle(
    IPC_CHANNEL.CREATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['createEinheitHelfer']>[0]) => {
      const user = requireUser();
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: input.einsatzEinheitId },
        lockIdentity(user),
      );
      createEinheitHelfer(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'create-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UPDATE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['updateEinheitHelfer']>[0]) => {
      const user = requireUser();
      const helfer = state
        .getDbContext()
        .db.select({ einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId })
        .from(einsatzEinheitHelfer)
        .where(eq(einsatzEinheitHelfer.id, input.helferId))
        .get();
      if (!helfer) {
        throw new Error('Helfer nicht gefunden.');
      }
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: helfer.einsatzEinheitId },
        lockIdentity(user),
      );
      updateEinheitHelfer(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'update-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.DELETE_EINHEIT_HELFER,
    wrap(async (input: Parameters<RendererApi['deleteEinheitHelfer']>[0]) => {
      const user = requireUser();
      const helfer = state
        .getDbContext()
        .db.select({ einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId })
        .from(einsatzEinheitHelfer)
        .where(eq(einsatzEinheitHelfer.id, input.helferId))
        .get();
      if (!helfer) {
        throw new Error('Helfer nicht gefunden.');
      }
      ensureRecordEditLockOwnership(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: 'EINHEIT', entityId: helfer.einsatzEinheitId },
        lockIdentity(user),
      );
      deleteEinheitHelfer(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'delete-helfer');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.SPLIT_EINHEIT,
    wrap(async (input: Parameters<RendererApi['splitEinheit']>[0]) => {
      requireUser();
      splitEinheit(state.getDbContext(), input);
      notifyEinsatzChanged(input.einsatzId, 'split-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_EINHEIT,
    wrap(async (input: Parameters<RendererApi['moveEinheit']>[0]) => {
      const user = requireUser();
      moveEinheit(state.getDbContext(), input, user);
      notifyEinsatzChanged(input.einsatzId, 'move-einheit');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.MOVE_FAHRZEUG,
    wrap(async (input: Parameters<RendererApi['moveFahrzeug']>[0]) => {
      const user = requireUser();
      moveFahrzeug(state.getDbContext(), input, user);
      notifyEinsatzChanged(input.einsatzId, 'move-fahrzeug');
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.UNDO_LAST,
    wrap(async (einsatzId: string) => {
      const user = requireUser();
      const undone = undoLastCommand(state.getDbContext(), einsatzId, user);
      if (undone) {
        notifyEinsatzChanged(einsatzId, 'undo-command');
      }
      return undone;
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
        filters: [
          { name: 'S1-Control Einsatzdatei', extensions: ['s1control'] },
          { name: 'Legacy SQLite', extensions: ['sqlite'] },
        ],
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
      state.clientPresence.start(nextContext);
      state.einsatzSync.setContext({ dbPath: nextContext.path, einsatzId });
      state.backupCoordinator.start(nextContext);
      notifyEinsatzChanged(einsatzId, 'restore-backup', dbPath);
      return true;
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.ACQUIRE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['acquireEditLock']>[0]) => {
      const user = requireUser();
      return acquireRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.REFRESH_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['refreshEditLock']>[0]) => {
      const user = requireUser();
      return refreshRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.RELEASE_EDIT_LOCK,
    wrap(async (input: Parameters<RendererApi['releaseEditLock']>[0]) => {
      const user = requireUser();
      releaseRecordEditLock(
        state.getDbContext(),
        { einsatzId: input.einsatzId, entityType: input.entityType, entityId: input.entityId },
        lockIdentity(user),
      );
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_EDIT_LOCKS,
    wrap(async (einsatzId: string) => {
      requireUser();
      return listRecordEditLocks(state.getDbContext(), einsatzId, state.clientPresence.getClientId());
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_ACTIVE_CLIENTS,
    wrap(async () => state.clientPresence.listActiveClients()),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_DEBUG_SYNC_LOGS,
    wrap(async () => getDebugSyncLogLines()),
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
    IPC_CHANNEL.GET_PEER_UPDATE_STATUS,
    wrap(async () => state.updater.getPeerUpdateStatus()),
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

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_FORMATION_SVG,
    wrap(async (input: Parameters<RendererApi['getTacticalFormationSvg']>[0]) =>
      getTacticalFormationSvgDataUrl(input.organisation, input.tacticalSignConfig ?? null),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.INFER_TACTICAL_SIGN,
    wrap(async (input: Parameters<RendererApi['inferTacticalSign']>[0]) =>
      inferTacticalSignConfig(input.nameImEinsatz, input.organisation),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.LIST_TACTICAL_SIGN_CATALOG,
    wrap(async (input: Parameters<RendererApi['listTacticalSignCatalog']>[0]) =>
      listTacticalSignCatalog(input.organisation, input.query),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_VEHICLE_SVG,
    wrap(async (input: Parameters<RendererApi['getTacticalVehicleSvg']>[0]) =>
      getTacticalVehicleSvgDataUrl(input.organisation),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_TACTICAL_PERSON_SVG,
    wrap(async (input: Parameters<RendererApi['getTacticalPersonSvg']>[0]) =>
      getTacticalPersonSvgDataUrl(input.organisation, input.rolle),
    ),
  );

  ipcMain.handle(
    IPC_CHANNEL.OPEN_STRENGTH_DISPLAY_WINDOW,
    wrap(async () => {
      await state.strengthDisplay.openWindow();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CLOSE_STRENGTH_DISPLAY_WINDOW,
    wrap(async () => {
      state.strengthDisplay.closeWindow();
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.GET_STRENGTH_DISPLAY_STATE,
    wrap(async () => state.strengthDisplay.getState()),
  );

  ipcMain.handle(
    IPC_CHANNEL.SET_STRENGTH_DISPLAY_STATE,
    wrap(async (input: Parameters<RendererApi['setStrengthDisplayState']>[0]) => {
      state.strengthDisplay.setState(input);
    }),
  );
}
