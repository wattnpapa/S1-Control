/**
 * Die Spaltenreihenfolge der Einheitentabelle am Bildschirm.
 *
 * Die Projektion folgt der Excel (Status steht dort bei Z). Am Bildschirm
 * zählt, was bei der Führung zuerst gelesen und geändert wird: Bezeichnung
 * und Status stehen links nebeneinander; der Rest behält seine Reihenfolge.
 * Die Spaltenwahl (Gruppen) bleibt unberührt — es wird nur umsortiert.
 */

import type { Spalte } from "@s1/domaene";

const VORNE = ["bezeichnung", "status"] as const;

export function spaltenFuerAnzeige(spalten: readonly Spalte[]): readonly Spalte[] {
  const vorne = VORNE.flatMap((schluessel) => spalten.filter((spalte) => spalte.schluessel === schluessel));
  const rest = spalten.filter((spalte) => !(VORNE as readonly string[]).includes(spalte.schluessel));
  return [...vorne, ...rest];
}
