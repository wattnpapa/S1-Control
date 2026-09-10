/**
 * Die Schreibweisen der Oberfläche (Entwurf „Oberfläche", Abschnitt Typografie).
 *
 * Zwei Angaben stehen an mehreren Stellen zugleich — die Gesamtstärke im
 * Kopfband, im Stärkeband und in der Statuszeile, die taktische Zeit im
 * Kopfband und auf jedem Ausdruck. Sie sind deshalb **einmal** geschrieben:
 * Zwei Stellen, die dieselbe Zahl verschieden setzen, lesen sich im Einsatz
 * wie zwei verschiedene Zahlen.
 */

import type { Lagebild } from "../kontrakt/index.js";

type Staerke = Lagebild["gesamtstaerke"];

/** Die Summe aus Führern, Unterführern und Mannschaft. */
export function gesamt(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

/**
 * Die Gesamtstärke in der Schreibweise der Führungsstelle: `24/61/183 // 268`.
 *
 * Der doppelte Schrägstrich trennt die Gliederung von der Summe. Er ist nicht
 * Zierrat: `24/61/183/268` liest sich als vier gleichrangige Zahlen, und genau
 * das ist die Summe nicht.
 */
export function staerkeText(staerke: Staerke): string {
  const { fuehrer: f, unterfuehrer: u, mannschaft: m } = staerke;
  return `${String(f)}/${String(u)}/${String(m)} // ${String(gesamt(staerke))}`;
}

const MONATE = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

function zwei(zahl: number): string {
  return String(zahl).padStart(2, "0");
}

/**
 * Die taktische Zeit, ohne Zonenbuchstaben: `101443SEP26`.
 *
 * Gelesen wird die **Ortszeit** des Arbeitsplatzes, denn danach richtet sich
 * die Führungsstelle. Der Zonenbuchstabe fehlt bewusst (Entwurf): Er wäre
 * entweder falsch (fest „Z" bei Ortszeit) oder eine Angabe, die niemand
 * pflegt.
 */
export function taktischeZeit(jetzt: number): string {
  const zeitpunkt = new Date(jetzt);
  if (Number.isNaN(zeitpunkt.getTime())) return "—";
  const tag = zwei(zeitpunkt.getDate());
  const uhr = `${zwei(zeitpunkt.getHours())}${zwei(zeitpunkt.getMinutes())}`;
  const monat = MONATE[zeitpunkt.getMonth()] ?? "???";
  return `${tag}${uhr}${monat}${zwei(zeitpunkt.getFullYear() % 100)}`;
}
