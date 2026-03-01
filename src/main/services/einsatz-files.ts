import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { CreateEinsatzInput } from '../../shared/ipc';
import type { EinsatzListItem, SessionUser } from '../../shared/types';
import { openDatabaseWithRetry, type DbContext } from '../db/connection';
import { ensureDefaultAdmin, ensureSessionUserRecord } from './auth';
import { createEinsatz } from './einsatz';

export const EINSATZ_DB_EXT = '.s1control';
const LEGACY_EINSATZ_DB_EXT = '.sqlite';
const SYSTEM_DB_NAME = `_system${EINSATZ_DB_EXT}`;
const LEGACY_SYSTEM_DB_NAME = '_system.sqlite';

/**
 * Handles Is Einsatz Db File Name.
 */
function isEinsatzDbFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(EINSATZ_DB_EXT) || lower.endsWith(LEGACY_EINSATZ_DB_EXT);
}

/**
 * Handles Sanitize File Name.
 */
function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'einsatz';
}

/**
 * Handles Create Einsatz Db File Name.
 */
export function createEinsatzDbFileName(einsatzName: string): string {
  const stamp = Date.now();
  return `${sanitizeFileName(einsatzName)}-${stamp}${EINSATZ_DB_EXT}`;
}

/**
 * Handles Resolve Einsatz Base Dir.
 */
export function resolveEinsatzBaseDir(configuredPath: string): string {
  if (isEinsatzDbFileName(configuredPath)) {
    return path.dirname(configuredPath);
  }
  return configuredPath;
}

/**
 * Handles Resolve System Db Path.
 */
export function resolveSystemDbPath(baseDir: string): string {
  return path.join(baseDir, SYSTEM_DB_NAME);
}

/**
 * Handles List Einsatz Db Files.
 */
export function listEinsatzDbFiles(baseDir: string): string[] {
  if (!fs.existsSync(baseDir)) {
    return [];
  }

  return fs
    .readdirSync(baseDir)
    .filter((name) => isEinsatzDbFileName(name) && name !== SYSTEM_DB_NAME && name !== LEGACY_SYSTEM_DB_NAME)
    .map((name) => path.join(baseDir, name));
}

/**
 * Handles Read Einsaetze From Db File.
 */
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

/**
 * Handles Read Primary Einsatz From Db File.
 */
export function readPrimaryEinsatzFromDbFile(dbPath: string): EinsatzListItem | null {
  const rows = readEinsaetzeFromDbFile(dbPath);
  if (!rows.length) {
    return null;
  }
  return rows.sort((a, b) => b.start.localeCompare(a.start))[0] ?? null;
}

/**
 * Handles List Einsaetze From Directory.
 */
export function listEinsaetzeFromDirectory(baseDir: string): EinsatzListItem[] {
  const rows = listEinsatzDbFiles(baseDir).flatMap((dbPath) => readEinsaetzeFromDbFile(dbPath));
  return rows.sort((a, b) => b.start.localeCompare(a.start));
}

/**
 * Handles List Einsaetze From Db Paths.
 */
export function listEinsaetzeFromDbPaths(dbPaths: string[]): EinsatzListItem[] {
  return listEinsaetzeFromDbPathsWithUsage(dbPaths);
}

/**
 * Handles List Einsaetze From Db Paths With Usage.
 */
export function listEinsaetzeFromDbPathsWithUsage(
  dbPaths: string[],
  usageByPath?: Record<string, string>,
): EinsatzListItem[] {
  const rows: EinsatzListItem[] = [];
  for (const dbPath of dbPaths) {
    const primary = readPrimaryEinsatzFromDbFile(dbPath);
    if (!primary) {
      continue;
    }
    rows.push({ ...primary, dbPath });
  }
  return rows.sort((a, b) => {
    const aUsage = a.dbPath ? usageByPath?.[a.dbPath] : undefined;
    const bUsage = b.dbPath ? usageByPath?.[b.dbPath] : undefined;
    if (aUsage && bUsage) {
      return bUsage.localeCompare(aUsage);
    }
    if (aUsage) {
      return -1;
    }
    if (bUsage) {
      return 1;
    }
    return b.start.localeCompare(a.start);
  });
}

/**
 * Handles Find Db Path For Einsatz.
 */
export function findDbPathForEinsatz(baseDir: string, einsatzId: string): string | null {
  for (const dbPath of listEinsatzDbFiles(baseDir)) {
    const rows = readEinsaetzeFromDbFile(dbPath);
    if (rows.some((row) => row.id === einsatzId)) {
      return dbPath;
    }
  }
  return null;
}

/**
 * Handles Create Einsatz In Own Database.
 */
export function createEinsatzInOwnDatabase(
  baseDir: string,
  input: CreateEinsatzInput,
  sessionUser: SessionUser | null,
  explicitDbPath?: string,
): { einsatz: EinsatzListItem; ctx: DbContext } {
  fs.mkdirSync(baseDir, { recursive: true });

  const dbPath = explicitDbPath ?? path.join(baseDir, createEinsatzDbFileName(input.name));
  const ctx = openDatabaseWithRetry(dbPath);

  ensureDefaultAdmin(ctx);
  if (sessionUser) {
    ensureSessionUserRecord(ctx, sessionUser);
  }

  const einsatz = createEinsatz(ctx, input);
  return { einsatz, ctx };
}
