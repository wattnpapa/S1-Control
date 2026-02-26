import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const einsatzStatusValues = ['AKTIV', 'BEENDET', 'ARCHIVIERT'] as const;
export const abschnittSystemTypValues = ['FUEST', 'ANFAHRT', 'LOGISTIK', 'BEREITSTELLUNGSRAUM', 'NORMAL'] as const;
export const einheitStatusValues = ['AKTIV', 'IN_BEREITSTELLUNG', 'ABGEMELDET'] as const;
export const fahrzeugStatusValues = ['AKTIV', 'IN_BEREITSTELLUNG', 'AUSSER_BETRIEB'] as const;
export const benutzerRolleValues = ['ADMIN', 'S1', 'FUE_ASS', 'VIEWER'] as const;

export const einsatz = sqliteTable('einsatz', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  fuestName: text('fuest_name').notNull(),
  uebergeordneteFuestName: text('uebergeordnete_fuest_name'),
  start: text('start').notNull(),
  end: text('end'),
  status: text('status', { enum: einsatzStatusValues }).notNull().default('AKTIV'),
});

export const einsatzAbschnitt = sqliteTable('einsatz_abschnitt', {
  id: text('id').primaryKey(),
  einsatzId: text('einsatz_id').notNull().references(() => einsatz.id),
  name: text('name').notNull(),
  parentId: text('parent_id').references(() => einsatzAbschnitt.id),
  systemTyp: text('system_typ', { enum: abschnittSystemTypValues }).notNull().default('NORMAL'),
});

export const stammdatenEinheit = sqliteTable('stammdaten_einheit', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  organisation: text('organisation').notNull(),
  herkunft: text('herkunft').notNull(),
  standardStaerke: integer('standard_staerke').notNull().default(0),
  standardPiktogrammKey: text('standard_piktogramm_key').notNull().default('bergung'),
});

export const stammdatenFahrzeug = sqliteTable('stammdaten_fahrzeug', {
  id: text('id').primaryKey(),
  stammdatenEinheitId: text('stammdaten_einheit_id').references(() => stammdatenEinheit.id),
  name: text('name').notNull(),
  kennzeichen: text('kennzeichen'),
  standardPiktogrammKey: text('standard_piktogramm_key').notNull().default('mtw'),
});

export const einsatzEinheit = sqliteTable('einsatz_einheit', {
  id: text('id').primaryKey(),
  einsatzId: text('einsatz_id').notNull().references(() => einsatz.id),
  stammdatenEinheitId: text('stammdaten_einheit_id').references(() => stammdatenEinheit.id),
  parentEinsatzEinheitId: text('parent_einsatz_einheit_id').references(() => einsatzEinheit.id),
  nameImEinsatz: text('name_im_einsatz').notNull(),
  organisation: text('organisation').notNull().default('THW'),
  aktuelleStaerke: integer('aktuelle_staerke').notNull().default(0),
  aktuelleStaerkeTaktisch: text('aktuelle_staerke_taktisch'),
  aktuellerAbschnittId: text('aktueller_abschnitt_id').notNull().references(() => einsatzAbschnitt.id),
  status: text('status', { enum: einheitStatusValues }).notNull().default('AKTIV'),
  tacticalSignConfigJson: text('tactical_sign_config_json'),
  grFuehrerName: text('gr_fuehrer_name'),
  ovName: text('ov_name'),
  ovTelefon: text('ov_telefon'),
  ovFax: text('ov_fax'),
  rbName: text('rb_name'),
  rbTelefon: text('rb_telefon'),
  rbFax: text('rb_fax'),
  lvName: text('lv_name'),
  lvTelefon: text('lv_telefon'),
  lvFax: text('lv_fax'),
  bemerkung: text('bemerkung'),
  vegetarierVorhanden: integer('vegetarier_vorhanden', { mode: 'boolean' }),
  erreichbarkeiten: text('erreichbarkeiten'),
  erstellt: text('erstellt').notNull(),
  aufgeloest: text('aufgeloest'),
});

export const einsatzFahrzeug = sqliteTable('einsatz_fahrzeug', {
  id: text('id').primaryKey(),
  einsatzId: text('einsatz_id').notNull().references(() => einsatz.id),
  stammdatenFahrzeugId: text('stammdaten_fahrzeug_id').references(() => stammdatenFahrzeug.id),
  parentEinsatzFahrzeugId: text('parent_einsatz_fahrzeug_id').references(() => einsatzFahrzeug.id),
  aktuelleEinsatzEinheitId: text('aktuelle_einsatz_einheit_id').references(() => einsatzEinheit.id),
  aktuellerAbschnittId: text('aktueller_abschnitt_id').references(() => einsatzAbschnitt.id),
  funkrufname: text('funkrufname'),
  stanKonform: integer('stan_konform', { mode: 'boolean' }),
  sondergeraet: text('sondergeraet'),
  nutzlast: text('nutzlast'),
  status: text('status', { enum: fahrzeugStatusValues }).notNull().default('AKTIV'),
  erstellt: text('erstellt').notNull(),
  entfernt: text('entfernt'),
});

export const einsatzEinheitBewegung = sqliteTable('einsatz_einheit_bewegung', {
  id: text('id').primaryKey(),
  einsatzEinheitId: text('einsatz_einheit_id').notNull().references(() => einsatzEinheit.id),
  vonAbschnittId: text('von_abschnitt_id').references(() => einsatzAbschnitt.id),
  nachAbschnittId: text('nach_abschnitt_id').notNull().references(() => einsatzAbschnitt.id),
  zeitpunkt: text('zeitpunkt').notNull(),
  benutzer: text('benutzer').notNull(),
  kommentar: text('kommentar'),
});

export const einsatzFahrzeugBewegung = sqliteTable('einsatz_fahrzeug_bewegung', {
  id: text('id').primaryKey(),
  einsatzFahrzeugId: text('einsatz_fahrzeug_id').notNull().references(() => einsatzFahrzeug.id),
  vonAbschnittId: text('von_abschnitt_id').references(() => einsatzAbschnitt.id),
  nachAbschnittId: text('nach_abschnitt_id').notNull().references(() => einsatzAbschnitt.id),
  zeitpunkt: text('zeitpunkt').notNull(),
  benutzer: text('benutzer').notNull(),
});

export const benutzer = sqliteTable('benutzer', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  rolle: text('rolle', { enum: benutzerRolleValues }).notNull(),
  passwortHash: text('passwort_hash').notNull(),
  aktiv: integer('aktiv', { mode: 'boolean' }).notNull().default(true),
});

export const einsatzCommandLog = sqliteTable('einsatz_command_log', {
  id: text('id').primaryKey(),
  einsatzId: text('einsatz_id').notNull().references(() => einsatz.id),
  benutzerId: text('benutzer_id').notNull().references(() => benutzer.id),
  commandTyp: text('command_typ').notNull(),
  payloadJson: text('payload_json').notNull(),
  timestamp: text('timestamp').notNull(),
  undone: integer('undone', { mode: 'boolean' }).notNull().default(false),
});

export const einsatzEinheitStaerkeLog = sqliteTable('einsatz_einheit_staerke_log', {
  id: text('id').primaryKey(),
  einsatzEinheitId: text('einsatz_einheit_id').notNull().references(() => einsatzEinheit.id),
  alteStaerke: integer('alte_staerke').notNull(),
  neueStaerke: integer('neue_staerke').notNull(),
  zeitpunkt: text('zeitpunkt').notNull(),
  benutzer: text('benutzer').notNull(),
});

export const einsatzEinheitHelfer = sqliteTable('einsatz_einheit_helfer', {
  id: text('id').primaryKey(),
  einsatzId: text('einsatz_id').notNull().references(() => einsatz.id),
  einsatzEinheitId: text('einsatz_einheit_id').notNull().references(() => einsatzEinheit.id),
  name: text('name').notNull(),
  rolle: text('rolle').notNull().default('HELFER'),
  geschlecht: text('geschlecht').notNull().default('MAENNLICH'),
  anzahl: integer('anzahl').notNull().default(1),
  funktion: text('funktion'),
  telefon: text('telefon'),
  erreichbarkeit: text('erreichbarkeit'),
  vegetarisch: integer('vegetarisch', { mode: 'boolean' }).notNull().default(false),
  bemerkung: text('bemerkung'),
  erstellt: text('erstellt').notNull(),
  aktualisiert: text('aktualisiert').notNull(),
});

export const activeClient = sqliteTable('active_client', {
  clientId: text('client_id').primaryKey(),
  computerName: text('computer_name').notNull(),
  ipAddress: text('ip_address').notNull(),
  lastSeen: text('last_seen').notNull(),
  startedAt: text('started_at').notNull(),
  isMaster: integer('is_master', { mode: 'boolean' }).notNull().default(false),
});
