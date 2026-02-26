CREATE TABLE IF NOT EXISTS einsatz (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  fuest_name TEXT NOT NULL,
  uebergeordnete_fuest_name TEXT,
  start TEXT NOT NULL,
  end TEXT,
  status TEXT NOT NULL CHECK (status IN ('AKTIV', 'BEENDET', 'ARCHIVIERT')) DEFAULT 'AKTIV'
);

CREATE TABLE IF NOT EXISTS einsatz_abschnitt (
  id TEXT PRIMARY KEY,
  einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES einsatz_abschnitt(id),
  system_typ TEXT NOT NULL CHECK (system_typ IN ('FUEST', 'ANFAHRT', 'LOGISTIK', 'BEREITSTELLUNGSRAUM', 'NORMAL')) DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS stammdaten_einheit (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organisation TEXT NOT NULL,
  herkunft TEXT NOT NULL,
  standard_staerke INTEGER NOT NULL DEFAULT 0,
  standard_piktogramm_key TEXT NOT NULL DEFAULT 'bergung'
);

CREATE TABLE IF NOT EXISTS stammdaten_fahrzeug (
  id TEXT PRIMARY KEY,
  stammdaten_einheit_id TEXT REFERENCES stammdaten_einheit(id),
  name TEXT NOT NULL,
  kennzeichen TEXT,
  standard_piktogramm_key TEXT NOT NULL DEFAULT 'mtw'
);

CREATE TABLE IF NOT EXISTS einsatz_einheit (
  id TEXT PRIMARY KEY,
  einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
  stammdaten_einheit_id TEXT REFERENCES stammdaten_einheit(id),
  parent_einsatz_einheit_id TEXT REFERENCES einsatz_einheit(id),
  name_im_einsatz TEXT NOT NULL,
  aktuelle_staerke INTEGER NOT NULL DEFAULT 0,
  aktueller_abschnitt_id TEXT NOT NULL REFERENCES einsatz_abschnitt(id),
  status TEXT NOT NULL CHECK (status IN ('AKTIV', 'IN_BEREITSTELLUNG', 'ABGEMELDET')) DEFAULT 'AKTIV',
  erstellt TEXT NOT NULL,
  aufgeloest TEXT
);

CREATE TABLE IF NOT EXISTS einsatz_fahrzeug (
  id TEXT PRIMARY KEY,
  einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
  stammdaten_fahrzeug_id TEXT REFERENCES stammdaten_fahrzeug(id),
  parent_einsatz_fahrzeug_id TEXT REFERENCES einsatz_fahrzeug(id),
  aktuelle_einsatz_einheit_id TEXT REFERENCES einsatz_einheit(id),
  aktueller_abschnitt_id TEXT REFERENCES einsatz_abschnitt(id),
  status TEXT NOT NULL CHECK (status IN ('AKTIV', 'IN_BEREITSTELLUNG', 'AUSSER_BETRIEB')) DEFAULT 'AKTIV',
  erstellt TEXT NOT NULL,
  entfernt TEXT
);

CREATE TABLE IF NOT EXISTS einsatz_einheit_bewegung (
  id TEXT PRIMARY KEY,
  einsatz_einheit_id TEXT NOT NULL REFERENCES einsatz_einheit(id),
  von_abschnitt_id TEXT REFERENCES einsatz_abschnitt(id),
  nach_abschnitt_id TEXT NOT NULL REFERENCES einsatz_abschnitt(id),
  zeitpunkt TEXT NOT NULL,
  benutzer TEXT NOT NULL,
  kommentar TEXT
);

CREATE TABLE IF NOT EXISTS einsatz_fahrzeug_bewegung (
  id TEXT PRIMARY KEY,
  einsatz_fahrzeug_id TEXT NOT NULL REFERENCES einsatz_fahrzeug(id),
  von_abschnitt_id TEXT REFERENCES einsatz_abschnitt(id),
  nach_abschnitt_id TEXT NOT NULL REFERENCES einsatz_abschnitt(id),
  zeitpunkt TEXT NOT NULL,
  benutzer TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS benutzer (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  rolle TEXT NOT NULL CHECK (rolle IN ('ADMIN', 'S1', 'FUE_ASS', 'VIEWER')),
  passwort_hash TEXT NOT NULL,
  aktiv INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS einsatz_command_log (
  id TEXT PRIMARY KEY,
  einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
  benutzer_id TEXT NOT NULL REFERENCES benutzer(id),
  command_typ TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  undone INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS einsatz_einheit_staerke_log (
  id TEXT PRIMARY KEY,
  einsatz_einheit_id TEXT NOT NULL REFERENCES einsatz_einheit(id),
  alte_staerke INTEGER NOT NULL,
  neue_staerke INTEGER NOT NULL,
  zeitpunkt TEXT NOT NULL,
  benutzer TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_abschnitt_einsatz ON einsatz_abschnitt(einsatz_id);
CREATE INDEX IF NOT EXISTS idx_einheit_abschnitt ON einsatz_einheit(aktueller_abschnitt_id);
CREATE INDEX IF NOT EXISTS idx_fahrzeug_abschnitt ON einsatz_fahrzeug(aktueller_abschnitt_id);
CREATE INDEX IF NOT EXISTS idx_command_einsatz ON einsatz_command_log(einsatz_id, timestamp DESC);
