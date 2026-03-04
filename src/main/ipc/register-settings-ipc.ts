import { ipcMain } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipc';
import { openDatabaseWithRetry } from '../db/connection';
import { ensureDefaultAdmin } from '../services/auth';
import { resolveEinsatzBaseDir, resolveSystemDbPath } from '../services/einsatz-files';
import { listEinsaetzeFromDbPathsWithUsage } from '../services/einsatz-files';
import type { EinsatzIpcHelpers, RegistrarCommon } from './register-support';

/**
 * Handles Register Settings Ipc.
 */
export function registerSettingsIpc(common: RegistrarCommon, helpers: EinsatzIpcHelpers): void {
  const { state, wrap } = common;

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
      return listEinsaetzeFromDbPathsWithUsage(helpers.getValidRecentDbPaths(), helpers.getUsageByPath());
    }),
  );

  ipcMain.handle(
    IPC_CHANNEL.CONSUME_PENDING_OPEN_FILE,
    wrap(async () => state.consumePendingOpenFilePath()),
  );
}
