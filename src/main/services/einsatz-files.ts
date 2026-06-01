import fs from 'node:fs';
import path from 'node:path';
import type { CreateEinsatzInput } from '../../shared/ipc';
import type { EinsatzListItem, SessionUser } from '../../shared/types';
import crypto from 'node:crypto';
import { openDatabaseWithRetry, systemFilePath, type DbContext } from '../db/connection';
import { readEinsatzFile, createEmptyEinsatzFile, writeEinsatzFile } from '../json-store/einsatz-store';
import { readSystemFile, writeSystemFile } from '../json-store/system-store';
import { ensureDefaultAdmin, ensureSessionUserRecord } from './auth';
import { createEinsatz } from './einsatz';

export const EINSATZ_DB_EXT = '.s1control';
const LEGACY_EINSATZ_DB_EXT = '.sqlite';
const SYSTEM_DB_NAME = `_system${EINSATZ_DB_EXT}`;
const LEGACY_SYSTEM_DB_NAME = '_system.sqlite';

function isEinsatzDbFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(EINSATZ_DB_EXT) || lower.endsWith(LEGACY_EINSATZ_DB_EXT);
}

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'einsatz';
}

export function createEinsatzDbFileName(einsatzName: string): string {
  const stamp = Date.now();
  return `${sanitizeFileName(einsatzName)}-${stamp}${EINSATZ_DB_EXT}`;
}

export function resolveEinsatzBaseDir(configuredPath: string): string {
  if (isEinsatzDbFileName(configuredPath)) {
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
    .filter((name) => isEinsatzDbFileName(name) && name !== SYSTEM_DB_NAME && name !== LEGACY_SYSTEM_DB_NAME)
    .map((name) => path.join(baseDir, name));
}

function readPrimaryEinsatzFromJsonFile(dbPath: string): (EinsatzListItem & { dbPath: string }) | null {
  try {
    const data = readEinsatzFile(dbPath);
    const e = data.einsatz;
    return { id: e.id, name: e.name, fuestName: e.fuestName, start: e.start, end: e.end, status: e.status, dbPath };
  } catch {
    return null;
  }
}

export function readPrimaryEinsatzFromDbFile(dbPath: string): EinsatzListItem | null {
  return readPrimaryEinsatzFromJsonFile(dbPath);
}

export function listEinsaetzeFromDirectory(baseDir: string): EinsatzListItem[] {
  const rows = listEinsatzDbFiles(baseDir)
    .map((p) => readPrimaryEinsatzFromJsonFile(p))
    .filter((r): r is NonNullable<typeof r> => r !== null);
  return rows.sort((a, b) => b.start.localeCompare(a.start));
}

export function listEinsaetzeFromDbPaths(dbPaths: string[]): EinsatzListItem[] {
  return listEinsaetzeFromDbPathsWithUsage(dbPaths);
}

export function listEinsaetzeFromDbPathsWithUsage(
  dbPaths: string[],
  usageByPath?: Record<string, string>,
): EinsatzListItem[] {
  const rows: EinsatzListItem[] = [];
  for (const dbPath of dbPaths) {
    const primary = readPrimaryEinsatzFromJsonFile(dbPath);
    if (!primary) {
      continue;
    }
    rows.push(primary);
  }
  return rows.sort((a, b) => {
    const ap = (a as EinsatzListItem & { dbPath?: string }).dbPath;
    const bp = (b as EinsatzListItem & { dbPath?: string }).dbPath;
    const aUsage = ap ? usageByPath?.[ap] : undefined;
    const bUsage = bp ? usageByPath?.[bp] : undefined;
    if (aUsage && bUsage) return bUsage.localeCompare(aUsage);
    if (aUsage) return -1;
    if (bUsage) return 1;
    return b.start.localeCompare(a.start);
  });
}

export function findDbPathForEinsatz(baseDir: string, einsatzId: string): string | null {
  for (const dbPath of listEinsatzDbFiles(baseDir)) {
    const row = readPrimaryEinsatzFromJsonFile(dbPath);
    if (row?.id === einsatzId) {
      return dbPath;
    }
  }
  return null;
}

export function createEinsatzInOwnDatabase(
  baseDir: string,
  input: CreateEinsatzInput,
  sessionUser: SessionUser | null,
  explicitDbPath?: string,
): { einsatz: EinsatzListItem; ctx: DbContext } {
  fs.mkdirSync(baseDir, { recursive: true });

  const dbPath = explicitDbPath ?? path.join(baseDir, createEinsatzDbFileName(input.name));
  const sysPath = systemFilePath(dbPath);

  // Write initial skeleton file so openDatabaseWithRetry can read it.
  const skeleton = createEmptyEinsatzFile({
    id: crypto.randomUUID(),
    name: input.name,
    fuestName: input.fuestName ?? input.name,
    uebergeordneteFuestName: null,
    start: new Date().toISOString(),
    end: null,
    status: 'AKTIV',
  });
  writeEinsatzFile(dbPath, skeleton);

  const ctx = openDatabaseWithRetry(dbPath);

  ensureDefaultAdmin(ctx);
  if (sessionUser) {
    ensureSessionUserRecord(ctx, sessionUser);
  }

  const einsatz = createEinsatz(ctx, input);

  // Persist immediately — no lock contention on a freshly created file.
  writeEinsatzFile(dbPath, ctx.einsatz);
  writeSystemFile(sysPath, ctx.system);

  return { einsatz, ctx };
}
