import path from 'node:path';
import type { EinsatzJsonFile, SystemJsonFile, EinsatzWriteCtx } from '../json-store/types';
import { readEinsatzFile, writeEinsatzFile } from '../json-store/einsatz-store';
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
  const einsatz = readEinsatzFile(dbPath);
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
