/**
 * Die Schwelle vor dem Sichter je Vorrang (Audits Nachrichten Runde 2:
 * R2-FM P2-5, R2-Si P2-2).
 *
 * Bis hier galt vor dem Sichter dieselbe Schwelle wie in der FmZ (Vorbelegung
 * 20 Minuten) — für Blitz wie für Einfach. Bei einem besetzten, aber säumigen
 * Sichter (Funkgerät, Telefon, Tür) lag ein Blitz so bis zu 20 Minuten, bevor
 * die FmZ ihn selbst verteilen durfte, und der Knopf „Ich sichte jetzt
 * selbst“ fehlte ganz, solange der Sichter in der Präsenz stand.
 *
 * Jetzt: Blitz 5, Sofort 10, Einfach die Schwelle der FmZ — je als Parameter
 * des Einsatzes (`sichterSchwelleBlitzMinuten`, `sichterSchwelleSofortMinuten`).
 * Eine Vorrangschwelle über der des Einsatzes gilt nicht: Ein Blitz wartet nie
 * länger als eine einfache Nachricht (`Math.min`).
 */

import { SICHTER_SCHWELLE_BLITZ_VORBELEGUNG, SICHTER_SCHWELLE_SOFORT_VORBELEGUNG } from "../werte.js";
import type { Feld, Zustand } from "../zustand.js";

/** Die drei Schwellen in Minuten, nach Vorrangstufe: [Blitz, Sofort, einfach]. */
export type Sichterschwellen = readonly [number, number, number];

function minuten(feld: Feld<number> | undefined, vorbelegung: number): number {
  const wert = feld?.wert;
  return typeof wert === "number" && Number.isFinite(wert) && wert > 0 ? wert : vorbelegung;
}

/** Die Schwellen des Einsatzes; `einfach` ist die Schwelle der FmZ (`fmzSchwelle`). */
export function sichterschwellen(zustand: Zustand, einfach: number): Sichterschwellen {
  const blitz = minuten(zustand.einsatz?.sichterSchwelleBlitzMinuten, SICHTER_SCHWELLE_BLITZ_VORBELEGUNG);
  const sofort = minuten(zustand.einsatz?.sichterSchwelleSofortMinuten, SICHTER_SCHWELLE_SOFORT_VORBELEGUNG);
  return [Math.min(blitz, einfach), Math.min(sofort, einfach), einfach];
}

/** Die Schwelle einer Zeile nach ihrer Vorrangstufe (0 Blitz, 1 Sofort, 2 einfach). */
export function sichterschwelleFuer(schwellen: Sichterschwellen, vorrangstufe: 0 | 1 | 2): number {
  return schwellen[vorrangstufe];
}
