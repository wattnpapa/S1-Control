import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { moveEinheit, moveFahrzeug, undoLastCommand } from '../src/main/services/command';
import { hashPassword } from '../src/main/services/auth';
import { AppError } from '../src/main/services/errors';
import { createDbPath, openTestDb } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

function setupCommandDb(): { getDbPath: () => string; getEinsatzId: () => string } {
  let dbPath: string;
  let einsatzId: string;
  beforeEach(() => {
    dbPath = createDbPath();
    einsatzId = crypto.randomUUID();
  });
  return {
    getDbPath: () => dbPath,
    getEinsatzId: () => einsatzId,
  };
}

describe('command service - einheit move+undo', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('moves and undoes einheit move with command log', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);

    const abschnittA = crypto.randomUUID();
    const abschnittB = crypto.randomUUID();
    const einheitId = crypto.randomUUID();

    ctx.system.benutzer.push({ id: user.id, name: user.name, rolle: user.rolle, passwortHash: hashPassword('x'), aktiv: true });
    ctx.einsatz.abschnitte.push(
      { id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 },
      { id: abschnittB, einsatzId, name: 'B', parentId: null, systemTyp: 'NORMAL', version: 0 },
    );
    ctx.einsatz.einheiten.push({
      id: einheitId, einsatzId, stammdatenEinheitId: null, parentEinsatzEinheitId: null,
      nameImEinsatz: 'TZ', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: null,
      aktuellerAbschnittId: abschnittA, status: 'AKTIV', tacticalSignConfigJson: null,
      grFuehrerName: null, ovName: null, ovTelefon: null, ovFax: null,
      rbName: null, rbTelefon: null, rbFax: null, lvName: null, lvTelefon: null, lvFax: null,
      bemerkung: null, vegetarierVorhanden: null, erreichbarkeiten: null,
      erstellt: new Date().toISOString(), aufgeloest: null, version: 0,
    });

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: abschnittB }, user);

    const moved = ctx.einsatz.einheiten.find((e) => e.id === einheitId);
    expect(moved?.aktuellerAbschnittId).toBe(abschnittB);

    const undoResult = undoLastCommand(ctx, einsatzId, user);
    expect(undoResult).toBe(true);

    const reverted = ctx.einsatz.einheiten.find((e) => e.id === einheitId);
    expect(reverted?.aktuellerAbschnittId).toBe(abschnittA);

    const command = ctx.einsatz.commandLog.find((c) => c.einsatzId === einsatzId);
    expect(command?.undone).toBe(true);
  });
});

describe('command service - archive guard', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('blocks writes on archived einsatz', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId, 'ARCHIVIERT');

    const abschnittA = crypto.randomUUID();
    const abschnittB = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.einsatz.abschnitte.push(
      { id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 },
      { id: abschnittB, einsatzId, name: 'B', parentId: null, systemTyp: 'NORMAL', version: 0 },
    );
    ctx.einsatz.fahrzeuge.push({
      id: fahrzeugId, einsatzId, parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: null, aktuellerAbschnittId: abschnittA,
      name: 'Test-Fzg', kennzeichen: null, standardPiktogrammKey: 'mtw',
      funkrufname: null, stanKonform: null, sondergeraet: null, nutzlast: null,
      status: 'AKTIV', erstellt: new Date().toISOString(), entfernt: null, version: 0,
    });

    expect(() => moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittB }, user)).toThrow(AppError);
  });
});

describe('command service - undo without commands', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('returns false when undo has no commands', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    expect(undoLastCommand(ctx, einsatzId, user)).toBe(false);
  });
});

describe('command service - fahrzeug move+undo', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('moves and undoes fahrzeug move', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    const abschnittA = crypto.randomUUID();
    const abschnittB = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.einsatz.abschnitte.push(
      { id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 },
      { id: abschnittB, einsatzId, name: 'B', parentId: null, systemTyp: 'NORMAL', version: 0 },
    );
    ctx.einsatz.fahrzeuge.push({
      id: fahrzeugId, einsatzId, parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: null, aktuellerAbschnittId: abschnittA,
      name: 'Fzg', kennzeichen: null, standardPiktogrammKey: 'mtw',
      funkrufname: null, stanKonform: null, sondergeraet: null, nutzlast: null,
      status: 'AKTIV', erstellt: new Date().toISOString(), entfernt: null, version: 0,
    });

    moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittB }, user);
    expect(undoLastCommand(ctx, einsatzId, user)).toBe(true);

    const reverted = ctx.einsatz.fahrzeuge.find((f) => f.id === fahrzeugId);
    expect(reverted?.aktuellerAbschnittId).toBe(abschnittA);
  });
});

describe('command service - unsupported undo type', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('throws for unsupported undo command type', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    ctx.einsatz.commandLog.push({
      id: crypto.randomUUID(), einsatzId, benutzerId: user.id,
      commandTyp: 'UNKNOWN', payloadJson: '{}',
      timestamp: new Date().toISOString(), undone: false,
    });

    expect(() => undoLastCommand(ctx, einsatzId, user)).toThrow('noch nicht implementiert');
  });
});

describe('command service - guard paths', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('returns without changes when moving einheit to same abschnitt', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    const abschnittA = crypto.randomUUID();
    const einheitId = crypto.randomUUID();

    ctx.einsatz.abschnitte.push({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 });
    ctx.einsatz.einheiten.push({
      id: einheitId, einsatzId, stammdatenEinheitId: null, parentEinsatzEinheitId: null,
      nameImEinsatz: 'OV', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: null,
      aktuellerAbschnittId: abschnittA, status: 'AKTIV', tacticalSignConfigJson: null,
      grFuehrerName: null, ovName: null, ovTelefon: null, ovFax: null,
      rbName: null, rbTelefon: null, rbFax: null, lvName: null, lvTelefon: null, lvFax: null,
      bemerkung: null, vegetarierVorhanden: null, erreichbarkeiten: null,
      erstellt: new Date().toISOString(), aufgeloest: null, version: 0,
    });

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: abschnittA }, user);
    expect(ctx.einsatz.commandLog.filter((c) => c.einsatzId === einsatzId)).toHaveLength(0);
  });

  it('throws NOT_FOUND when moving unknown einheit', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    const abschnittA = crypto.randomUUID();
    ctx.einsatz.abschnitte.push({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 });

    expect(() => moveEinheit(ctx, { einsatzId, einheitId: 'missing', nachAbschnittId: abschnittA }, user)).toThrow('Einheit nicht gefunden');
  });
});

describe('command service - fahrzeug guard paths', () => {
  const { getDbPath, getEinsatzId } = setupCommandDb();

  it('throws INVALID_STATE when fahrzeug has no current abschnitt', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    const fahrzeugId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();

    ctx.einsatz.abschnitte.push({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 });
    ctx.einsatz.fahrzeuge.push({
      id: fahrzeugId, einsatzId, parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: null, aktuellerAbschnittId: null,
      name: 'Fzg', kennzeichen: null, standardPiktogrammKey: 'mtw',
      funkrufname: null, stanKonform: null, sondergeraet: null, nutzlast: null,
      status: 'AKTIV', erstellt: new Date().toISOString(), entfernt: null, version: 0,
    });

    expect(() => moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittA }, user)).toThrow('Fahrzeug hat keinen aktuellen Abschnitt');
  });

  it('throws NOT_FOUND when moving unknown fahrzeug', () => {
    const einsatzId = getEinsatzId();
    const ctx = openTestDb(getDbPath(), einsatzId);
    const abschnittA = crypto.randomUUID();
    ctx.einsatz.abschnitte.push({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 });

    expect(() => moveFahrzeug(ctx, { einsatzId, fahrzeugId: 'missing', nachAbschnittId: abschnittA }, user)).toThrow('Fahrzeug nicht gefunden');
  });
});
