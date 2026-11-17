/**
 * Das Druckverzeichnis prüfen statt still anlegen (Audit Fernmelder P2-11).
 *
 * Ein falsch getippter Share-Pfad („/nonexistent/zzz/ordner“) wurde beim
 * Probedruck und beim Automatikdruck angelegt und als „geschrieben“ gemeldet;
 * der Automatikdruck lief danach „erfolgreich“ in einen Ordner, aus dem
 * niemand druckt. Ein Druckziel ist ein vorhandener Ordner, den jemand
 * eingerichtet hat — anlegen nur auf ausdrückliche Rückfrage.
 *
 * Gilt in beiden Schalen: Die Web-Schale nutzt dieselbe Vermittlung, das
 * Verzeichnis liegt dann auf dem Rechner des Dienstes.
 */

import path from "node:path";

import type { Dateisystem } from "@s1/speicher";

import type { Verzeichnispruefung } from "../kontrakt/index.js";

/** Der Name der Probedatei; ein Punkt vorn, damit ein Druckordner-Wächter sie übergeht. */
const PROBEDATEI = ".s1control-schreibprobe";

/**
 * Gibt es das Verzeichnis, und lässt sich darin schreiben? Die Schreibprobe
 * legt eine leere Datei an und nimmt sie wieder weg; ein Fehler dabei heißt
 * „nicht beschreibbar“, nicht „Fehler“.
 */
export async function verzeichnisPruefen(pfad: string, dateisystem: Dateisystem, anlegen = false): Promise<Verzeichnispruefung> {
  const ordner = pfad.trim();
  if (ordner === "") return { vorhanden: false };
  if (!(await dateisystem.existiert(ordner))) {
    // Anlegen nur auf ausdrückliche Rückfrage (FM P2-11); scheitert es, fehlt es eben.
    if (!anlegen) return { vorhanden: false };
    try {
      await dateisystem.legeVerzeichnisAn(ordner);
    } catch {
      return { vorhanden: false };
    }
  }
  const probe = path.join(ordner, PROBEDATEI);
  try {
    await dateisystem.schreibeUeberOhneSync(probe, new Uint8Array());
  } catch {
    return { vorhanden: true, beschreibbar: false };
  }
  try {
    await dateisystem.loesche(probe);
  } catch {
    // Die Probe bleibt liegen; geschrieben werden konnte trotzdem.
  }
  return { vorhanden: true, beschreibbar: true };
}

/** Die Meldung, wenn das Verzeichnis fehlt — Probedruck und Druckeinstellungen sagen dasselbe. */
export function verzeichnisFehltText(pfad: string): string {
  return `Das Verzeichnis „${pfad}“ gibt es nicht. Es wurde nichts angelegt; prüfen Sie den Pfad oder legen Sie es ausdrücklich an.`;
}
