import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrate';

export interface DbContext {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
  path: string;
}

function applyPragmas(sqlite: Database.Database): void {
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
}

function openDatabase(dbPath: string): DbContext {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const sqlite = new Database(dbPath);
  applyPragmas(sqlite);

  const migrationsDir = resolveMigrationsDir();
  runMigrations(sqlite, migrationsDir);

  const db = drizzle(sqlite, { schema });
  return { sqlite, db, path: dbPath };
}

function resolveMigrationsDir(): string {
  const candidates = [
    // dist-electron and drizzle are siblings in dev and in packaged app.asar.
    path.resolve(__dirname, '../drizzle'),
    // tests run directly from src/main/db.
    path.resolve(__dirname, '../../../drizzle'),
    path.resolve(process.cwd(), 'drizzle'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0]!;
}

export function openDatabaseWithRetry(dbPath: string, retries = 4): DbContext {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return openDatabase(dbPath);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('SQLITE_BUSY') || attempt === retries) {
        break;
      }
      const waitMs = 250 * (attempt + 1);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Datenbank konnte nicht geöffnet werden: ${reason}`);
}
