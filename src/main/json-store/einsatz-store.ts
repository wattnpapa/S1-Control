import fs from 'node:fs';
import type { EinsatzJsonFile } from './types';
import { withFileLock } from './file-lock';

export function readEinsatzFile(filePath: string): EinsatzJsonFile {
  // Peek at the first byte: valid JSON starts with '{'.
  // This avoids loading large legacy SQLite files into memory before failing.
  const fd = fs.openSync(filePath, 'r');
  const header = Buffer.allocUnsafe(1);
  fs.readSync(fd, header, 0, 1, 0);
  fs.closeSync(fd);
  if (header[0] !== 0x7b) {
    throw new Error(`Not a JSON file: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as EinsatzJsonFile;
}

export function writeEinsatzFile(filePath: string, data: EinsatzJsonFile): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

export async function mutateEinsatzFile(
  filePath: string,
  mutate: (data: EinsatzJsonFile) => void,
): Promise<EinsatzJsonFile> {
  return withFileLock(filePath, () => {
    const data = readEinsatzFile(filePath);
    mutate(data);
    data.writeSeq = (data.writeSeq ?? 0) + 1;
    writeEinsatzFile(filePath, data);
    return data;
  });
}

export function getFileMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

export function createEmptyEinsatzFile(einsatz: EinsatzJsonFile['einsatz']): EinsatzJsonFile {
  return {
    schemaVersion: 1,
    writeSeq: 0,
    einsatz,
    abschnitte: [],
    einheiten: [],
    fahrzeuge: [],
    helfer: [],
    einheitBewegungen: [],
    fahrzeugBewegungen: [],
    commandLog: [],
    staerkeLog: [],
  };
}
