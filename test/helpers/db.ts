import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DbContext } from '../../src/main/db/connection';
import { openDatabaseWithRetry, systemFilePath } from '../../src/main/db/connection';
import { createEmptyEinsatzFile, writeEinsatzFile } from '../../src/main/json-store/einsatz-store';
import { writeSystemFile } from '../../src/main/json-store/system-store';

export function createDbPath(prefix = 's1-control-test-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return path.join(dir, 'test.s1control');
}

export function openTestDb(dbPath: string, einsatzId: string, status: 'AKTIV' | 'ARCHIVIERT' = 'AKTIV'): DbContext {
  const skeleton = createEmptyEinsatzFile({
    id: einsatzId,
    name: 'Test-Einsatz',
    fuestName: 'Test FüSt',
    uebergeordneteFuestName: null,
    start: new Date().toISOString(),
    end: null,
    status,
  });
  writeEinsatzFile(dbPath, skeleton);
  writeSystemFile(systemFilePath(dbPath), {
    schemaVersion: 1,
    stammdatenEinheiten: [],
    benutzer: [],
    activeClients: [],
    einsatzListe: [],
    recordEditLocks: [],
  });
  return openDatabaseWithRetry(dbPath);
}

export function createTestDb(prefix?: string): DbContext {
  const dbPath = createDbPath(prefix);
  const einsatzId = crypto.randomUUID();
  const skeleton = createEmptyEinsatzFile({
    id: einsatzId,
    name: 'Test-Einsatz',
    fuestName: 'Test FüSt',
    uebergeordneteFuestName: null,
    start: new Date().toISOString(),
    end: null,
    status: 'AKTIV',
  });
  writeEinsatzFile(dbPath, skeleton);
  writeSystemFile(systemFilePath(dbPath), {
    schemaVersion: 1,
    stammdatenEinheiten: [],
    benutzer: [],
    activeClients: [],
    einsatzListe: [],
    recordEditLocks: [],
  });
  return openDatabaseWithRetry(dbPath);
}
