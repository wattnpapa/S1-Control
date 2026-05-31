export type EinsatzStatus = 'AKTIV' | 'BEENDET' | 'ARCHIVIERT';
export type AbschnittSystemTyp = 'FUEST' | 'ANFAHRT' | 'LOGISTIK' | 'BEREITSTELLUNGSRAUM' | 'NORMAL';
export type EinheitStatus = 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
export type FahrzeugStatus = 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
export type BenutzerRolle = 'ADMIN' | 'S1' | 'FUE_ASS' | 'VIEWER';

export interface JsonEinsatz {
  id: string;
  name: string;
  fuestName: string;
  uebergeordneteFuestName: string | null;
  start: string;
  end: string | null;
  status: EinsatzStatus;
}

export interface JsonAbschnitt {
  id: string;
  einsatzId: string;
  name: string;
  parentId: string | null;
  systemTyp: AbschnittSystemTyp;
  version: number;
}

export interface JsonEinheit {
  id: string;
  einsatzId: string;
  stammdatenEinheitId: string | null;
  parentEinsatzEinheitId: string | null;
  nameImEinsatz: string;
  organisation: string;
  aktuelleStaerke: number;
  aktuelleStaerkeTaktisch: string | null;
  aktuellerAbschnittId: string;
  status: EinheitStatus;
  tacticalSignConfigJson: string | null;
  grFuehrerName: string | null;
  ovName: string | null;
  ovTelefon: string | null;
  ovFax: string | null;
  rbName: string | null;
  rbTelefon: string | null;
  rbFax: string | null;
  lvName: string | null;
  lvTelefon: string | null;
  lvFax: string | null;
  bemerkung: string | null;
  vegetarierVorhanden: boolean | null;
  erreichbarkeiten: string | null;
  erstellt: string;
  aufgeloest: string | null;
  version: number;
}

export interface JsonFahrzeug {
  id: string;
  einsatzId: string;
  parentEinsatzFahrzeugId: string | null;
  aktuelleEinsatzEinheitId: string | null;
  aktuellerAbschnittId: string | null;
  name: string;
  kennzeichen: string | null;
  standardPiktogrammKey: string;
  funkrufname: string | null;
  stanKonform: boolean | null;
  sondergeraet: string | null;
  nutzlast: string | null;
  status: FahrzeugStatus;
  erstellt: string;
  entfernt: string | null;
  version: number;
}

export interface JsonHelfer {
  id: string;
  einsatzId: string;
  einsatzEinheitId: string;
  name: string;
  rolle: string;
  geschlecht: string;
  anzahl: number;
  funktion: string | null;
  telefon: string | null;
  erreichbarkeit: string | null;
  vegetarisch: boolean;
  bemerkung: string | null;
  erstellt: string;
  aktualisiert: string;
}

export interface JsonEinheitBewegung {
  id: string;
  einsatzEinheitId: string;
  vonAbschnittId: string | null;
  nachAbschnittId: string;
  zeitpunkt: string;
  benutzer: string;
  kommentar: string | null;
}

export interface JsonFahrzeugBewegung {
  id: string;
  einsatzFahrzeugId: string;
  vonAbschnittId: string | null;
  nachAbschnittId: string;
  zeitpunkt: string;
  benutzer: string;
}

export interface JsonCommandLogEntry {
  id: string;
  einsatzId: string;
  benutzerId: string;
  commandTyp: string;
  payloadJson: string;
  timestamp: string;
  undone: boolean;
}

export interface JsonStaerkeLogEntry {
  id: string;
  einsatzEinheitId: string;
  alteStaerke: number;
  neueStaerke: number;
  zeitpunkt: string;
  benutzer: string;
}

export interface EinsatzJsonFile {
  schemaVersion: 1;
  writeSeq: number;
  einsatz: JsonEinsatz;
  abschnitte: JsonAbschnitt[];
  einheiten: JsonEinheit[];
  fahrzeuge: JsonFahrzeug[];
  helfer: JsonHelfer[];
  einheitBewegungen: JsonEinheitBewegung[];
  fahrzeugBewegungen: JsonFahrzeugBewegung[];
  commandLog: JsonCommandLogEntry[];
  staerkeLog: JsonStaerkeLogEntry[];
}

export interface JsonStammdatenEinheit {
  id: string;
  name: string;
  organisation: string;
  herkunft: string;
  standardStaerke: number;
  standardPiktogrammKey: string;
}

export interface JsonBenutzer {
  id: string;
  name: string;
  rolle: BenutzerRolle;
  passwortHash: string;
  aktiv: boolean;
}

export interface JsonActiveClient {
  clientId: string;
  computerName: string;
  ipAddress: string;
  dbPath: string;
  lastSeen: string;
  startedAt: string;
  isMaster: boolean;
}

export interface JsonEinsatzMeta {
  id: string;
  name: string;
  filePath: string;
  status: EinsatzStatus;
  start: string;
  end: string | null;
}

export interface JsonRecordEditLock {
  id: string;
  einsatzId: string;
  entityType: string;
  entityId: string;
  clientId: string;
  computerName: string;
  userName: string;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
}

export interface SystemJsonFile {
  schemaVersion: 1;
  stammdatenEinheiten: JsonStammdatenEinheit[];
  benutzer: JsonBenutzer[];
  activeClients: JsonActiveClient[];
  einsatzListe: JsonEinsatzMeta[];
  recordEditLocks: JsonRecordEditLock[];
}

export type EinsatzWriteCtx = {
  einsatz: EinsatzJsonFile;
  system: SystemJsonFile;
};

export type EinsatzReadCtx = {
  einsatz: EinsatzJsonFile;
  system: SystemJsonFile;
};
