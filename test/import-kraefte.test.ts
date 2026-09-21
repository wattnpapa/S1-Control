import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { IMPORT_KOPFZEILE, importiereKraefte, parseKraefteCsv } from '../src/main/services/import-kraefte';
import { createDbPath, openTestDb } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'Mustermann', rolle: 'S1' as const };

function schreibeListe(inhalt: string): string {
  const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'import-')), 'liste.csv');
  fs.writeFileSync(datei, inhalt, 'utf8');
  return datei;
}

describe('Nacherfassung aus Papierliste', () => {
  it('überspringt die Kopfzeile und liest Stärke und Zeitpunkt', () => {
    const { zeilen, meldungen } = parseKraefteCsv(
      `${IMPORT_KOPFZEILE}\n"1. Bergungsgruppe";"THW";0;1;8;"Nord";"2026-09-18T06:30:00.000Z"\n`,
    );

    expect(meldungen).toEqual([]);
    expect(zeilen).toHaveLength(1);
    expect(zeilen[0]).toMatchObject({ name: '1. Bergungsgruppe', fuehrung: 0, unterfuehrung: 1, mannschaft: 8 });
  });

  it('meldet unlesbare Stärkeangaben, statt sie als Null zu übernehmen', () => {
    const { zeilen, meldungen } = parseKraefteCsv('"Fachgruppe N";"THW";x;1;8;"Nord";""\n');
    expect(zeilen).toHaveLength(0);
    expect(meldungen[0]).toMatch(/Stärke nicht lesbar/);
  });

  it('legt Einheiten im benannten Abschnitt an und übernimmt den Zeitpunkt der Liste', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    const abschnittId = crypto.randomUUID();
    ctx.einsatz.abschnitte.push({
      id: abschnittId, einsatzId, name: 'Einsatzstelle Nord', parentId: null, systemTyp: 'NORMAL', version: 0,
    });

    const datei = schreibeListe(
      `${IMPORT_KOPFZEILE}\n"1. Bergungsgruppe";"THW";0;1;8;"Einsatzstelle Nord";"2026-09-18T06:30:00.000Z"\n`,
    );
    const ergebnis = importiereKraefte(ctx, { einsatzId, dateiPfad: datei }, user);

    expect(ergebnis.angelegt).toBe(1);
    const einheit = ctx.einsatz.einheiten[0];
    expect(einheit?.aktuelleStaerkeTaktisch).toBe('0/1/8/9');
    expect(einheit?.aktuellerAbschnittId).toBe(abschnittId);
    expect(einheit?.erstellt).toBe('2026-09-18T06:30:00.000Z');
  });

  it('legt nichts an, wenn der Abschnitt nicht existiert', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    const datei = schreibeListe('"Fachgruppe N";"THW";0;1;5;"Gibt es nicht";""\n');

    const ergebnis = importiereKraefte(ctx, { einsatzId, dateiPfad: datei }, user);

    expect(ergebnis.angelegt).toBe(0);
    expect(ergebnis.uebersprungen).toBe(1);
    expect(ctx.einsatz.einheiten).toHaveLength(0);
  });
});
