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
import {
  TYP_SEGMENT_ABGESCHLOSSEN,
  TYP_SEGMENT_ERSETZT,
  ersatzAus,
} from "./verwaltungsereignisse.js";
import { leseZeilengrenzen, type GeleseneZeile } from "./zeile.js";

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

  /** Die Bytes je eigenem Segment, einmal gelesen. */
  const bytesJeSegment = new Map<number, Uint8Array>();
  for (const name of namen) {
    const kennung = zerlegeEreignisDateiname(name);
    if (kennung === undefined || kennung.praefix !== praefix) continue;
    try {
      bytesJeSegment.set(kennung.segment, await dateisystem.liesAb(ablage.lokalDatei(name), 0));
    } catch {
      continue;
    }
  }

  const ersetzt = new Set<number>();
  for (const [, bytes] of bytesJeSegment) {
    const zeilen = leseZeilengrenzen(bytes, 0).zeilen;
    const erste = zeilen[0];
    if (erste === undefined || erste.rahmen.typ !== TYP_SEGMENT_ERSETZT) continue;
    const ersatz = ersatzAus(erste.rahmen["nutzlast"]);
    if (ersatz === undefined) continue;
    // **Nur ein vollständiges Ersatzsegment nimmt sein Vorbild aus der
    // Prüfung.** §4.6 Schritt 4 verlangt, dass „alle Ereignisse ab dieser
    // Stelle noch einmal" geschrieben werden. Bricht das an einer lokalen
    // Schreibstörung ab (§8.8), steht die `SegmentErsetzt`-Zeile bereits — und
    // ohne diese Prüfung gälte das ersetzte Segment als erledigt, obwohl der
    // größere Teil seiner Ereignisse nirgends wiederholt wurde. Für jeden
    // Leser, der in diesem Segment nach §8.2 in Quarantäne gefallen ist, wären
    // sie damit endgültig fort: §8.6.1 Regel 4 („Danach gilt die
    // Konvergenzzusage für die betroffenen Leser wieder") wäre eine leere
    // Zusage. Ist der Ersatz unvollständig, bleibt das Segment im Blick, und
    // die Vollprüfung beim Öffnen (§4.6.1 Auslöser 1) nimmt die Reparatur
    // wieder auf. Dass dabei Zeilen ein zweites Mal geschrieben werden, ist
    // nach §4.6 ausdrücklich folgenlos — „der Fold ist eine Mengenfunktion
    // über die Ereignis-Identitäten". Befund des zweiten Gutachtens zu M0.4.
    if (istVollstaendig(bytesJeSegment.get(ersatz.ersetztesSegment), ersatz.abOffset, zeilen)) {
      ersetzt.add(ersatz.ersetztesSegment);
    }
  }
  return ersetzt;
}

/**
 * `true`, wenn das Ersatzsegment jede Zeile des ersetzten Segments ab
 * `abOffset` wiederholt (§4.6 Schritt 4).
 *
 * Verglichen werden die Ereignis-Identitäten, nicht die Bytes: Die wiederholte
 * Zeile ist nach §4.6 („Was ‚gleicher Inhalt' heißt") byteweise **nicht**
 * identisch, weil ihr `vorgaenger` ein anderer ist.
 */
function istVollstaendig(
  ersetztesSegment: Uint8Array | undefined,
  abOffset: number,
  ersatzZeilen: readonly GeleseneZeile[],
): boolean {
  // Ohne das ersetzte Segment ist nichts zu vergleichen; dann gilt der Ersatz
  // als vollständig, denn eine Wiederaufnahme hätte keine Vorlage.
  if (ersetztesSegment === undefined) return true;
  const vorhanden = new Set(ersatzZeilen.map((z) => z.rahmen.id));
  for (const zeile of leseZeilengrenzen(ersetztesSegment, 0).zeilen) {
    if (zeile.offset < abOffset) continue;
    // §4.3: Eine Abschlusszeile gehört nach §4.6 nicht in das Ersatzsegment.
    if (zeile.rahmen.typ === TYP_SEGMENT_ABGESCHLOSSEN) continue;
    if (!vorhanden.has(zeile.rahmen.id)) return false;
  }
  return true;
}
