import type {
  AbschnittDetails,
  AbschnittNode,
  AppSettings,
  EinsatzListItem,
  ExportResult,
  SessionUser,
  UpdaterState,
} from './types';

export interface LoginInput {
  name: string;
  passwort: string;
}

export interface CreateEinsatzInput {
  name: string;
  fuestName: string;
}

export interface CreateAbschnittInput {
  einsatzId: string;
  name: string;
  systemTyp: 'FUEST' | 'ANFAHRT' | 'LOGISTIK' | 'NORMAL';
  parentId?: string | null;
}

export interface CreateEinheitInput {
  einsatzId: string;
  nameImEinsatz: string;
  organisation: 'THW' | 'FEUERWEHR' | 'POLIZEI' | 'BUNDESWEHR' | 'REGIE' | 'DRK' | 'ASB' | 'JOHANNITER' | 'MALTESER' | 'DLRG' | 'BERGWACHT' | 'MHD' | 'RETTUNGSDIENST_KOMMUNAL' | 'SONSTIGE';
  aktuelleStaerke: number;
  aktuelleStaerkeTaktisch?: string;
  aktuellerAbschnittId: string;
  status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
  stammdatenEinheitId?: string;
}

export interface CreateFahrzeugInput {
  einsatzId: string;
  name: string;
  aktuelleEinsatzEinheitId: string;
  status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  kennzeichen?: string;
  stammdatenFahrzeugId?: string;
}

export interface MoveEinheitInput {
  einsatzId: string;
  einheitId: string;
  nachAbschnittId: string;
  kommentar?: string;
}

export interface MoveFahrzeugInput {
  einsatzId: string;
  fahrzeugId: string;
  nachAbschnittId: string;
}

export interface SplitEinheitInput {
  einsatzId: string;
  sourceEinheitId: string;
  nameImEinsatz: string;
  organisation?: 'THW' | 'FEUERWEHR' | 'POLIZEI' | 'BUNDESWEHR' | 'REGIE' | 'DRK' | 'ASB' | 'JOHANNITER' | 'MALTESER' | 'DLRG' | 'BERGWACHT' | 'MHD' | 'RETTUNGSDIENST_KOMMUNAL' | 'SONSTIGE';
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
  status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
}

export interface RendererApi {
  getSession(): Promise<SessionUser | null>;
  login(input: LoginInput): Promise<SessionUser>;
  logout(): Promise<void>;
  getSettings(): Promise<AppSettings>;
  setDbPath(path: string): Promise<AppSettings>;
  openEinsatz(einsatzId: string): Promise<boolean>;
  openEinsatzWithDialog(): Promise<EinsatzListItem | null>;
  listEinsaetze(): Promise<EinsatzListItem[]>;
  createEinsatz(input: CreateEinsatzInput): Promise<EinsatzListItem>;
  createEinsatzWithDialog(input: CreateEinsatzInput): Promise<EinsatzListItem | null>;
  archiveEinsatz(einsatzId: string): Promise<void>;
  listAbschnitte(einsatzId: string): Promise<AbschnittNode[]>;
  createAbschnitt(input: CreateAbschnittInput): Promise<AbschnittNode>;
  listAbschnittDetails(einsatzId: string, abschnittId: string): Promise<AbschnittDetails>;
  createEinheit(input: CreateEinheitInput): Promise<void>;
  createFahrzeug(input: CreateFahrzeugInput): Promise<void>;
  moveEinheit(input: MoveEinheitInput): Promise<void>;
  moveFahrzeug(input: MoveFahrzeugInput): Promise<void>;
  splitEinheit(input: SplitEinheitInput): Promise<void>;
  undoLastCommand(einsatzId: string): Promise<boolean>;
  hasUndoableCommand(einsatzId: string): Promise<boolean>;
  exportEinsatzakte(einsatzId: string): Promise<ExportResult | null>;
  restoreBackup(einsatzId: string): Promise<boolean>;
  getUpdaterState(): Promise<UpdaterState>;
  checkForUpdates(): Promise<void>;
  downloadUpdate(): Promise<void>;
  installDownloadedUpdate(): Promise<void>;
}

export const IPC_CHANNEL = {
  GET_SESSION: 'session:get',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  GET_SETTINGS: 'settings:get',
  SET_DB_PATH: 'settings:set-db-path',
  OPEN_EINSATZ: 'einsatz:open',
  OPEN_EINSATZ_DIALOG: 'einsatz:open-dialog',
  LIST_EINSAETZE: 'einsatz:list',
  CREATE_EINSATZ: 'einsatz:create',
  CREATE_EINSATZ_DIALOG: 'einsatz:create-dialog',
  ARCHIVE_EINSATZ: 'einsatz:archive',
  LIST_ABSCHNITTE: 'abschnitt:list',
  CREATE_ABSCHNITT: 'abschnitt:create',
  LIST_ABSCHNITT_DETAILS: 'abschnitt:details',
  CREATE_EINHEIT: 'einheit:create',
  CREATE_FAHRZEUG: 'fahrzeug:create',
  MOVE_EINHEIT: 'command:move-einheit',
  MOVE_FAHRZEUG: 'command:move-fahrzeug',
  SPLIT_EINHEIT: 'einheit:split',
  UNDO_LAST: 'command:undo-last',
  HAS_UNDO: 'command:has-undo',
  EXPORT_EINSATZAKTE: 'einsatz:export',
  RESTORE_BACKUP: 'einsatz:restore-backup',
  GET_UPDATER_STATE: 'updater:get-state',
  CHECK_UPDATES: 'updater:check',
  DOWNLOAD_UPDATE: 'updater:download',
  INSTALL_UPDATE: 'updater:install',
  UPDATER_STATE_CHANGED: 'updater:state-changed',
} as const;
