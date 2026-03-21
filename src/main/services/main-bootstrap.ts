import { BrowserWindow } from 'electron';
import type { SessionUser } from '../../shared/types';
import type { DbContext } from '../db/connection';
import type { SettingsStore } from '../db/settings-store';
import { registerIpc } from '../ipc/register-ipc';
import type { BackupCoordinator } from './backup';
import type { ClientPresenceService } from './clients';
import type { EinsatzReadCache } from './einsatz-read-cache';
import type { EinsatzSyncService } from './einsatz-sync';
import { debugSync } from './debug';
import type { MainDbBridge } from './main-db-bridge';
import type { StrengthDisplayService } from './strength-display';
import type { UpdaterService } from './updater';

export function registerMainIpc(params: {
  getDbContext: () => DbContext;
  setDbContext: (ctx: DbContext) => void;
  backupCoordinator: BackupCoordinator;
  clientPresence: ClientPresenceService;
  einsatzSync: EinsatzSyncService;
  updater: UpdaterService;
  strengthDisplay: StrengthDisplayService;
  einsatzReadCache: EinsatzReadCache;
  settingsStore: SettingsStore;
  defaultDbPath: string;
  getSessionUser: () => SessionUser | null;
  setSessionUser: (user: SessionUser | null) => void;
  dbBridge: MainDbBridge;
  consumePendingOpenFilePath: () => string | null;
  clientHeartbeatEnabled: boolean;
  lanPeerUpdatesAllowed: boolean;
  perfSafeMode: boolean;
  useDbUtilityProcess: boolean;
}): void {
  registerIpc({
    getDbContext: params.getDbContext,
    setDbContext: params.setDbContext,
    backupCoordinator: params.backupCoordinator,
    clientPresence: params.clientPresence,
    einsatzSync: params.einsatzSync,
    updater: params.updater,
    strengthDisplay: params.strengthDisplay,
    einsatzReadCache: params.einsatzReadCache,
    settingsStore: params.settingsStore,
    getDefaultDbPath: () => params.defaultDbPath,
    consumePendingOpenFilePath: params.consumePendingOpenFilePath,
    getSessionUser: params.getSessionUser,
    setSessionUser: params.setSessionUser,
    clientHeartbeatEnabled: params.clientHeartbeatEnabled,
    lanPeerUpdatesAllowed: params.lanPeerUpdatesAllowed,
    perfSafeMode: params.perfSafeMode,
    useDbUtilityProcess: params.useDbUtilityProcess,
    dbBridge: params.dbBridge,
  });
}

export function scheduleStrengthDisplayPrewarm(params: {
  strengthDisplay: StrengthDisplayService;
  isAppShuttingDown: () => boolean;
  setEarlyTimer: (timer: NodeJS.Timeout | null) => void;
  setRetryTimer: (timer: NodeJS.Timeout | null) => void;
}): void {
  const runPrewarm = (event: 'prewarm-started' | 'prewarm-retry') => {
    try {
      if (params.isAppShuttingDown() || BrowserWindow.getAllWindows().length === 0) {
        return;
      }
      params.strengthDisplay.prewarmWindow();
      debugSync('strength-display', event, params.strengthDisplay.getHealth());
    } catch {
      // best effort prewarm only
    }
  };
  params.setEarlyTimer(
    setTimeout(() => {
      runPrewarm('prewarm-started');
      params.setEarlyTimer(null);
    }, 150),
  );
  params.setRetryTimer(
    setTimeout(() => {
      runPrewarm('prewarm-retry');
      params.setRetryTimer(null);
    }, 1200),
  );
}
