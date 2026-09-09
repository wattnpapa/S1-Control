/**
 * Welche eigenen Segmente bereits nach §4.6 ersetzt wurden.
 *
 * Nichts wird dafür zusätzlich gespeichert: Die Auskunft steht in den eigenen
 * Ersatzsegmenten selbst. Deren erste Zeile ist nach §4.6 Schritt 2 ein
 * `SegmentErsetzt`, dessen Nutzlast „das ersetzte Segment und den Offset, ab
 * dem der Ersatz gilt" nennt. §1.3 Satz 3 bleibt damit gewahrt — es entsteht
 * kein Zustand, der sich nicht aus den Ereignissen ergibt.
 *
 * Gebraucht wird die Menge für die Vollprüfung beim Öffnen (§4.6.1 Auslöser 1):
 * Ein ersetztes Segment „wird nicht mehr beschrieben" (§4.6 Schritt 5), seine
 * Beschädigung auf dem Share bleibt also dauerhaft liegen. Ohne diese Auskunft
 * fiele die Prüfung bei jedem Öffnen erneut in Ausgang B und erzeugte jedes Mal
 * ein weiteres Ersatzsegment.
 */

import type { Dateisystem } from "./dateisystem.js";
import { clientPraefix, zerlegeEreignisDateiname, type Einsatzablage } from "./pfade.js";
import { TYP_SEGMENT_ERSETZT, ersatzAus } from "./verwaltungsereignisse.js";
import { leseZeilengrenzen } from "./zeile.js";

/**
 * Liest die eigenen lokalen Segmente und sammelt, welche Segmentnummern durch
 * ein Ersatzsegment ersetzt wurden.
 *
 * Gelesen wird der **lokale** Bestand: Er ist die eigene, geprüfte Seite. Auf
 * dem Share stünde dieselbe Auskunft, aber dort könnte sie beschädigt sein —
 * und genau darum geht es hier.
 */
export async function ersetzteSegmente(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
  clientId: string,
): Promise<ReadonlySet<number>> {
  const praefix = clientPraefix(clientId);
  const namen = await dateisystem.listeVerzeichnis(ablage.lokalEreignisse);
  const ersetzt = new Set<number>();
  for (const name of namen) {
    const kennung = zerlegeEreignisDateiname(name);
    if (kennung === undefined || kennung.praefix !== praefix) continue;
    let bytes: Uint8Array;
    try {
      bytes = await dateisystem.liesAb(ablage.lokalDatei(name), 0);
    } catch {
      continue;
    }
    const erste = leseZeilengrenzen(bytes, 0).zeilen[0];
    if (erste === undefined || erste.rahmen.typ !== TYP_SEGMENT_ERSETZT) continue;
    const ersatz = ersatzAus(erste.rahmen["nutzlast"]);
    if (ersatz !== undefined) ersetzt.add(ersatz.ersetztesSegment);
  }
  return ersetzt;
}
