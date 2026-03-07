import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrate';
import { debugSync } from '../services/debug';

export interface DbContext {
  sqlite: Database.Database;
  db: BetterSQLite3Database<typeof schema>;
  path: string;
}

/**
 * Handles Should Use Network Safe SQLite Mode.
 */
function shouldUseNetworkSafeMode(): boolean {
  const forced = process.env.S1_SQLITE_NETWORK_SHARE;
  if (forced === '1' || forced === 'true') {
    return true;
  }
  if (forced === '0' || forced === 'false') {
    return false;
  }
  // Default to network-safe mode for robustness in mixed local/share setups
  // (including mapped drives where share detection is unreliable).
  return true;
}

/**
 * Handles Apply Pragmas.
 */
function applyPragmas(sqlite: Database.Database, dbPath: string): void {
  const networkSafeMode = shouldUseNetworkSafeMode();
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('synchronous = NORMAL');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('wal_autocheckpoint = 1000');
  sqlite.pragma('temp_store = MEMORY');
  sqlite.pragma('foreign_keys = ON');
  debugSync('db', 'pragmas', { dbPath, networkSafeMode });
}

/**
 * Handles Open Database.
 */
function openDatabase(dbPath: string): DbContext {
  const dir = path.dirname(dbPath);
  debugSync('db', 'open:start', { dbPath, dir });
  fs.mkdirSync(dir, { recursive: true });
  fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);

  const fileExists = fs.existsSync(dbPath);
  if (fileExists) {
    // For existing files (especially on SMB), avoid touching content and enforce "must exist".
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  } else {
    // SMB shares can report directory existence before the file handle is fully ready.
    // Touching the target file first reduces create/open races.
    const fd = fs.openSync(dbPath, 'a');
    fs.closeSync(fd);
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
  }

  const sqliteOptions: Database.Options = fileExists
    ? { fileMustExist: true, timeout: 15000 }
    : { timeout: 15000 };
  const sqlite = new Database(dbPath, sqliteOptions);
  applyPragmas(sqlite, dbPath);

  const migrationsDir = resolveMigrationsDir();
  runMigrations(sqlite, migrationsDir);

  const db = drizzle(sqlite, { schema });
  debugSync('db', 'open:ok', { dbPath, fileExists, migrationsDir });
  return { sqlite, db, path: dbPath };
}

/**
 * Handles Resolve Migrations Dir.
 */
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

/**
 * Handles Open Database With Retry.
 */
export function openDatabaseWithRetry(dbPath: string, retries = 12): DbContext {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      debugSync('db', 'open:attempt', { dbPath, attempt, retries });
      return openDatabase(dbPath);
    } catch (error) {
      lastError = error;
      const message = extractErrorMessage(error);
      debugSync('db', 'open:failed', { dbPath, attempt, message });
      if (!canRetryOpenError(message, attempt, retries)) {
        break;
      }
      waitBeforeNextAttempt(attempt);
    }
  }

  const reason = extractErrorMessage(lastError);
  const shareHint = buildShareHint(dbPath);
  throw new Error(`Datenbank konnte nicht geöffnet werden (${dbPath}): ${reason}${shareHint}`);
}

/**
 * Returns a normalized error message.
 */
function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Determines whether an open-database error is retryable.
 */
function canRetryOpenError(message: string, attempt: number, retries: number): boolean {
  const isBusy = message.includes('SQLITE_BUSY') || message.includes('SQLITE_LOCKED') || message.includes('database is locked');
  const isOpenRace = message.includes('unable to open database file');
  return (isBusy || isOpenRace) && attempt < retries;
}

/**
 * Waits with linear backoff before the next retry.
 */
function waitBeforeNextAttempt(attempt: number): void {
  const waitMs = 250 * (attempt + 1);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
}

/**
 * Builds user hint for network-share paths.
 */
function buildShareHint(dbPath: string): string {
  return dbPath.toLowerCase().startsWith('/volumes/')
    ? ' Hinweis: SMB-Share muss fuer beide Clients mit Lese/Schreibrechten gemountet sein.'
    : '';
}
