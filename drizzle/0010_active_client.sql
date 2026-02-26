CREATE TABLE IF NOT EXISTS active_client (
  client_id TEXT PRIMARY KEY NOT NULL,
  computer_name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  started_at TEXT NOT NULL,
  is_master INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_active_client_last_seen ON active_client(last_seen);
