import crypto from 'node:crypto';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EinsatzFileConflictError,
  openDatabaseWithRetry,
} from '../src/main/db/connection';
import {
  readEinsatzFile,
  writeEinsatzFile,
} from '../src/main/json-store/einsatz-store';
import { createDbPath, openTestDb } from './helpers/db';

function pushAbschnitt(
  file: ReturnType<typeof readEinsatzFile>,
  einsatzId: string,
  name: string,
): void {
  file.abschnitte.push({
    id: crypto.randomUUID(),
    einsatzId,
    name,
    parentId: null,
    systemTyp: 'NORMAL',
    version: 0,
  });
}

describe('Mehrplatzbetrieb auf einer Freigabe', () => {
  it('übernimmt fremde Änderungen, statt sie zu überschreiben', async () => {
    const einsatzId = crypto.randomUUID();
    const dbPath = createDbPath();
    const ctx = openTestDb(dbPath, einsatzId);

    // Zweite Station schreibt direkt in die Datei.
    const fremd = readEinsatzFile(dbPath);
    pushAbschnitt(fremd, einsatzId, 'Von Station B');
    fremd.writeSeq = (fremd.writeSeq ?? 0) + 1;
    writeEinsatzFile(dbPath, fremd);

    // Eigene Station schreibt danach ihre eigene Änderung.
    await ctx.mutate(() => {
      pushAbschnitt(ctx.einsatz, einsatzId, 'Von Station A');
    });

    const namen = readEinsatzFile(dbPath)
      .abschnitte.map((a) => a.name)
      .sort();
    expect(namen).toEqual(['Von Station A', 'Von Station B']);
  });

  it('bricht save() ab, wenn die Datei zwischenzeitlich fremd geschrieben wurde', async () => {
    const einsatzId = crypto.randomUUID();
    const dbPath = createDbPath();
    const ctx = openTestDb(dbPath, einsatzId);

    const fremd = readEinsatzFile(dbPath);
    pushAbschnitt(fremd, einsatzId, 'Von Station B');
    fremd.writeSeq = (fremd.writeSeq ?? 0) + 1;
    writeEinsatzFile(dbPath, fremd);

    pushAbschnitt(ctx.einsatz, einsatzId, 'Von Station A');
    await expect(ctx.save()).rejects.toBeInstanceOf(EinsatzFileConflictError);
    expect(readEinsatzFile(dbPath).abschnitte.map((a) => a.name)).toEqual([
      'Von Station B',
    ]);
  });

  it('liest Änderungen anderer Stationen über reload() nach', () => {
    const einsatzId = crypto.randomUUID();
    const dbPath = createDbPath();
    const ctx = openTestDb(dbPath, einsatzId);
    expect(ctx.einsatz.abschnitte).toHaveLength(0);

    const fremd = readEinsatzFile(dbPath);
    pushAbschnitt(fremd, einsatzId, 'Neu von B');
    fremd.writeSeq = (fremd.writeSeq ?? 0) + 1;
    writeEinsatzFile(dbPath, fremd);

    expect(ctx.reload()).toBe(true);
    expect(ctx.einsatz.abschnitte.map((a) => a.name)).toEqual(['Neu von B']);
    expect(ctx.reload()).toBe(false);
  });
});

describe('Öffnen beschädigter Einsatzdateien', () => {
  it('überschreibt eine nicht lesbare Datei nicht, sondern meldet den Fehler', () => {
    const dbPath = createDbPath();
    fs.writeFileSync(dbPath, 'SQLite format 3\u0000 kein JSON');
    const vorher = fs.readFileSync(dbPath);

    expect(() => openDatabaseWithRetry(dbPath)).toThrow(
      /konnte nicht gelesen werden/,
    );
    expect(fs.readFileSync(dbPath)).toEqual(vorher);
  });
});
