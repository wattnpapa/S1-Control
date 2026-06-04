import fs from 'node:fs';
import type { SystemJsonFile } from './types';
import { withFileLock, withFileLockSync } from './file-lock';

function createEmptySystemFile(): SystemJsonFile {
  return {
    schemaVersion: 1,
    stammdatenEinheiten: [],
    benutzer: [],
    activeClients: [],
    einsatzListe: [],
    recordEditLocks: [],
  };
}

export function readSystemFile(filePath: string): SystemJsonFile {
  if (!fs.existsSync(filePath)) {
    return createEmptySystemFile();
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as SystemJsonFile;
}

export function writeSystemFile(filePath: string, data: SystemJsonFile): void {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

/** Synchrone Mutation — blockiert bis Lock erworben, ideal für kurze Operationen. */
export function mutateSystemFileSync(
  filePath: string,
  mutate: (data: SystemJsonFile) => void,
): SystemJsonFile {
  return withFileLockSync(filePath, () => {
    const data = readSystemFile(filePath);
    mutate(data);
    writeSystemFile(filePath, data);
    return data;
  });
}

export async function mutateSystemFile(
  filePath: string,
  mutate: (data: SystemJsonFile) => void,
): Promise<SystemJsonFile> {
  return withFileLock(filePath, () => {
    const data = readSystemFile(filePath);
    mutate(data);
    writeSystemFile(filePath, data);
    return data;
  });
}
