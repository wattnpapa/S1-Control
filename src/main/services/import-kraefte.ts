import fs from 'node:fs';
import crypto from 'node:crypto';
import type { DbContext } from '../db/connection';
import type { SessionUser } from '../../shared/types';
import { AppError } from './errors';
import { ensureNotArchived } from './einsatz';

export interface ImportErgebnis {
  angelegt: number;
  uebersprungen: number;
  meldungen: string[];
}

interface ImportZeile {
  name: string;
  organisation: string;
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
  abschnitt: string;
  zeitpunkt: string | null;
}

/** Erwartete Spalten, mit Semikolon getrennt. */
export const IMPORT_KOPFZEILE = 'Einheit;Organisation;Fuehrung;Unterfuehrung;Mannschaft;Abschnitt;Zeitpunkt';

function zerlege(zeile: string): string[] {
  return zeile.split(';').map((feld) => feld.trim().replace(/^"|"$/g, ''));
}

function leseZahl(rohwert: string): number | null {
  if (rohwert === '') {
    return 0;
  }
  const wert = Number(rohwert);
  return Number.isInteger(wert) && wert >= 0 && wert <= 999 ? wert : null;
}

/**
 * Liest die drei Stärkefelder einer Zeile.
 */
function leseStaerke(
  fuehrungRoh: string | undefined,
  unterfuehrungRoh: string | undefined,
  mannschaftRoh: string | undefined,
): { fuehrung: number; unterfuehrung: number; mannschaft: number } | null {
  const fuehrung = leseZahl(fuehrungRoh ?? '');
  const unterfuehrung = leseZahl(unterfuehrungRoh ?? '');
  const mannschaft = leseZahl(mannschaftRoh ?? '');
  if (fuehrung === null || unterfuehrung === null || mannschaft === null) {
    return null;
  }
  return { fuehrung, unterfuehrung, mannschaft };
}

/**
 * Liest eine einzelne Zeile. Gibt eine Meldung zurück, wenn sie unbrauchbar ist.
 */
function leseZeile(felder: string[], nummer: number): ImportZeile | string {
  const [name, organisation, fuehrungRoh, unterfuehrungRoh, mannschaftRoh, abschnitt, zeitpunkt] = felder;
  if (!name) {
    return `Zeile ${nummer}: ohne Einheitennamen, übersprungen.`;
  }
  const staerke = leseStaerke(fuehrungRoh, unterfuehrungRoh, mannschaftRoh);
  if (!staerke) {
    return `Zeile ${nummer} (${name}): Stärke nicht lesbar, übersprungen.`;
  }
  return {
    name,
    organisation: organisation || 'THW',
    ...staerke,
    abschnitt: abschnitt || '',
    zeitpunkt: zeitpunkt || null,
  };
}

/**
 * Liest eine Nacherfassungsliste ein.
 *
 * Nach einer Papierphase muss der handschriftliche Stand zurück in die
 * Einsatzdatei, ohne jede Einheit einzeln über die Oberfläche zu tippen.
 */
export function parseKraefteCsv(inhalt: string): { zeilen: ImportZeile[]; meldungen: string[] } {
  const meldungen: string[] = [];
  const zeilen: ImportZeile[] = [];
  const rohzeilen = inhalt.split(/\r?\n/).filter((zeile) => zeile.trim() !== '');

  rohzeilen.forEach((zeile, index) => {
    const felder = zerlege(zeile);
    if (index === 0 && felder[0]?.toLowerCase().startsWith('einheit')) {
      return;
    }
    const ergebnis = leseZeile(felder, index + 1);
    if (typeof ergebnis === 'string') {
      meldungen.push(ergebnis);
      return;
    }
    zeilen.push(ergebnis);
  });

  return { zeilen, meldungen };
}

/**
 * Legt die Einheiten einer Nacherfassungsliste an.
 *
 * Abschnitte werden anhand ihres Namens zugeordnet; fehlt der Abschnitt,
 * wird die Zeile gemeldet statt still in einen beliebigen Abschnitt gelegt.
 */
export function importiereKraefte(
  ctx: DbContext,
  input: { einsatzId: string; dateiPfad: string },
  user: SessionUser,
): ImportErgebnis {
  ensureNotArchived(ctx, input.einsatzId);

  let inhalt: string;
  try {
    inhalt = fs.readFileSync(input.dateiPfad, 'utf8');
  } catch (error) {
    throw new AppError(
      `Die Datei konnte nicht gelesen werden (${error instanceof Error ? error.message : String(error)}).`,
      'INVALID_INPUT',
    );
  }

  const { zeilen, meldungen } = parseKraefteCsv(inhalt);
  let angelegt = 0;
  let uebersprungen = meldungen.length;

  for (const zeile of zeilen) {
    const abschnitt = ctx.einsatz.abschnitte.find(
      (a) => a.einsatzId === input.einsatzId && a.name.toLowerCase() === zeile.abschnitt.toLowerCase(),
    );
    if (!abschnitt) {
      meldungen.push(`${zeile.name}: Abschnitt "${zeile.abschnitt}" gibt es nicht, übersprungen.`);
      uebersprungen += 1;
      continue;
    }
    const gesamt = zeile.fuehrung + zeile.unterfuehrung + zeile.mannschaft;
    const jetzt = new Date().toISOString();
    ctx.einsatz.einheiten.push({
      id: crypto.randomUUID(),
      einsatzId: input.einsatzId,
      stammdatenEinheitId: null,
      parentEinsatzEinheitId: null,
      nameImEinsatz: zeile.name,
      organisation: zeile.organisation,
      aktuelleStaerke: gesamt,
      aktuelleStaerkeTaktisch: `${zeile.fuehrung}/${zeile.unterfuehrung}/${zeile.mannschaft}/${gesamt}`,
      aktuellerAbschnittId: abschnitt.id,
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
      bemerkung: `Nacherfasst von ${user.name}`,
      vegetarierVorhanden: null,
      erreichbarkeiten: null,
      // Der Zeitpunkt aus der Liste zählt, nicht der des Einlesens.
      erstellt: zeile.zeitpunkt ?? jetzt,
      aufgeloest: null,
      version: 0,
    });
    angelegt += 1;
  }

  return { angelegt, uebersprungen, meldungen };
}
