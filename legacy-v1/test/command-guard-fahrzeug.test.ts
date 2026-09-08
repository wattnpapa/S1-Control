import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { moveFahrzeug } from '../src/main/services/command';
import { createDbPath, openTestDb } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

describe('command service - fahrzeug same abschnitt', () => {
  it('returns without changes when moving fahrzeug to same abschnitt', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    const abschnittA = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.einsatz.abschnitte.push({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL', version: 0 });
    ctx.einsatz.fahrzeuge.push({
      id: fahrzeugId, einsatzId, parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: null, aktuellerAbschnittId: abschnittA,
      name: 'Fzg', kennzeichen: null, standardPiktogrammKey: 'mtw',
      funkrufname: null, stanKonform: null, sondergeraet: null, nutzlast: null,
      status: 'AKTIV', erstellt: new Date().toISOString(), entfernt: null, version: 0,
    });

    moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittA }, user);
    expect(ctx.einsatz.commandLog.filter((c) => c.einsatzId === einsatzId)).toHaveLength(0);
  });
});
