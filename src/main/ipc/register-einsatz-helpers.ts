import path from 'node:path';
import { openDatabaseWithRetry } from '../db/connection';
import { ensureDefaultAdmin, ensureSessionUserRecord } from '../services/auth';
import { debugSync } from '../services/debug';
import { listEinsaetze as listEinsaetzeFromContext } from '../services/einsatz';
import { readPrimaryEinsatzFromDbFile, resolveEinsatzBaseDir } from '../services/einsatz-files';
import type { AppState, EntityIpcHelpers, EinsatzIpcHelpers, LockIdentity } from './register-support';

/**
 * Persists recent database path usage in settings store.
 */
function persistRecentDbPaths(state: AppState, dbPaths: string[]): void {
  const unique = Array.from(new Set(dbPaths)).slice(0, 5);
  state.settingsStore.set({ recentEinsatzDbPaths: unique });
}

/**
 * Reads recent deployment path list from settings store.
 */
function getRecentDbPaths(state: AppState): string[] {
  return state.settingsStore.get().recentEinsatzDbPaths ?? [];
}

/**
 * Reads recent usage map from settings store.
 */
function getUsageByPath(state: AppState): Record<string, string> {
  return state.settingsStore.get().recentEinsatzUsageByPath ?? {};
}

/**
 * Remembers one recently used deployment database path.
 */
function rememberRecentDbPath(state: AppState, dbPath: string, einsatzId?: string): void {
  const next = [dbPath, ...getRecentDbPaths(state).filter((item) => item !== dbPath)];
  persistRecentDbPaths(state, next);
  const nextUsage = {
    ...getUsageByPath(state),
    [dbPath]: new Date().toISOString(),
  };
  state.settingsStore.set({
    recentEinsatzUsageByPath: nextUsage,
    lastOpenedEinsatzId: einsatzId,
  });
}

/**
 * Filters invalid recent database files and updates settings store.
 */
function getValidRecentDbPaths(state: AppState): string[] {
  const knownDbPaths = getRecentDbPaths(state);
  const valid: string[] = [];
  for (const dbPath of knownDbPaths) {
    if (!readPrimaryEinsatzFromDbFile(dbPath)) {
      continue;
    }
    valid.push(dbPath);
  }
  if (valid.length !== knownDbPaths.length) {
    persistRecentDbPaths(state, valid);
    const usage = getUsageByPath(state);
    const nextUsage: Record<string, string> = {};
    for (const dbPath of valid) {
      if (usage[dbPath]) {
        nextUsage[dbPath] = usage[dbPath];
      }
    }
    state.settingsStore.set({ recentEinsatzUsageByPath: nextUsage });
  }
  return valid;
}

/**
 * Resolves a recent db path by primary Einsatz id.
 */
function resolveRecentDbPathByEinsatzId(state: AppState, einsatzId: string): string | null {
  for (const dbPath of getValidRecentDbPaths(state)) {
    const einsatz = readPrimaryEinsatzFromDbFile(dbPath);
    if (einsatz?.id === einsatzId) {
      return dbPath;
    }
  }
  return null;
}

/**
 * Opens an einsatz database file and wires process state to the opened context.
 */
function openEinsatzByPathForUser(state: AppState, selected: string, user: { name: string }) {
  const requestTs = Date.now();
  debugSync('einsatz', 'open-by-path:start', { selected, user: user.name, requestTs });
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
    if (state.clientHeartbeatEnabled && !state.perfSafeMode) {
      state.clientPresence.start(nextContext);
    }
    state.einsatzSync.setContext({ dbPath: nextContext.path, einsatzId: einsatzMeta.id });
    if (!state.perfSafeMode) {
      state.backupCoordinator.start(nextContext);
    }
    rememberRecentDbPath(state, selected, einsatzMeta.id);
    state.settingsStore.set({ dbPath: path.dirname(selected) });
    debugSync('einsatz', 'open-by-path:ok', {
      selected,
      einsatzId: einsatzMeta.id,
      dbPath: nextContext.path,
      requestTs,
      readyTs: Date.now(),
      latencyMs: Date.now() - requestTs,
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
}

/**
 * Builds einsatz helper callbacks for IPC registrars.
 */
export function createEinsatzIpcHelpers(state: AppState): EinsatzIpcHelpers {
  return {
    getBaseDir: (): string => resolveEinsatzBaseDir(state.settingsStore.get().dbPath ?? state.getDefaultDbPath()),
    getUsageByPath: () => getUsageByPath(state),
    getValidRecentDbPaths: () => getValidRecentDbPaths(state),
    rememberRecentDbPath: (dbPath: string, einsatzId?: string) => {
      rememberRecentDbPath(state, dbPath, einsatzId);
    },
    resolveRecentDbPathByEinsatzId: (einsatzId: string): string | null => resolveRecentDbPathByEinsatzId(state, einsatzId),
    openEinsatzByPathForUser: (selected, user) => openEinsatzByPathForUser(state, selected, user),
    notifyEinsatzChanged: (einsatzId, reason, dbPath = state.getDbContext().path) => {
      state.einsatzReadCache.invalidateEinsatz(state.getDbContext(), einsatzId);
      state.einsatzSync.broadcastChange({ einsatzId, dbPath, reason });
    },
  };
}

/**
 * Builds entity helper callbacks for lock identity and sync notifications.
 */
export function createEntityIpcHelpers(state: AppState, notifyEinsatzChanged: EinsatzIpcHelpers['notifyEinsatzChanged']): EntityIpcHelpers {
  const lockIdentity = (user: { name: string }): LockIdentity => ({
    clientId: state.clientPresence.getClientId(),
    computerName: state.clientPresence.getComputerName(),
    userName: user.name,
  });
  return {
    lockIdentity,
    notifyEinsatzChanged,
  };
}
