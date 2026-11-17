/**
 * Die Schreibweisen der Oberfläche (Entwurf „Oberfläche", Abschnitt Typografie).
 *
 * Zwei Angaben stehen an mehreren Stellen zugleich — die Gesamtstärke im
 * Kopfband und in der Statuszeile, die taktische Zeit im
 * Kopfband und auf jedem Ausdruck. Sie sind deshalb **einmal** geschrieben:
 * Zwei Stellen, die dieselbe Zahl verschieden setzen, lesen sich im Einsatz
 * wie zwei verschiedene Zahlen.
 */

import { datumZeitGruppe } from "@s1/domaene";

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

/**
 * Die taktische Zeit, ohne Zonenbuchstaben: `101443SEP26` — Kopfband, Monitor
 * und Ausdrucke.
 *
 * In der **Anzeigezone Europe/Berlin** und mit den Monatskürzeln der
 * Datum-Zeit-Gruppe des Vordrucks, nicht mehr in der Ortszeit des Rechners
 * (Audits Nachrichten SGL P3-16, LdF P2-4, FM P2-1): Ein Notebook auf UTC
 * zeigte im Kopf „171221NOV26“ und im Vordruck „171321nov26“. Groß
 * geschrieben, wie im Kopf vereinbart. Der Zonenbuchstabe fehlt bewusst
 * (Entwurf): Er wäre eine Angabe, die niemand pflegt.
 */
export function taktischeZeit(jetzt: number): string {
  return datumZeitGruppe(new Date(jetzt)).toUpperCase() || "—";
}
