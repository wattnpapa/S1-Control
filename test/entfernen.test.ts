import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { removeAbschnitt, removeEinheit, removeFahrzeug } from '../src/main/services/einsatz-write/entfernen';
import { undoLastCommand } from '../src/main/services/command';
import { listAbschnittDetails } from '../src/main/services/einsatz-read-service';
import { createDbPath, openTestDb } from './helpers/db';
import type { DbContext } from '../src/main/db/connection';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

function aufbauen(): { ctx: DbContext; einsatzId: string; abschnittId: string; einheitId: string; fahrzeugId: string } {
  const einsatzId = crypto.randomUUID();
  const ctx = openTestDb(createDbPath(), einsatzId);
  const abschnittId = crypto.randomUUID();
  const einheitId = crypto.randomUUID();
  const fahrzeugId = crypto.randomUUID();

  ctx.einsatz.abschnitte.push({
    id: abschnittId, einsatzId, name: 'Einsatzstelle', parentId: null, systemTyp: 'NORMAL', version: 0,
  });
  ctx.einsatz.einheiten.push({
    id: einheitId, einsatzId, stammdatenEinheitId: null, parentEinsatzEinheitId: null,
    nameImEinsatz: 'Fachgruppe N', organisation: 'THW', aktuelleStaerke: 6,
    aktuelleStaerkeTaktisch: '0/1/5/6', aktuellerAbschnittId: abschnittId, status: 'AKTIV',
    tacticalSignConfigJson: null, grFuehrerName: null, ovName: null, ovTelefon: null, ovFax: null,
    rbName: null, rbTelefon: null, rbFax: null, lvName: null, lvTelefon: null, lvFax: null,
    bemerkung: null, vegetarierVorhanden: null, erreichbarkeiten: null,
    erstellt: new Date().toISOString(), aufgeloest: null, version: 0,
  });
  ctx.einsatz.fahrzeuge.push({
    id: fahrzeugId, einsatzId, parentEinsatzFahrzeugId: null,
    aktuelleEinsatzEinheitId: einheitId, aktuellerAbschnittId: abschnittId,
    name: 'MzKW', kennzeichen: null, standardPiktogrammKey: 'mzkw',
    funkrufname: null, stanKonform: null, sondergeraet: null, nutzlast: null,
    status: 'AKTIV', erstellt: new Date().toISOString(), entfernt: null, version: 0,
  });
  return { ctx, einsatzId, abschnittId, einheitId, fahrzeugId };
}

describe('Entfernen als Korrekturweg', () => {
  it('verweigert das Entfernen einer Einheit mit zugeordneten Fahrzeugen', () => {
    const { ctx, einsatzId, einheitId } = aufbauen();
    expect(() => removeEinheit(ctx, { einsatzId, einheitId }, user)).toThrow(/Fahrzeug/);
  });

  it('blendet eine entfernte Einheit aus der Abschnittsansicht aus', () => {
    const { ctx, einsatzId, abschnittId, einheitId, fahrzeugId } = aufbauen();
    removeFahrzeug(ctx, { einsatzId, fahrzeugId }, user);
    removeEinheit(ctx, { einsatzId, einheitId }, user);

    const details = listAbschnittDetails(ctx.einsatz, ctx.system, einsatzId, abschnittId);
    expect(details.einheiten).toHaveLength(0);
    expect(details.fahrzeuge).toHaveLength(0);
    expect(ctx.einsatz.einheiten[0].aufgeloest).not.toBeNull();
  });

  it('holt ein Entfernen per Rückgängig zurück', () => {
    const { ctx, einsatzId, abschnittId, fahrzeugId } = aufbauen();
    removeFahrzeug(ctx, { einsatzId, fahrzeugId }, user);

    expect(undoLastCommand(ctx, einsatzId, user)).toBe(true);

    const details = listAbschnittDetails(ctx.einsatz, ctx.system, einsatzId, abschnittId);
    expect(details.fahrzeuge).toHaveLength(1);
  });

  it('verweigert das Entfernen eines belegten Abschnitts und stellt ihn sonst wieder her', () => {
    const { ctx, einsatzId, abschnittId, einheitId, fahrzeugId } = aufbauen();
    expect(() => removeAbschnitt(ctx, { einsatzId, abschnittId }, user)).toThrow(/stehen noch/);

    removeFahrzeug(ctx, { einsatzId, fahrzeugId }, user);
    removeEinheit(ctx, { einsatzId, einheitId }, user);
    removeAbschnitt(ctx, { einsatzId, abschnittId }, user);
    expect(ctx.einsatz.abschnitte).toHaveLength(0);

    expect(undoLastCommand(ctx, einsatzId, user)).toBe(true);
    expect(ctx.einsatz.abschnitte.map((a) => a.name)).toEqual(['Einsatzstelle']);
  });
});
