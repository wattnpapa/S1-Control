import path from 'node:path';
import { toSafeError } from '../services/errors';
import { openDatabaseWithRetry } from '../db/connection';
import { ensureDefaultAdmin, ensureSessionUserRecord } from '../services/auth';
import { debugSync } from '../services/debug';
import {
  listEinsaetze as listEinsaetzeFromContext,
} from '../services/einsatz';
import {
  readPrimaryEinsatzFromDbFile,
  resolveEinsatzBaseDir,
} from '../services/einsatz-files';
import { registerAuthIpc } from './register-auth-ipc';
import { registerDisplayIpc } from './register-display-ipc';
import { registerEntityIpc } from './register-entity-ipc';
import { registerEinsatzIpc } from './register-einsatz-ipc';
import { registerSettingsIpc } from './register-settings-ipc';
import { registerSyncIpc } from './register-sync-ipc';
import { registerTacticalSignIpc } from './register-tactical-sign-ipc';
import { registerUpdaterIpc } from './register-updater-ipc';
import type { AppState, EntityIpcHelpers, EinsatzIpcHelpers, LockIdentity } from './register-support';

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

  const requireUser = () => {
    const user = state.getSessionUser();
    if (!user) {
      throw new Error('Nicht angemeldet');
    }
    return user;
  };

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

  const openEinsatzByPathForUser: EinsatzIpcHelpers['openEinsatzByPathForUser'] = (selected, user) => {
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

  const notifyEinsatzChanged: EinsatzIpcHelpers['notifyEinsatzChanged'] = (einsatzId, reason, dbPath = state.getDbContext().path) => {
    state.einsatzSync.broadcastChange({ einsatzId, dbPath, reason });
  };

  const lockIdentity = (user: { name: string }): LockIdentity => ({
    clientId: state.clientPresence.getClientId(),
    computerName: state.clientPresence.getComputerName(),
    userName: user.name,
  });

  const common = { state, wrap, requireUser };
  const einsatzHelpers: EinsatzIpcHelpers = {
    getBaseDir,
    getUsageByPath,
    getValidRecentDbPaths,
    rememberRecentDbPath,
    resolveRecentDbPathByEinsatzId,
    openEinsatzByPathForUser,
    notifyEinsatzChanged,
  };
  const entityHelpers: EntityIpcHelpers = {
    lockIdentity,
    notifyEinsatzChanged,
  };

  registerAuthIpc(common);
  registerSettingsIpc(common, einsatzHelpers);
  registerEinsatzIpc(common, einsatzHelpers, entityHelpers);
  registerEntityIpc(common, entityHelpers);
  registerSyncIpc(common);
  registerUpdaterIpc(common);
  registerTacticalSignIpc(common);
  registerDisplayIpc(common);
}
