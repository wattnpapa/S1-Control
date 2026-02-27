import type {
  AbschnittDetails,
  AbschnittNode,
  AppSettings,
  EinsatzListItem,
  ExportResult,
  StrengthDisplayState,
  TacticalSignConfig,
  OrganisationKey,
  SessionUser,
  EinheitHelfer,
  UpdaterState,
  ActiveClientInfo,
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
  systemTyp: 'FUEST' | 'ANFAHRT' | 'LOGISTIK' | 'BEREITSTELLUNGSRAUM' | 'NORMAL';
  parentId?: string | null;
}

export interface UpdateAbschnittInput {
  einsatzId: string;
  abschnittId: string;
  name: string;
  systemTyp: 'FUEST' | 'ANFAHRT' | 'LOGISTIK' | 'BEREITSTELLUNGSRAUM' | 'NORMAL';
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
  tacticalSignConfigJson?: string;
  grFuehrerName?: string;
  ovName?: string;
  ovTelefon?: string;
  ovFax?: string;
  rbName?: string;
  rbTelefon?: string;
  rbFax?: string;
  lvName?: string;
  lvTelefon?: string;
  lvFax?: string;
  bemerkung?: string;
  vegetarierVorhanden?: boolean | null;
  erreichbarkeiten?: string;
}

export interface UpdateEinheitInput {
  einsatzId: string;
  einheitId: string;
  nameImEinsatz: string;
  organisation: 'THW' | 'FEUERWEHR' | 'POLIZEI' | 'BUNDESWEHR' | 'REGIE' | 'DRK' | 'ASB' | 'JOHANNITER' | 'MALTESER' | 'DLRG' | 'BERGWACHT' | 'MHD' | 'RETTUNGSDIENST_KOMMUNAL' | 'SONSTIGE';
  aktuelleStaerke: number;
  aktuelleStaerkeTaktisch?: string;
  status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
  tacticalSignConfigJson?: string;
  grFuehrerName?: string;
  ovName?: string;
  ovTelefon?: string;
  ovFax?: string;
  rbName?: string;
  rbTelefon?: string;
  rbFax?: string;
  lvName?: string;
  lvTelefon?: string;
  lvFax?: string;
  bemerkung?: string;
  vegetarierVorhanden?: boolean | null;
  erreichbarkeiten?: string;
}

export interface CreateFahrzeugInput {
  einsatzId: string;
  name: string;
  aktuelleEinsatzEinheitId: string;
  status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  kennzeichen?: string;
  stammdatenFahrzeugId?: string;
  funkrufname?: string;
  stanKonform?: boolean | null;
  sondergeraet?: string;
  nutzlast?: string;
}

export interface UpdateFahrzeugInput {
  einsatzId: string;
  fahrzeugId: string;
  name: string;
  aktuelleEinsatzEinheitId: string;
  status?: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  kennzeichen?: string;
  funkrufname?: string;
  stanKonform?: boolean | null;
  sondergeraet?: string;
  nutzlast?: string;
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

export interface CreateEinheitHelferInput {
  einsatzId: string;
  einsatzEinheitId: string;
  name: string;
  rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
  geschlecht?: 'MAENNLICH' | 'WEIBLICH';
  anzahl?: number;
  funktion?: string;
  telefon?: string;
  erreichbarkeit?: string;
  vegetarisch?: boolean;
  bemerkung?: string;
}

export interface UpdateEinheitHelferInput {
  einsatzId: string;
  helferId: string;
  name: string;
  rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
  geschlecht?: 'MAENNLICH' | 'WEIBLICH';
  anzahl?: number;
  funktion?: string;
  telefon?: string;
  erreichbarkeit?: string;
  vegetarisch?: boolean;
  bemerkung?: string;
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
  tacticalSignConfigJson?: string;
}

export interface RendererApi {
  getSession(): Promise<SessionUser | null>;
  login(input: LoginInput): Promise<SessionUser>;
  logout(): Promise<void>;
  getSettings(): Promise<AppSettings>;
  setDbPath(path: string): Promise<AppSettings>;
  openEinsatz(einsatzId: string): Promise<boolean>;
  openEinsatzByPath(dbPath: string): Promise<EinsatzListItem>;
  openEinsatzWithDialog(): Promise<EinsatzListItem | null>;
  consumePendingOpenFilePath(): Promise<string | null>;
  listEinsaetze(): Promise<EinsatzListItem[]>;
  createEinsatz(input: CreateEinsatzInput): Promise<EinsatzListItem>;
  createEinsatzWithDialog(input: CreateEinsatzInput): Promise<EinsatzListItem | null>;
  archiveEinsatz(einsatzId: string): Promise<void>;
  listAbschnitte(einsatzId: string): Promise<AbschnittNode[]>;
  createAbschnitt(input: CreateAbschnittInput): Promise<AbschnittNode>;
  updateAbschnitt(input: UpdateAbschnittInput): Promise<void>;
  listAbschnittDetails(einsatzId: string, abschnittId: string): Promise<AbschnittDetails>;
  createEinheit(input: CreateEinheitInput): Promise<void>;
  updateEinheit(input: UpdateEinheitInput): Promise<void>;
  createFahrzeug(input: CreateFahrzeugInput): Promise<void>;
  updateFahrzeug(input: UpdateFahrzeugInput): Promise<void>;
  listEinheitHelfer(einheitId: string): Promise<EinheitHelfer[]>;
  createEinheitHelfer(input: CreateEinheitHelferInput): Promise<void>;
  updateEinheitHelfer(input: UpdateEinheitHelferInput): Promise<void>;
  deleteEinheitHelfer(input: { einsatzId: string; helferId: string }): Promise<void>;
  moveEinheit(input: MoveEinheitInput): Promise<void>;
  moveFahrzeug(input: MoveFahrzeugInput): Promise<void>;
  splitEinheit(input: SplitEinheitInput): Promise<void>;
  undoLastCommand(einsatzId: string): Promise<boolean>;
  hasUndoableCommand(einsatzId: string): Promise<boolean>;
  exportEinsatzakte(einsatzId: string): Promise<ExportResult | null>;
  restoreBackup(einsatzId: string): Promise<boolean>;
  listActiveClients(): Promise<ActiveClientInfo[]>;
  getUpdaterState(): Promise<UpdaterState>;
  checkForUpdates(): Promise<void>;
  downloadUpdate(): Promise<void>;
  installDownloadedUpdate(): Promise<void>;
  openExternalUrl(url: string): Promise<void>;
  getTacticalFormationSvg(input: {
    organisation: OrganisationKey;
    tacticalSignConfig?: TacticalSignConfig | null;
  }): Promise<string>;
  getTacticalVehicleSvg(input: {
    organisation: OrganisationKey;
  }): Promise<string>;
  getTacticalPersonSvg(input: {
    organisation: OrganisationKey;
    rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
  }): Promise<string>;
  openStrengthDisplayWindow(): Promise<void>;
  closeStrengthDisplayWindow(): Promise<void>;
  getStrengthDisplayState(): Promise<StrengthDisplayState>;
  setStrengthDisplayState(input: StrengthDisplayState): Promise<void>;
}

export const IPC_CHANNEL = {
  GET_SESSION: 'session:get',
  LOGIN: 'auth:login',
  LOGOUT: 'auth:logout',
  GET_SETTINGS: 'settings:get',
  SET_DB_PATH: 'settings:set-db-path',
  OPEN_EINSATZ: 'einsatz:open',
  OPEN_EINSATZ_BY_PATH: 'einsatz:open-by-path',
  OPEN_EINSATZ_DIALOG: 'einsatz:open-dialog',
  CONSUME_PENDING_OPEN_FILE: 'app:consume-pending-open-file',
  LIST_EINSAETZE: 'einsatz:list',
  CREATE_EINSATZ: 'einsatz:create',
  CREATE_EINSATZ_DIALOG: 'einsatz:create-dialog',
  ARCHIVE_EINSATZ: 'einsatz:archive',
  LIST_ABSCHNITTE: 'abschnitt:list',
  CREATE_ABSCHNITT: 'abschnitt:create',
  UPDATE_ABSCHNITT: 'abschnitt:update',
  LIST_ABSCHNITT_DETAILS: 'abschnitt:details',
  CREATE_EINHEIT: 'einheit:create',
  UPDATE_EINHEIT: 'einheit:update',
  CREATE_FAHRZEUG: 'fahrzeug:create',
  UPDATE_FAHRZEUG: 'fahrzeug:update',
  LIST_EINHEIT_HELFER: 'einheit-helfer:list',
  CREATE_EINHEIT_HELFER: 'einheit-helfer:create',
  UPDATE_EINHEIT_HELFER: 'einheit-helfer:update',
  DELETE_EINHEIT_HELFER: 'einheit-helfer:delete',
  MOVE_EINHEIT: 'command:move-einheit',
  MOVE_FAHRZEUG: 'command:move-fahrzeug',
  SPLIT_EINHEIT: 'einheit:split',
  UNDO_LAST: 'command:undo-last',
  HAS_UNDO: 'command:has-undo',
  EXPORT_EINSATZAKTE: 'einsatz:export',
  RESTORE_BACKUP: 'einsatz:restore-backup',
  LIST_ACTIVE_CLIENTS: 'clients:list-active',
  GET_UPDATER_STATE: 'updater:get-state',
  CHECK_UPDATES: 'updater:check',
  DOWNLOAD_UPDATE: 'updater:download',
  INSTALL_UPDATE: 'updater:install',
  UPDATER_STATE_CHANGED: 'updater:state-changed',
  PENDING_OPEN_FILE: 'app:pending-open-file',
  OPEN_EXTERNAL_URL: 'app:open-external-url',
  GET_TACTICAL_FORMATION_SVG: 'taktisches-zeichen:formation-svg',
  GET_TACTICAL_VEHICLE_SVG: 'taktisches-zeichen:vehicle-svg',
  GET_TACTICAL_PERSON_SVG: 'taktisches-zeichen:person-svg',
  OPEN_STRENGTH_DISPLAY_WINDOW: 'strength-display:open-window',
  CLOSE_STRENGTH_DISPLAY_WINDOW: 'strength-display:close-window',
  GET_STRENGTH_DISPLAY_STATE: 'strength-display:get-state',
  SET_STRENGTH_DISPLAY_STATE: 'strength-display:set-state',
  STRENGTH_DISPLAY_STATE_CHANGED: 'strength-display:state-changed',
} as const;
