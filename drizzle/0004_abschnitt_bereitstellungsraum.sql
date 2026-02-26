PRAGMA foreign_keys = OFF;

CREATE TABLE einsatz_abschnitt_new (
  id TEXT PRIMARY KEY NOT NULL,
  einsatz_id TEXT NOT NULL REFERENCES einsatz(id),
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES einsatz_abschnitt_new(id),
  system_typ TEXT NOT NULL CHECK (system_typ IN ('FUEST', 'ANFAHRT', 'LOGISTIK', 'BEREITSTELLUNGSRAUM', 'NORMAL')) DEFAULT 'NORMAL'
);

INSERT INTO einsatz_abschnitt_new (id, einsatz_id, name, parent_id, system_typ)
SELECT id, einsatz_id, name, parent_id, system_typ
FROM einsatz_abschnitt;

DROP TABLE einsatz_abschnitt;
ALTER TABLE einsatz_abschnitt_new RENAME TO einsatz_abschnitt;

PRAGMA foreign_keys = ON;
