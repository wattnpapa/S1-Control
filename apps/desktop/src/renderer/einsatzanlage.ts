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
  /** Das Datum für den Ordner der Einsatzdatei, `JJJJ-MM-TT`. */
  readonly datum: string;
  readonly stammdaten: Stammdateneingabe;
}

export const TEXT_STAMMDATEN_NACHTRAGEN =
  "Der Einsatz ist angelegt, aber übergeordnete Führungsstelle oder Einsatzort sind nicht gespeichert – bitte im Blatt Führungsstelle unter Stammdaten nachtragen.";

/** Was gegen die Anlage spricht, als Satz — sonst `undefined`. */
export function anlagefehler(anlage: Einsatzanlage): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(anlage.datum)) return "Das Datum fehlt.";
  return eingabeFehler(anlage.stammdaten);
}

/** Legt an, öffnet und schreibt die freien Felder nach. `true`, wenn der Einsatz angelegt ist. */
export async function legeEinsatzMitStammdatenAn(anlage: Einsatzanlage): Promise<boolean> {
  const eingabe = anlage.stammdaten;
  const beginn = zeitpunktAusEingabe(eingabe.beginn.trim());
  if (beginn === undefined || anlagefehler(anlage) !== undefined) return false;
  const angelegt: Einsatzstammdaten = {
    name: eingabe.name.trim(),
    art: eingabe.art,
    fuestName: eingabe.fuestName.trim(),
    beginn,
    schichtmodell: eingabe.schichtmodell,
  };
  const einsatzId = await useLaden.getState().legeEinsatzAn(angelegt.name, anlage.datum, {
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
