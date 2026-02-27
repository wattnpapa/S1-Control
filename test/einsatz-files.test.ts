import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createEinsatzDbFileName,
  createEinsatzInOwnDatabase,
  findDbPathForEinsatz,
  listEinsaetzeFromDbPaths,
  listEinsaetzeFromDbPathsWithUsage,
  listEinsaetzeFromDirectory,
  resolveEinsatzBaseDir,
  resolveSystemDbPath,
} from '../src/main/services/einsatz-files';

describe('einsatz file service', () => {
  it('resolves base dir from einsatz db path and directory path', () => {
    expect(resolveEinsatzBaseDir('/tmp/x.s1control')).toBe('/tmp');
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
      expect(resolveSystemDbPath(baseDir).endsWith('_system.s1control')).toBe(true);
    } finally {
      created.ctx.sqlite.close();
    }
  });

  it('handles missing/invalid db files and explicit db path', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-einsatz-files-'));
    const user = { id: 'u1', name: 'u', rolle: 'S1' as const };
    const explicitPath = path.join(baseDir, 'custom.s1control');
    const created = createEinsatzInOwnDatabase(baseDir, { name: 'Übung 2', fuestName: 'FüSt 2' }, user, explicitPath);

    try {
      expect(createEinsatzDbFileName('Übung Test').endsWith('.s1control')).toBe(true);
      expect(resolveSystemDbPath(baseDir)).toBe(path.join(baseDir, '_system.s1control'));
      expect(findDbPathForEinsatz(baseDir, 'does-not-exist')).toBeNull();

      const missingPath = path.join(baseDir, 'missing.s1control');
      const invalidPath = path.join(baseDir, 'invalid.s1control');
      fs.writeFileSync(invalidPath, 'not-a-db');

      const list = listEinsaetzeFromDbPaths([missingPath, invalidPath, explicitPath]);
      expect(list).toHaveLength(1);
      expect(list[0]?.id).toBe(created.einsatz.id);
      expect(list[0]?.dbPath).toBe(explicitPath);
    } finally {
      created.ctx.sqlite.close();
    }
  });

  it('sorts known einsaetze by last usage descending', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-einsatz-files-'));
    const user = { id: 'u1', name: 'u', rolle: 'S1' as const };
    const firstPath = path.join(baseDir, 'a.s1control');
    const secondPath = path.join(baseDir, 'b.s1control');
    const first = createEinsatzInOwnDatabase(baseDir, { name: 'Erster', fuestName: 'FüSt 1' }, user, firstPath);
    const second = createEinsatzInOwnDatabase(baseDir, { name: 'Zweiter', fuestName: 'FüSt 2' }, user, secondPath);

    try {
      const sorted = listEinsaetzeFromDbPathsWithUsage([firstPath, secondPath], {
        [firstPath]: '2026-02-26T10:00:00.000Z',
        [secondPath]: '2026-02-26T11:00:00.000Z',
      });
      expect(sorted[0]?.id).toBe(second.einsatz.id);
      expect(sorted[1]?.id).toBe(first.einsatz.id);
    } finally {
      first.ctx.sqlite.close();
      second.ctx.sqlite.close();
    }
  });
});
