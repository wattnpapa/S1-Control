/**
 * Die Spaltenreihenfolge der Einheitentabelle am Bildschirm und die Titel
 * der Spaltengruppen.
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

/**
 * Die Spaltengruppen, wie sie am Umschalter stehen.
 *
 * In der Projektion heißen sie wie in der Excel (`KOSTENUEBERSICHT`); über
 * einer Tabelle gelesen sind Versalien ohne Umlaute keine Beschriftung,
 * sondern ein Bezeichner. Die Gruppe Funk hat kein Vorbild in der Excel
 * (KONZEPT-FUNKPLAN.md §6).
 */
export const GRUPPENTITEL: Readonly<Record<string, string>> = {
  GRUNDDATEN: "Grunddaten",
  STAERKE: "Stärke",
  RESSOURCENPLANUNG: "Ressourcen",
  LOGISTIKDATEN: "Logistik",
  KOSTENUEBERSICHT: "Kosten",
  FUNK: "Funk",
};
