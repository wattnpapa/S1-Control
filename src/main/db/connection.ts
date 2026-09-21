import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  EinsatzJsonFile,
  SystemJsonFile,
  EinsatzWriteCtx,
} from '../json-store/types';
import {
  readEinsatzFile,
  writeEinsatzFile,
  createEmptyEinsatzFile,
  getFileMtime,
} from '../json-store/einsatz-store';
import { readSystemFile, writeSystemFile } from '../json-store/system-store';
import { withFileLock } from '../json-store/file-lock';

export interface DbContext extends EinsatzWriteCtx {
  readonly path: string;
  /**
   * Schreibt den aktuellen Stand. Wurde die Datei zwischenzeitlich von einer
   * anderen Station geschrieben, bricht der Vorgang ab, statt fremde
   * Änderungen zu überschreiben.
   */
  save(): Promise<void>;
  /**
   * Führt eine Änderung als Lesen-Ändern-Schreiben unter Dateisperre aus:
   * fremde Änderungen werden vorher übernommen, danach wird geschrieben.
   */
  mutate<T>(fn: () => T): Promise<T>;
  /** Liest den Stand von der Freigabe neu ein, wenn die Datei sich geändert hat. */
  reload(): boolean;
  /** writeSeq des zuletzt gelesenen Standes. */
  baseWriteSeq(): number;
}

export class EinsatzFileConflictError extends Error {
  public readonly code = 'CONFLICT';

  constructor() {
    super(
      'Die Einsatzdatei wurde zwischenzeitlich von einer anderen Station geändert. ' +
        'Der Stand wurde neu geladen — bitte die Eingabe prüfen und erneut speichern.',
    );
    this.name = 'EinsatzFileConflictError';
  }
}

export function systemFilePath(einsatzPath: string): string {
  return path.join(path.dirname(einsatzPath), '_system.json');
}

function freshEinsatzFile(): EinsatzJsonFile {
  return createEmptyEinsatzFile({
    id: crypto.randomUUID(),
    name: '',
    fuestName: '',
    uebergeordneteFuestName: null,
    start: new Date().toISOString(),
    end: null,
    status: 'AKTIV',
  });
}

export function openDatabaseWithRetry(dbPath: string): DbContext {
  const sysPath = systemFilePath(dbPath);
  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  let einsatz: EinsatzJsonFile;
  if (fs.existsSync(dbPath)) {
    try {
      einsatz = readEinsatzFile(dbPath);
    } catch (error) {
      // Eine vorhandene, aber nicht lesbare Datei wird niemals überschrieben:
      // sie kann die einzige Fassung der Einsatzdokumentation sein.
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Die Einsatzdatei "${path.basename(dbPath)}" konnte nicht gelesen werden (${reason}). ` +
          'Die Datei wurde nicht verändert. Bitte eine Sicherung aus dem Unterordner "backups" öffnen ' +
          'oder die Datei prüfen lassen.',
      );
    }
  } else {
    einsatz = freshEinsatzFile();
    writeEinsatzFile(dbPath, einsatz);
  }

  const system = readSystemFile(sysPath);
  return buildCtx(dbPath, sysPath, einsatz, system);
}

export function createDbContext(
  dbPath: string,
  einsatz: EinsatzJsonFile,
): DbContext {
  const sysPath = systemFilePath(dbPath);
  const system = readSystemFile(sysPath);
  return buildCtx(dbPath, sysPath, einsatz, system);
}

function buildCtx(
  dbPath: string,
  sysPath: string,
  einsatz: EinsatzJsonFile,
  system: SystemJsonFile,
): DbContext {
  let baseSeq = einsatz.writeSeq ?? 0;
  let baseMtime = getFileMtime(dbPath);

  /** Liest die Datei innerhalb einer bereits gehaltenen Sperre neu ein. */
  const reloadUnlocked = (): boolean => {
    const mtime = getFileMtime(dbPath);
    if (mtime !== 0 && mtime === baseMtime) {
      // Datei unverändert — kein Lesen nötig.
      return false;
    }
    let onDisk: EinsatzJsonFile;
    try {
      onDisk = readEinsatzFile(dbPath);
    } catch {
      // Nicht lesbar: der Stand im Speicher bleibt unangetastet.
      return false;
    }
    const seq = onDisk.writeSeq ?? 0;
    if (seq === baseSeq) {
      baseMtime = mtime;
      return false;
    }
    ctx.einsatz = onDisk;
    baseSeq = seq;
    baseMtime = getFileMtime(dbPath);
    return true;
  };

  const writeUnlocked = (): void => {
    ctx.einsatz.writeSeq = baseSeq + 1;
    writeEinsatzFile(dbPath, ctx.einsatz);
    baseSeq = ctx.einsatz.writeSeq;
    baseMtime = getFileMtime(dbPath);
  };

  const ctx: DbContext = {
    path: dbPath,
    einsatz,
    system,
    baseWriteSeq: () => baseSeq,
    reload(): boolean {
      const changed = reloadUnlocked();
      if (changed) {
        ctx.system = readSystemFile(sysPath);
      }
      return changed;
    },
    async mutate<T>(fn: () => T): Promise<T> {
      const result = await withFileLock(dbPath, () => {
        // Fremde Änderungen übernehmen, bevor die eigene Änderung greift.
        if (reloadUnlocked()) {
          ctx.system = readSystemFile(sysPath);
        }
        const value = fn();
        writeUnlocked();
        return value;
      });
      writeSystemFile(sysPath, ctx.system);
      return result;
    },
    async save(): Promise<void> {
      await withFileLock(dbPath, () => {
        let seqOnDisk = baseSeq;
        try {
          seqOnDisk = readEinsatzFile(dbPath).writeSeq ?? 0;
        } catch {
          seqOnDisk = baseSeq;
        }
        if (seqOnDisk !== baseSeq) {
          // Fremder Schreibvorgang dazwischen: eigenen Stand nicht darüberlegen.
          reloadUnlocked();
          throw new EinsatzFileConflictError();
        }
        writeUnlocked();
      });
      writeSystemFile(sysPath, ctx.system);
    },
  };
  return ctx;
}
