CREATE TABLE IF NOT EXISTS einsatz_einheit_helfer (
  id TEXT PRIMARY KEY NOT NULL,
  einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
  einsatz_einheit_id TEXT NOT NULL REFERENCES einsatz_einheit(id),
  name TEXT NOT NULL,
  funktion TEXT,
  telefon TEXT,
  erreichbarkeit TEXT,
  vegetarisch INTEGER NOT NULL DEFAULT 0,
  bemerkung TEXT,
  erstellt TEXT NOT NULL,
  aktualisiert TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_einheit_helfer_einheit ON einsatz_einheit_helfer(einsatz_einheit_id);
