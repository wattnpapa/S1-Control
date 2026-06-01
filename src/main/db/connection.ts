import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { EinsatzJsonFile, SystemJsonFile, EinsatzWriteCtx } from '../json-store/types';
import { readEinsatzFile, writeEinsatzFile, createEmptyEinsatzFile } from '../json-store/einsatz-store';
import { readSystemFile, writeSystemFile } from '../json-store/system-store';
import { withFileLock } from '../json-store/file-lock';

export interface DbContext extends EinsatzWriteCtx {
  readonly path: string;
  save(): Promise<void>;
}

export function systemFilePath(einsatzPath: string): string {
  return path.join(path.dirname(einsatzPath), '_system.json');
}

export function openDatabaseWithRetry(dbPath: string): DbContext {
  const sysPath = systemFilePath(dbPath);
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  let einsatz: EinsatzJsonFile;
  if (fs.existsSync(dbPath)) {
    try {
      einsatz = readEinsatzFile(dbPath);
    } catch {
      // Existing file is not valid JSON (e.g. old SQLite file) — create fresh skeleton.
      einsatz = createEmptyEinsatzFile({ id: crypto.randomUUID(), name: '', fuestName: '', uebergeordneteFuestName: null, start: new Date().toISOString(), end: null, status: 'AKTIV' });
      writeEinsatzFile(dbPath, einsatz);
    }
  } else {
    einsatz = createEmptyEinsatzFile({ id: crypto.randomUUID(), name: '', fuestName: '', uebergeordneteFuestName: null, start: new Date().toISOString(), end: null, status: 'AKTIV' });
    writeEinsatzFile(dbPath, einsatz);
  }

  const system = readSystemFile(sysPath);
  return buildCtx(dbPath, sysPath, einsatz, system);
}

export function createDbContext(dbPath: string, einsatz: EinsatzJsonFile): DbContext {
  const sysPath = systemFilePath(dbPath);
  const system = readSystemFile(sysPath);
  return buildCtx(dbPath, sysPath, einsatz, system);
}

function buildCtx(dbPath: string, sysPath: string, einsatz: EinsatzJsonFile, system: SystemJsonFile): DbContext {
  const ctx: DbContext = {
    path: dbPath,
    einsatz,
    system,
    async save() {
      await withFileLock(dbPath, () => {
        ctx.einsatz.writeSeq = (ctx.einsatz.writeSeq ?? 0) + 1;
        writeEinsatzFile(dbPath, ctx.einsatz);
      });
      writeSystemFile(sysPath, ctx.system);
    },
  };
  return ctx;
}
