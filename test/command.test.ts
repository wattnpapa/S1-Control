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
import { createDbPath } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

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
    ctx.sqlite.close();
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
    ctx.sqlite.close();
  });

  it('returns false when undo has no commands', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();

    ctx.db
      .insert(benutzer)
      .values({
        id: user.id,
        name: user.name,
        rolle: user.rolle,
        passwortHash: hashPassword('x'),
        aktiv: true,
      })
      .run();

    ctx.db
      .insert(einsatz)
      .values({
        id: einsatzId,
        name: 'No-Commands',
        fuestName: 'FüSt',
        start: new Date().toISOString(),
        end: null,
        status: 'AKTIV',
        uebergeordneteFuestName: null,
      })
      .run();

    expect(undoLastCommand(ctx, einsatzId, user)).toBe(false);
    ctx.sqlite.close();
  });

  it('moves and undoes fahrzeug move', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();
    const abschnittB = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.db
      .insert(benutzer)
      .values({
        id: user.id,
        name: user.name,
        rolle: user.rolle,
        passwortHash: hashPassword('x'),
        aktiv: true,
      })
      .run();

    ctx.db
      .insert(einsatz)
      .values({
        id: einsatzId,
        name: 'Fahrzeug-Test',
        fuestName: 'FüSt',
        start: new Date().toISOString(),
        end: null,
        status: 'AKTIV',
        uebergeordneteFuestName: null,
      })
      .run();

    ctx.db
      .insert(einsatzAbschnitt)
      .values([
        { id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' },
        { id: abschnittB, einsatzId, name: 'B', parentId: null, systemTyp: 'NORMAL' },
      ])
      .run();

    ctx.db
      .insert(einsatzFahrzeug)
      .values({
        id: fahrzeugId,
        einsatzId,
        stammdatenFahrzeugId: null,
        parentEinsatzFahrzeugId: null,
        aktuelleEinsatzEinheitId: null,
        aktuellerAbschnittId: abschnittA,
        status: 'AKTIV',
        erstellt: new Date().toISOString(),
        entfernt: null,
      })
      .run();

    moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittB }, user);
    expect(undoLastCommand(ctx, einsatzId, user)).toBe(true);

    const reverted = ctx.db
      .select({ abschnittId: einsatzFahrzeug.aktuellerAbschnittId })
      .from(einsatzFahrzeug)
      .where(eq(einsatzFahrzeug.id, fahrzeugId))
      .get();

    expect(reverted?.abschnittId).toBe(abschnittA);
    ctx.sqlite.close();
  });

  it('throws for unsupported undo command type', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();

    ctx.db
      .insert(benutzer)
      .values({
        id: user.id,
        name: user.name,
        rolle: user.rolle,
        passwortHash: hashPassword('x'),
        aktiv: true,
      })
      .run();

    ctx.db
      .insert(einsatz)
      .values({
        id: einsatzId,
        name: 'Undo-Test',
        fuestName: 'FüSt',
        start: new Date().toISOString(),
        end: null,
        status: 'AKTIV',
        uebergeordneteFuestName: null,
      })
      .run();

    ctx.db
      .insert(einsatzCommandLog)
      .values({
        id: crypto.randomUUID(),
        einsatzId,
        benutzerId: user.id,
        commandTyp: 'UNKNOWN',
        payloadJson: '{}',
        timestamp: new Date().toISOString(),
        undone: false,
      })
      .run();

    expect(() => undoLastCommand(ctx, einsatzId, user)).toThrow('noch nicht implementiert');
    ctx.sqlite.close();
  });

  it('returns without changes when moving einheit to same abschnitt', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();
    const einheitId = crypto.randomUUID();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Same-Abschnitt',
      fuestName: 'FüSt',
      start: new Date().toISOString(),
      end: null,
      status: 'AKTIV',
      uebergeordneteFuestName: null,
    }).run();
    ctx.db.insert(einsatzAbschnitt).values({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' }).run();
    ctx.db.insert(einsatzEinheit).values({
      id: einheitId,
      einsatzId,
      stammdatenEinheitId: null,
      parentEinsatzEinheitId: null,
      nameImEinsatz: 'OV',
      aktuelleStaerke: 9,
      aktuellerAbschnittId: abschnittA,
      status: 'AKTIV',
      erstellt: new Date().toISOString(),
      aufgeloest: null,
    }).run();

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: abschnittA }, user);
    const logs = ctx.db.select().from(einsatzCommandLog).where(eq(einsatzCommandLog.einsatzId, einsatzId)).all();
    expect(logs).toHaveLength(0);
    ctx.sqlite.close();
  });

  it('throws NOT_FOUND when moving unknown einheit', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Unknown-Einheit',
      fuestName: 'FüSt',
      start: new Date().toISOString(),
      end: null,
      status: 'AKTIV',
      uebergeordneteFuestName: null,
    }).run();
    ctx.db.insert(einsatzAbschnitt).values({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' }).run();

    expect(() => moveEinheit(ctx, { einsatzId, einheitId: 'missing', nachAbschnittId: abschnittA }, user)).toThrow('Einheit nicht gefunden');
    ctx.sqlite.close();
  });

  it('throws INVALID_STATE when fahrzeug has no current abschnitt', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Invalid-Fahrzeug',
      fuestName: 'FüSt',
      start: new Date().toISOString(),
      end: null,
      status: 'AKTIV',
      uebergeordneteFuestName: null,
    }).run();
    ctx.db.insert(einsatzAbschnitt).values({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' }).run();
    ctx.db.insert(einsatzFahrzeug).values({
      id: fahrzeugId,
      einsatzId,
      stammdatenFahrzeugId: null,
      parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: null,
      aktuellerAbschnittId: null,
      status: 'AKTIV',
      erstellt: new Date().toISOString(),
      entfernt: null,
    }).run();

    expect(() => moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittA }, user)).toThrow(
      'Fahrzeug hat keinen aktuellen Abschnitt',
    );
    ctx.sqlite.close();
  });

  it('throws NOT_FOUND when moving unknown fahrzeug', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Unknown-Fahrzeug',
      fuestName: 'FüSt',
      start: new Date().toISOString(),
      end: null,
      status: 'AKTIV',
      uebergeordneteFuestName: null,
    }).run();
    ctx.db.insert(einsatzAbschnitt).values({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' }).run();

    expect(() => moveFahrzeug(ctx, { einsatzId, fahrzeugId: 'missing', nachAbschnittId: abschnittA }, user)).toThrow(
      'Fahrzeug nicht gefunden',
    );
    ctx.sqlite.close();
  });

  it('returns without changes when moving fahrzeug to same abschnitt', () => {
    const ctx = openDatabaseWithRetry(dbPath);
    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.db.insert(einsatz).values({
      id: einsatzId,
      name: 'Same-Fahrzeug-Abschnitt',
      fuestName: 'FüSt',
      start: new Date().toISOString(),
      end: null,
      status: 'AKTIV',
      uebergeordneteFuestName: null,
    }).run();
    ctx.db.insert(einsatzAbschnitt).values({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' }).run();
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

    moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittA }, user);
    const logs = ctx.db.select().from(einsatzCommandLog).where(eq(einsatzCommandLog.einsatzId, einsatzId)).all();
    expect(logs).toHaveLength(0);
    ctx.sqlite.close();
  });
});
