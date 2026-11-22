/**
 * Die Kreuztabelle Abschnitt × Organisation der Stärketafeln (Sachgebiet 1,
 * Monitor, Gruppe S1): je Zelle die Ist-Köpfe nach der einen Zählregel
 * (`kennzahlen.zaehlklasse`). Zeilen und Spalten liefert `staerketafel`
 * (`abschnitte`, `organisationen`); hier stehen nur die Zellen, damit die
 * Ordnung an einer Stelle bleibt. Je Abschnitt zählt die **eigene** Stärke,
 * wie in den Zeilen der Abschnittstafel — die Spalten ergeben so zusammen die
 * Ist-Stärke der Organisation.
 */

import { zaehlklasse } from "../kennzahlen.js";
import type { EinheitZustand, Zustand } from "../zustand.js";

/** Der Organisationsschlüssel einer Einheit; leer, wenn keine angegeben ist. */
export function organisationsschluessel(einheit: EinheitZustand): string {
  const wert = einheit.organisation.wert;
  return typeof wert === "string" && wert !== "" ? wert : "";
}

export function kreuzzellen(zustand: Zustand): Record<string, Record<string, number>> {
  const zellen: Record<string, Record<string, number>> = {};
  for (const einheit of Object.values(zustand.einheiten)) {
    if (zaehlklasse(zustand, einheit) !== "ist") continue;
    const s = einheit.wirksameStaerke;
    const koepfe = s.fuehrer + s.unterfuehrer + s.mannschaft;
    const zeile = (zellen[einheit.wirksamerAbschnittId] ??= {});
    const org = organisationsschluessel(einheit);
    zeile[org] = (zeile[org] ?? 0) + koepfe;
  }
  return zellen;
}
