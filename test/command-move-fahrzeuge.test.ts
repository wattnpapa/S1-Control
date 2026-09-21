import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { moveEinheit, undoLastCommand } from '../src/main/services/command';
import { createDbPath, openTestDb } from './helpers/db';
import type { DbContext } from '../src/main/db/connection';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

function setup(): {
  ctx: DbContext;
  einsatzId: string;
  von: string;
  nach: string;
  einheitId: string;
  fahrzeugId: string;
} {
  const einsatzId = crypto.randomUUID();
  const ctx = openTestDb(createDbPath(), einsatzId);
  const von = crypto.randomUUID();
  const nach = crypto.randomUUID();
  const einheitId = crypto.randomUUID();
  const fahrzeugId = crypto.randomUUID();

  for (const [id, name] of [
    [von, 'Bereitstellung'],
    [nach, 'Einsatzstelle'],
  ] as const) {
    ctx.einsatz.abschnitte.push({
      id,
      einsatzId,
      name,
      parentId: null,
      systemTyp: 'NORMAL',
      version: 0,
    });
  }
  ctx.einsatz.einheiten.push({
    id: einheitId,
    einsatzId,
    stammdatenEinheitId: null,
    parentEinsatzEinheitId: null,
    nameImEinsatz: '1. Bergungsgruppe',
    organisation: 'THW',
    aktuelleStaerke: 9,
    aktuelleStaerkeTaktisch: '0/1/8/9',
    aktuellerAbschnittId: von,
    status: 'AKTIV',
    tacticalSignConfigJson: null,
    grFuehrerName: null,
    ovName: null,
    ovTelefon: null,
    ovFax: null,
    rbName: null,
    rbTelefon: null,
    rbFax: null,
    lvName: null,
    lvTelefon: null,
    lvFax: null,
    bemerkung: null,
    vegetarierVorhanden: null,
    erreichbarkeiten: null,
    erstellt: new Date().toISOString(),
    aufgeloest: null,
    version: 0,
  });
  ctx.einsatz.fahrzeuge.push({
    id: fahrzeugId,
    einsatzId,
    parentEinsatzFahrzeugId: null,
    aktuelleEinsatzEinheitId: einheitId,
    aktuellerAbschnittId: von,
    name: 'GKW',
    kennzeichen: null,
    standardPiktogrammKey: 'gkw',
    funkrufname: null,
    stanKonform: null,
    sondergeraet: null,
    nutzlast: null,
    status: 'AKTIV',
    erstellt: new Date().toISOString(),
    entfernt: null,
    version: 0,
  });
  return { ctx, einsatzId, von, nach, einheitId, fahrzeugId };
}

describe('Einheit verschieben', () => {
  it('nimmt die Fahrzeuge der Einheit mit', () => {
    const { ctx, einsatzId, nach, einheitId, fahrzeugId } = setup();

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: nach }, user);

    const fahrzeug = ctx.einsatz.fahrzeuge.find((f) => f.id === fahrzeugId);
    expect(fahrzeug?.aktuellerAbschnittId).toBe(nach);
    expect(ctx.einsatz.fahrzeugBewegungen).toHaveLength(1);
  });

  it('lässt die Fahrzeuge stehen, wenn das ausdrücklich gewünscht ist', () => {
    const { ctx, einsatzId, von, nach, einheitId, fahrzeugId } = setup();

    moveEinheit(
      ctx,
      {
        einsatzId,
        einheitId,
        nachAbschnittId: nach,
        fahrzeugeMitnehmen: false,
      },
      user,
    );

    expect(
      ctx.einsatz.fahrzeuge.find((f) => f.id === fahrzeugId)
        ?.aktuellerAbschnittId,
    ).toBe(von);
    expect(ctx.einsatz.fahrzeugBewegungen).toHaveLength(0);
  });

  it('übernimmt einen nachgetragenen Zeitpunkt', () => {
    const { ctx, einsatzId, nach, einheitId } = setup();
    const zeitpunkt = '2026-09-18T06:30:00.000Z';

    moveEinheit(
      ctx,
      { einsatzId, einheitId, nachAbschnittId: nach, zeitpunkt },
      user,
    );

    expect(ctx.einsatz.einheitBewegungen[0].zeitpunkt).toBe(zeitpunkt);
    expect(ctx.einsatz.fahrzeugBewegungen[0].zeitpunkt).toBe(zeitpunkt);
  });

  it('holt beim Rückgängigmachen auch die mitgenommenen Fahrzeuge zurück', () => {
    const { ctx, einsatzId, von, nach, einheitId, fahrzeugId } = setup();
    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: nach }, user);

    expect(undoLastCommand(ctx, einsatzId, user)).toBe(true);

    expect(
      ctx.einsatz.einheiten.find((e) => e.id === einheitId)
        ?.aktuellerAbschnittId,
    ).toBe(von);
    expect(
      ctx.einsatz.fahrzeuge.find((f) => f.id === fahrzeugId)
        ?.aktuellerAbschnittId,
    ).toBe(von);
  });
});
