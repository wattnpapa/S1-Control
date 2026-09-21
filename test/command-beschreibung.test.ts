import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { moveEinheit } from '../src/main/services/command';
import { describeLastUndoableCommand } from '../src/main/services/command-beschreibung';
import { createDbPath, openTestDb } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

describe('Beschreibung der letzten Aktion', () => {
  it('benennt Einheit, Quelle und Ziel der letzten Verschiebung', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    const von = crypto.randomUUID();
    const nach = crypto.randomUUID();
    const einheitId = crypto.randomUUID();

    ctx.einsatz.abschnitte.push(
      { id: von, einsatzId, name: 'Bereitstellungsraum', parentId: null, systemTyp: 'NORMAL', version: 0 },
      { id: nach, einsatzId, name: 'Einsatzstelle Nord', parentId: null, systemTyp: 'NORMAL', version: 0 },
    );
    ctx.einsatz.einheiten.push({
      id: einheitId, einsatzId, stammdatenEinheitId: null, parentEinsatzEinheitId: null,
      nameImEinsatz: '2. Bergungsgruppe', organisation: 'THW', aktuelleStaerke: 9,
      aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: von, status: 'AKTIV',
      tacticalSignConfigJson: null, grFuehrerName: null, ovName: null, ovTelefon: null, ovFax: null,
      rbName: null, rbTelefon: null, rbFax: null, lvName: null, lvTelefon: null, lvFax: null,
      bemerkung: null, vegetarierVorhanden: null, erreichbarkeiten: null,
      erstellt: new Date().toISOString(), aufgeloest: null, version: 0,
    });

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: nach }, user);

    const letzte = describeLastUndoableCommand(ctx.einsatz, einsatzId);
    expect(letzte?.beschreibung).toBe(
      '2. Bergungsgruppe von Bereitstellungsraum nach Einsatzstelle Nord verschoben',
    );
  });

  it('liefert null, wenn es nichts zurückzunehmen gibt', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    expect(describeLastUndoableCommand(ctx.einsatz, einsatzId)).toBeNull();
  });
});
