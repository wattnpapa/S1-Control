/**
 * Die Vermerke der FmZ an einem Ausgang, in Worten für den Verfasser
 * (Audit zweite Runde R2-FaBe P0-2, R2-SGL P3-4).
 *
 * Der Fachberater las „Quittung 172040NOV26 Fm“ und „angenommen 2040 Fm“ als
 * Bestätigung des Empfängers — beides sind Vermerke der eigenen
 * Fernmeldezentrale. Hier stehen die Sätze, die Lese-Ansicht, Ausgang und
 * Vorschau gleich zeigen:
 *
 * - die Annahme heißt „angenommen (FmZ) 2040 Fm“ — die FmZ hat sie, nicht
 *   der Empfänger;
 * - die Beförderung heißt, was ihre Zeit ist: „Quittung der Gegenstelle
 *   1720 Ha“ — die Uhrzeit, zu der die Gegenstelle den Empfang quittiert hat
 *   (die Beförderungsmaske belegt sie nicht mehr vor);
 * - ohne Beförderung steht „noch nicht übermittelt“, damit niemand eine
 *   angenommene Nachricht für angekommen hält.
 *
 * Reine Funktionen ohne DOM; die Zeiten vierstellig wie auf dem Vordruck.
 */

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { uhrzeit } from "./nachrichtenformate.js";

/** Der Satz, solange ein Ausgang die FmZ nicht verlassen hat. */
export const TEXT_NICHT_UEBERMITTELT = "noch nicht übermittelt";

/** Die Beschriftung des Beförderungsvermerks eines Ausgangs. */
export const TITEL_QUITTUNG_GEGENSTELLE = "Quittung der Gegenstelle";

type Vermerkzeile = Pick<Nachrichtenzeile, "annahme" | "befoerderung">;

/** „angenommen (FmZ) 2040 Fm“ — oder `undefined` ohne Annahme. */
export function annahmetext(zeile: Vermerkzeile): string | undefined {
  const a = zeile.annahme;
  return a === undefined ? undefined : `angenommen (FmZ) ${uhrzeit(a.zeitpunkt)} ${a.handzeichen}`.trim();
}

/** „Quittung der Gegenstelle 1720 Ha (Funk)“ — oder „noch nicht übermittelt“. */
export function quittungstext(zeile: Vermerkzeile, mitMittel = true): string {
  const b = zeile.befoerderung;
  if (b === undefined) return TEXT_NICHT_UEBERMITTELT;
  const mittel = mitMittel ? ` (${projektion.mittelWort(b.mittel)})` : "";
  return `${TITEL_QUITTUNG_GEGENSTELLE} ${uhrzeit(b.zeitpunkt)} ${b.handzeichen}${mittel}`;
}

/** Beide Vermerke eines Ausgangs in einer Zeile: „angenommen (FmZ) 2040 Fm · Quittung der Gegenstelle 2041 Ha (Funk)“. */
export function ausgangsvermerk(zeile: Vermerkzeile): string {
  const annahme = annahmetext(zeile);
  return annahme === undefined ? quittungstext(zeile) : `${annahme} · ${quittungstext(zeile)}`;
}

/** Ob der Satz für die Zeile gilt: nur ein Ausgang wird von der FmZ befördert. */
export function istAusgang(zeile: Pick<Nachrichtenzeile, "richtungKurz">): boolean {
  return zeile.richtungKurz === "A";
}
