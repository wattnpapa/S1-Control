import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { CreateEinsatzInput } from '../../shared/ipc';
import type { EinsatzListItem, SessionUser } from '../../shared/types';
import { openDatabaseWithRetry, type DbContext } from '../db/connection';
import { ensureDefaultAdmin, ensureSessionUserRecord } from './auth';
import { createEinsatz } from './einsatz';

const SQLITE_EXT = '.sqlite';
const SYSTEM_DB_NAME = '_system.sqlite';

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'einsatz';
}

export function resolveEinsatzBaseDir(configuredPath: string): string {
  if (configuredPath.toLowerCase().endsWith(SQLITE_EXT)) {
    return path.dirname(configuredPath);
  }
  return configuredPath;
}

export function resolveSystemDbPath(baseDir: string): string {
  return path.join(baseDir, SYSTEM_DB_NAME);
}

export function listEinsatzDbFiles(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  return fs
    .readdirSync(baseDir)
    .filter((name) => name.toLowerCase().endsWith(SQLITE_EXT) && name !== SYSTEM_DB_NAME)
    .map((name) => path.join(baseDir, name));
}

function readEinsaetzeFromDbFile(dbPath: string): Array<EinsatzListItem & { dbPath: string }> {
  let sqlite: Database.Database | null = null;
  try {
    sqlite = new Database(dbPath, { readonly: true, fileMustExist: true });
    const rows = sqlite
      .prepare('SELECT id, name, fuest_name as fuestName, start, end, status FROM einsatz ORDER BY start DESC')
      .all() as EinsatzListItem[];
    return rows.map((row) => ({ ...row, dbPath }));
  } catch {
    return [];
  } finally {
    sqlite?.close();
  }
}

export function listEinsaetzeFromDirectory(baseDir: string): EinsatzListItem[] {
  const rows = listEinsatzDbFiles(baseDir).flatMap((dbPath) => readEinsaetzeFromDbFile(dbPath));
  return rows.sort((a, b) => b.start.localeCompare(a.start));
}

export function findDbPathForEinsatz(baseDir: string, einsatzId: string): string | null {
  for (const dbPath of listEinsatzDbFiles(baseDir)) {
    const rows = readEinsaetzeFromDbFile(dbPath);
    if (rows.some((row) => row.id === einsatzId)) {
      return dbPath;
    }
  }
  return null;
}

export function createEinsatzInOwnDatabase(
  baseDir: string,
  input: CreateEinsatzInput,
  sessionUser: SessionUser | null,
): { einsatz: EinsatzListItem; ctx: DbContext } {
  fs.mkdirSync(baseDir, { recursive: true });

  const stamp = Date.now();
  const fileBase = `${sanitizeFileName(input.name)}-${stamp}${SQLITE_EXT}`;
  const dbPath = path.join(baseDir, fileBase);
  const ctx = openDatabaseWithRetry(dbPath);

  ensureDefaultAdmin(ctx);
  if (sessionUser) {
    ensureSessionUserRecord(ctx, sessionUser);
  }

  const einsatz = createEinsatz(ctx, input);
  return { einsatz, ctx };
}
