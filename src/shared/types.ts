export type EinsatzStatus = 'AKTIV' | 'BEENDET' | 'ARCHIVIERT';
export type AbschnittSystemTyp = 'FUEST' | 'ANFAHRT' | 'LOGISTIK' | 'NORMAL';
export type EinheitStatus = 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
export type FahrzeugStatus = 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
export type BenutzerRolle = 'ADMIN' | 'S1' | 'FUE_ASS' | 'VIEWER';
export type OrganisationKey =
  | 'THW'
  | 'FEUERWEHR'
  | 'POLIZEI'
  | 'BUNDESWEHR'
  | 'REGIE'
  | 'DRK'
  | 'ASB'
  | 'JOHANNITER'
  | 'MALTESER'
  | 'DLRG'
  | 'BERGWACHT'
  | 'MHD'
  | 'RETTUNGSDIENST_KOMMUNAL'
  | 'SONSTIGE';

export interface TacticalSignConfig {
  grundform?: string;
  fachaufgabe?: string;
  organisation?: string;
  einheit?: string;
  verwaltungsstufe?: string;
  symbol?: string;
  text?: string;
  name?: string;
  organisationsname?: string;
  typ?: 'platoon' | 'group' | 'squad' | 'zugtrupp';
  unit?: string;
  denominator?: string;
  strokeWidth?: number;
}

export interface SessionUser {
  id: string;
  name: string;
  rolle: BenutzerRolle;
}

export interface EinsatzListItem {
  id: string;
  name: string;
  fuestName: string;
  start: string;
  end: string | null;
  status: EinsatzStatus;
  dbPath?: string;
}

export interface AbschnittNode {
  id: string;
  einsatzId: string;
  parentId: string | null;
  name: string;
  systemTyp: AbschnittSystemTyp;
}

export interface EinheitListItem {
  id: string;
  parentEinsatzEinheitId: string | null;
  nameImEinsatz: string;
  organisation: OrganisationKey;
  aktuelleStaerke: number;
  aktuelleStaerkeTaktisch: string | null;
  status: EinheitStatus;
  piktogrammKey: string | null;
  tacticalSignConfigJson: string | null;
  aktuellerAbschnittId: string;
}

export interface FahrzeugListItem {
  id: string;
  name: string;
  kennzeichen: string | null;
  status: FahrzeugStatus;
  piktogrammKey: string | null;
  organisation: OrganisationKey | null;
  aktuelleEinsatzEinheitId: string | null;
  aktuellerAbschnittId: string | null;
}

export interface AbschnittDetails {
  einheiten: EinheitListItem[];
  fahrzeuge: FahrzeugListItem[];
}

export interface AppSettings {
  dbPath: string;
}

export interface ExportResult {
  outputPath: string;
}

export type UpdaterStage =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'unsupported';

export interface UpdaterState {
  stage: UpdaterStage;
  currentVersion?: string;
  latestVersion?: string;
  progressPercent?: number;
  message?: string;
  lastCheckedAt?: string;
  source?: 'electron-updater' | 'github-release';
  inAppDownloadSupported?: boolean;
  inAppDownloadReason?: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
