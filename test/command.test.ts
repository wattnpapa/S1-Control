import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDatabaseWithRetry } from '../src/main/db/connection';
import {
  benutzer,
  einsatz,
  einsatzAbschnitt,
  einsatzCommandLog,
  einsatzEinheit,
  einsatzFahrzeug,
} from '../src/main/db/schema';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../src/main/services/command';
import { hashPassword } from '../src/main/services/auth';
import { AppError } from '../src/main/services/errors';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

function createDbPath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-test-'));
  return path.join(dir, 'test.sqlite');
}

describe('command service', () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = createDbPath();
  });

  it('moves and undoes einheit move with command log', () => {
    const ctx = openDatabaseWithRetry(dbPath);

    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();
    const abschnittB = crypto.randomUUID();
    const einheitId = crypto.randomUUID();

    ctx.db.insert(benutzer).values({
      id: user.id,
      name: user.name,
      rolle: user.rolle,
      passwortHash: hashPassword('x'),
      aktiv: true,
    }).run();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Test',
      fuestName: 'FueSt',
      start: new Date().toISOString(),
      end: null,
      status: 'AKTIV',
      uebergeordneteFuestName: null,
    }).run();

    ctx.db.insert(einsatzAbschnitt).values([
      { id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' },
      { id: abschnittB, einsatzId, name: 'B', parentId: null, systemTyp: 'NORMAL' },
    ]).run();

    ctx.db.insert(einsatzEinheit).values({
      id: einheitId,
      einsatzId,
      stammdatenEinheitId: null,
      parentEinsatzEinheitId: null,
      nameImEinsatz: 'TZ',
      aktuelleStaerke: 9,
      aktuellerAbschnittId: abschnittA,
      status: 'AKTIV',
      erstellt: new Date().toISOString(),
      aufgeloest: null,
    }).run();

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: abschnittB }, user);

    const moved = ctx.db
      .select({ abschnittId: einsatzEinheit.aktuellerAbschnittId })
      .from(einsatzEinheit)
      .where(eq(einsatzEinheit.id, einheitId))
      .get();

    expect(moved?.abschnittId).toBe(abschnittB);

    const undoResult = undoLastCommand(ctx, einsatzId, user);
    expect(undoResult).toBe(true);

    const reverted = ctx.db
      .select({ abschnittId: einsatzEinheit.aktuellerAbschnittId })
      .from(einsatzEinheit)
      .where(eq(einsatzEinheit.id, einheitId))
      .get();

    expect(reverted?.abschnittId).toBe(abschnittA);

    const command = ctx.db.select().from(einsatzCommandLog).where(eq(einsatzCommandLog.einsatzId, einsatzId)).get();
    expect(command?.undone).toBe(true);
  });

  it('blocks writes on archived einsatz', () => {
    const ctx = openDatabaseWithRetry(dbPath);

    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();
    const abschnittB = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.db.insert(benutzer).values({
      id: user.id,
      name: user.name,
      rolle: user.rolle,
      passwortHash: hashPassword('x'),
      aktiv: true,
    }).run();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Archived',
      fuestName: 'FueSt',
      start: new Date().toISOString(),
      end: null,
      status: 'ARCHIVIERT',
      uebergeordneteFuestName: null,
    }).run();

    ctx.db.insert(einsatzAbschnitt).values([
      { id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' },
      { id: abschnittB, einsatzId, name: 'B', parentId: null, systemTyp: 'NORMAL' },
    ]).run();

    ctx.db.insert(einsatzFahrzeug).values({
      id: fahrzeugId,
      einsatzId,
      stammdatenFahrzeugId: null,
      parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: null,
      aktuellerAbschnittId: abschnittA,
      status: 'AKTIV',
      erstellt: new Date().toISOString(),
      entfernt: null,
    }).run();

    expect(() => moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittB }, user)).toThrow(
      AppError,
    );
  });
});
