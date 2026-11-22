/**
 * Ob der Einsatz den LdF als Station im Nachrichtenweg führt
 * (KONZEPT-NACHRICHTEN.md §5, geändert 2026-11-22).
 *
 * Mit dem LdF zu arbeiten ist der Standard: Ohne Parameter `ldfStation` gilt
 * er als Station, abgeschaltet ist er nur mit einem ausdrücklichen `false`
 * (Stammdaten, „LdF als eigene Station“). Bis FOLD_VERSION 16 galt ein
 * fehlender Parameter als „nein“, und ältere Einsätze liefen ohne LdF.
 */

import type { Zustand } from "./zustand.js";

/** Der Wert des Parameters, wie der Fold ihn liest: fehlt er, gilt ja. */
export function ldfStationWert(wert: unknown): boolean {
  return wert !== false;
}

/** Führt der Einsatz den LdF als Station? */
export function ldfStationAn(zustand: Pick<Zustand, "einsatz">): boolean {
  return ldfStationWert(zustand.einsatz?.ldfStation?.wert);
}
