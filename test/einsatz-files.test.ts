import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createEinsatzInOwnDatabase,
  findDbPathForEinsatz,
  listEinsaetzeFromDirectory,
  resolveEinsatzBaseDir,
  resolveSystemDbPath,
} from '../src/main/services/einsatz-files';

describe('einsatz file service', () => {
  it('resolves base dir from sqlite path and directory path', () => {
    expect(resolveEinsatzBaseDir('/tmp/x.sqlite')).toBe('/tmp');
    expect(resolveEinsatzBaseDir('/tmp/data')).toBe('/tmp/data');
  });

  it('creates own db per einsatz and lists it', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-einsatz-files-'));
    const user = { id: 'u1', name: 'u', rolle: 'S1' as const };
    const created = createEinsatzInOwnDatabase(baseDir, { name: 'Übung Test', fuestName: 'FüSt 1' }, user);

    try {
      const list = listEinsaetzeFromDirectory(baseDir);
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(created.einsatz.id);

      const dbPath = findDbPathForEinsatz(baseDir, created.einsatz.id);
      expect(dbPath).toBeTruthy();
      expect(resolveSystemDbPath(baseDir).endsWith('_system.sqlite')).toBe(true);
    } finally {
      created.ctx.sqlite.close();
    }
  });
});

