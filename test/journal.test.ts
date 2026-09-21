import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { moveEinheit } from '../src/main/services/command';
import { listJournal } from '../src/main/services/journal';
import { createDbPath, openTestDb } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'Mustermann', rolle: 'S1' as const };

describe('Bewegungsjournal', () => {
  it('führt Einheiten- und Fahrzeugbewegungen mit Namen und Abschnitten auf', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    const von = crypto.randomUUID();
    const nach = crypto.randomUUID();
    const einheitId = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.einsatz.abschnitte.push(
      { id: von, einsatzId, name: 'Bereitstellung', parentId: null, systemTyp: 'NORMAL', version: 0 },
      { id: nach, einsatzId, name: 'Einsatzstelle', parentId: null, systemTyp: 'NORMAL', version: 0 },
    );
    ctx.einsatz.einheiten.push({
      id: einheitId, einsatzId, stammdatenEinheitId: null, parentEinsatzEinheitId: null,
      nameImEinsatz: '1. Zugtrupp', organisation: 'THW', aktuelleStaerke: 4,
      aktuelleStaerkeTaktisch: '1/1/2/4', aktuellerAbschnittId: von, status: 'AKTIV',
      tacticalSignConfigJson: null, grFuehrerName: null, ovName: null, ovTelefon: null, ovFax: null,
      rbName: null, rbTelefon: null, rbFax: null, lvName: null, lvTelefon: null, lvFax: null,
      bemerkung: null, vegetarierVorhanden: null, erreichbarkeiten: null,
      erstellt: new Date().toISOString(), aufgeloest: null, version: 0,
    });
    ctx.einsatz.fahrzeuge.push({
      id: fahrzeugId, einsatzId, parentEinsatzFahrzeugId: null,
      aktuelleEinsatzEinheitId: einheitId, aktuellerAbschnittId: von,
      name: 'MTW', kennzeichen: null, standardPiktogrammKey: 'mtw',
      funkrufname: null, stanKonform: null, sondergeraet: null, nutzlast: null,
      status: 'AKTIV', erstellt: new Date().toISOString(), entfernt: null, version: 0,
    });

    moveEinheit(ctx, { einsatzId, einheitId, nachAbschnittId: nach, kommentar: 'Auftrag Nord' }, user);

    const journal = listJournal(ctx.einsatz, einsatzId);
    expect(journal).toHaveLength(2);
    expect(journal.some((e) => e.vorgang === '1. Zugtrupp: Bereitstellung → Einsatzstelle')).toBe(true);
    expect(journal.some((e) => e.vorgang === 'MTW: Bereitstellung → Einsatzstelle')).toBe(true);
    expect(journal[0]?.benutzer).toBe('Mustermann');
    expect(journal.some((e) => e.kommentar === 'Auftrag Nord')).toBe(true);
  });

  it('liefert für einen Einsatz ohne Bewegungen eine leere Liste', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    expect(listJournal(ctx.einsatz, einsatzId)).toEqual([]);
  });
});
