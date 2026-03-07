import type { SessionUser } from '../../shared/types';
import type { EinsatzListItem } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { SettingsStore } from '../db/settings-store';
import { BackupCoordinator } from '../services/backup';
import { ClientPresenceService } from '../services/clients';
import { StrengthDisplayService } from '../services/strength-display';
import { UpdaterService } from '../services/updater';
import { EinsatzSyncService } from '../services/einsatz-sync';

export interface AppState {
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
  clientHeartbeatEnabled: boolean;
  lanPeerUpdatesAllowed: boolean;
}

export type IpcWrapper = <T extends unknown[], R>(
  handler: (...args: T) => R | Promise<R>,
) => (_event: Electron.IpcMainInvokeEvent, ...args: T) => Promise<R>;

export interface RegistrarCommon {
  state: AppState;
  wrap: IpcWrapper;
  requireUser: () => SessionUser;
}

export interface LockIdentity {
  clientId: string;
  computerName: string;
  userName: string;
}

export interface EinsatzIpcHelpers {
  getBaseDir: () => string;
  getUsageByPath: () => Record<string, string>;
  getValidRecentDbPaths: () => string[];
  rememberRecentDbPath: (dbPath: string, einsatzId?: string) => void;
  resolveRecentDbPathByEinsatzId: (einsatzId: string) => string | null;
  openEinsatzByPathForUser: (selected: string, user: SessionUser) => EinsatzListItem;
  notifyEinsatzChanged: (einsatzId: string, reason: string, dbPath?: string) => void;
}

export interface EntityIpcHelpers {
  lockIdentity: (user: SessionUser) => LockIdentity;
  notifyEinsatzChanged: (einsatzId: string, reason: string, dbPath?: string) => void;
}
