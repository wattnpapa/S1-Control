/**
 * Die Zahl der anderen Arbeitsplätze in Worten – Einzahl und Mehrzahl.
 *
 * Gezählt werden nur **aktive** Arbeitsplätze (Präsenz nicht veraltet); wer
 * seit Sekunden nichts mehr geschrieben hat, ist fort und gehört nicht in die
 * Zahl.
 */

import type { Lagebild } from "../kontrakt/index.js";

export function aktiveArbeitsplaetze(lagebild: Pick<Lagebild, "peers">): number {
  return lagebild.peers.filter((p) => !p.veraltet).length;
}

/** „1 weiterer Arbeitsplatz", „3 weitere Arbeitsplätze". */
export function weitereText(anzahl: number): string {
  return anzahl === 1 ? "1 weiterer Arbeitsplatz" : `${String(anzahl)} weitere Arbeitsplätze`;
}
