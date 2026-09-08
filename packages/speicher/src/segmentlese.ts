/**
 * Geprüftes Lesen einer Segmentdatei — KONZEPT-SPEICHER.md §5.5.
 *
 * Die Reihenfolge ist verbindlich: geprüft wird **vor** dem Anhängen an den
 * lokalen Spiegel, nie danach. Diese Datei liefert deshalb nur das Ergebnis
 * der Prüfung; wer damit was anfängt, entscheiden Leser und Schreiber.
 *
 * Das Dateiende wird ausschließlich durch Lesen festgestellt (§5.4.2, §6.2).
 * Der Port bietet gar keine Größenabfrage an — das ist keine Disziplinfrage.
 */

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import {
  leseAbschnitt,
  type Abschnittsergebnis,
  type GeleseneZeile,
  type Identitaetenblick,
} from "./zeile.js";
import { TYP_SEGMENT_ABGESCHLOSSEN, nachfolgerAus } from "./verwaltungsereignisse.js";

/** Das Ergebnis eines Lesevorgangs samt der Frage, ob die Datei überhaupt da war. */
export interface Segmentbefund extends Abschnittsergebnis {
  /** `false`, wenn die Datei (noch) nicht existiert — bei einem angekündigten Nachfolger der Normalfall (§4.3). */
  readonly vorhanden: boolean;
  /** Anzahl der ab `abOffset` neu gelesenen Bytes; 0 heißt „nichts Neues" (§6.2). */
  readonly neueBytes: number;
}

/**
 * Liest eine Segmentdatei ab `abOffset` und prüft jede Zeile.
 *
 * @param erwarteteKette Kettenprüfsumme an `abOffset` (§5.3). Für den Anfang
 *                       einer Kette 32 Nullen (§2.3).
 */
export async function liesSegment(
  dateisystem: Dateisystem,
  pfad: string,
  abOffset = 0,
  erwarteteKette: string = KETTE_ANFANG,
  identitaeten?: Identitaetenblick,
): Promise<Segmentbefund> {
  let bytes: Uint8Array;
  try {
    bytes = await dateisystem.liesAb(pfad, abOffset);
  } catch (fehler) {
    if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
      return {
        vorhanden: false,
        neueBytes: 0,
        zeilen: [],
        endeOffset: abOffset,
        letzteKette: erwarteteKette,
        abschluss: { art: "ende" },
      };
    }
    throw fehler;
  }
  const ergebnis = leseAbschnitt(bytes, abOffset, erwarteteKette, identitaeten);
  return { ...ergebnis, vorhanden: true, neueBytes: bytes.byteLength };
}

/**
 * Die Nachfolgenummer, wenn die letzte gelesene Zeile eine Abschlusszeile ist
 * (§4.3); sonst `undefined`.
 *
 * Das ist die einzige Stelle, an der ein Leser erfährt, dass ein Segment
 * „endgültig fertig ist und nie wieder gepollt werden muss" (§6.2) — und dass
 * ein Nachfolger angekündigt, aber vielleicht noch nicht vorhanden ist.
 */
export function angekuendigterNachfolger(zeilen: readonly GeleseneZeile[]): number | undefined {
  const letzte = zeilen.at(-1);
  if (letzte === undefined || letzte.rahmen.typ !== TYP_SEGMENT_ABGESCHLOSSEN) return undefined;
  return nachfolgerAus(letzte.rahmen["nutzlast"]);
}
