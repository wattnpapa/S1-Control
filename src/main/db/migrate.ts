import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

export function runMigrations(sqlite: Database.Database, migrationsDir: string): void {
  sqlite.exec(
    'CREATE TABLE IF NOT EXISTS __migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const appliedRows = sqlite.prepare('SELECT name FROM __migrations').all() as Array<{ name: string }>;
  const applied = new Set(appliedRows.map((row) => row.name));

  const insertMigration = sqlite.prepare(
    'INSERT INTO __migrations (name, applied_at) VALUES (?, ?)',
  );

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const now = new Date().toISOString();

    sqlite.transaction(() => {
      sqlite.exec(sql);
      insertMigration.run(file, now);
    })();
  }
}
