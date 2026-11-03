/**
 * Einen Einsatz mit seinen Stammdaten anlegen (Entwurf „Entlastung", 3.8;
 * Audit neuer Nutzer P1-5: bis Runde 6 entstand ein Einsatz ohne
 * Stammdaten, mit dem Anzeigenamen als Führungsstelle).
 *
 * **Ohne neuen Ruf.** `einsatzAnlegen` trägt schon Art, FüSt, Beginn und
 * Schichtmodell; die zwei freien Felder (übergeordnete Führungsstelle,
 * Einsatzort) kennt er nicht. Sie gehen gleich danach als
 * `EinsatzStammdatenGeaendert` hinterher, wie aus der Stammdatenmaske, mit
 * dem Wert der Anlage als Vorher-Wert. Scheitert das, ist der Einsatz trotzdem
 * angelegt und offen; ein Hinweis sagt, wo die Angaben nachzutragen sind.
 */

import type { Einsatzstammdaten } from "@s1/domaene";

import { zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import { useLaden } from "./laden.js";
import { eingabeFehler, stammdatenEntwuerfe, type Stammdateneingabe } from "./stammdatenformular.js";

export interface Einsatzanlage {
  /** Das Datum für den Ordner der Einsatzdatei, wie getippt: `TT.MM.JJJJ`. */
  readonly datum: string;
  readonly stammdaten: Stammdateneingabe;
}

export const TEXT_STAMMDATEN_NACHTRAGEN =
  "Der Einsatz ist angelegt, aber übergeordnete Führungsstelle oder Einsatzort sind nicht gespeichert – bitte im Blatt Führungsstelle unter Stammdaten nachtragen.";

/**
 * „03.11.2026" als `2026-11-03` — oder `undefined`, wenn es kein Tag ist.
 * Ein Textfeld und kein Datumsfeld des Browsers: Dessen Schreibweise folgt
 * der Sprache des Betriebssystems, und „11/03/2026" liest ein deutscher
 * Helfer als 11. März.
 */
export function datumAusEingabe(eingabe: string): string | undefined {
  const teile = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/u.exec(eingabe.trim());
  if (teile === null) return undefined;
  const [tag, monat, jahr] = [Number(teile[1]), Number(teile[2]), Number(teile[3])];
  const datum = new Date(Date.UTC(jahr, monat - 1, tag));
  if (datum.getUTCDate() !== tag || datum.getUTCMonth() !== monat - 1) return undefined;
  return datum.toISOString().slice(0, 10);
}

/** Was gegen die Anlage spricht, als Satz — sonst `undefined`. */
export function anlagefehler(anlage: Einsatzanlage): string | undefined {
  if (datumAusEingabe(anlage.datum) === undefined) return "Das Datum ist nicht lesbar (TT.MM.JJJJ).";
  return eingabeFehler(anlage.stammdaten);
}

/** Legt an, öffnet und schreibt die freien Felder nach. `true`, wenn der Einsatz angelegt ist. */
export async function legeEinsatzMitStammdatenAn(anlage: Einsatzanlage): Promise<boolean> {
  const eingabe = anlage.stammdaten;
  const beginn = zeitpunktAusEingabe(eingabe.beginn.trim());
  const datum = datumAusEingabe(anlage.datum);
  if (beginn === undefined || datum === undefined || anlagefehler(anlage) !== undefined) return false;
  const angelegt: Einsatzstammdaten = {
    name: eingabe.name.trim(),
    art: eingabe.art,
    fuestName: eingabe.fuestName.trim(),
    beginn,
    schichtmodell: eingabe.schichtmodell,
  };
  const einsatzId = await useLaden.getState().legeEinsatzAn(angelegt.name, datum, {
    einsatzArt: angelegt.art,
    fuestName: angelegt.fuestName,
    beginn,
    schichtmodell: angelegt.schichtmodell,
  });
  if (einsatzId === undefined) return false;
  for (const entwurf of stammdatenEntwuerfe(einsatzId, angelegt, eingabe)) {
    const ergebnis = await useLaden.getState().bediene(entwurf);
    if (ergebnis?.art !== "geschrieben") {
      useLaden.getState().melde("warnung", TEXT_STAMMDATEN_NACHTRAGEN);
      break;
    }
  }
  return true;
}
