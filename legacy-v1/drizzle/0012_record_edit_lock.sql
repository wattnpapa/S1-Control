CREATE TABLE IF NOT EXISTS record_edit_lock (
  id TEXT PRIMARY KEY,
  einsatz_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  computer_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (einsatz_id) REFERENCES einsatz(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_record_edit_lock_entity_unique ON record_edit_lock(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_record_edit_lock_einsatz ON record_edit_lock(einsatz_id);
CREATE INDEX IF NOT EXISTS idx_record_edit_lock_expires ON record_edit_lock(expires_at);
