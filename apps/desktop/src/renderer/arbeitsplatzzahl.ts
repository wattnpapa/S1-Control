/**
 * Die Zahl der anderen Arbeitsplätze in Worten – Einzahl und Mehrzahl.
 *
 * Gezählt werden nur **aktive** Arbeitsplätze (Präsenz nicht veraltet); wer
 * seit Sekunden nichts mehr geschrieben hat, ist fort und gehört nicht in die
 * Zahl.
 */

import type { Lagebild } from "../kontrakt/index.js";
import { stellenname } from "./nachrichtenformate.js";

export function aktiveArbeitsplaetze(lagebild: Pick<Lagebild, "peers">): number {
  return lagebild.peers.filter((p) => !p.veraltet).length;
}

/** „1 weiterer Arbeitsplatz", „3 weitere Arbeitsplätze". */
export function weitereText(anzahl: number): string {
  return anzahl === 1 ? "1 weiterer Arbeitsplatz" : `${String(anzahl)} weitere Arbeitsplätze`;
}

/**
 * „4 weitere: FmZ, LdF, Sichter, S2“ (R2-FaBe P3-3): Die Zahl allein sagte
 * nicht, ob die Fernmeldezentrale oder der Sichter besetzt ist. Die Stellen
 * kommen aus der Präsenz der aktiven Arbeitsplätze; ohne Stellenangabe
 * bleibt der Satz wie bisher.
 */
export function weitereMitStellen(lagebild: Pick<Lagebild, "peers">): string {
  const aktiv = lagebild.peers.filter((p) => !p.veraltet);
  const stellen = [...new Set(aktiv.flatMap((p) => p.stellen ?? []).map(stellenname))];
  if (stellen.length === 0) return weitereText(aktiv.length);
  return `${String(aktiv.length)} ${aktiv.length === 1 ? "weiterer" : "weitere"}: ${stellen.join(", ")}`;
}
