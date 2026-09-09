/**
 * Der Abgleich mit dem lokalen Spiegel beim Öffnen und die Bestimmung des
 * Kettenankers — KONZEPT-SPEICHER.md §5.3, §5.5 und §2.3.
 *
 * Beides gehört zusammen, weil beides dieselbe Quelle benutzt: den **eigenen,
 * geprüften** Spiegel. Der Anker einer fremden Datei wird daraus berechnet, nie
 * aus der Share-Datei übernommen — ein aus der zu prüfenden Datei übernommener
 * Anker prüfte nichts.
 */

import type { Dateisystem } from "./dateisystem.js";
import type { Identitaetenbuch } from "./identitaeten.js";
import { grenzeUndKette, kettenanker, type Segmentquelle } from "./kettenanker.js";
import { Dateilage } from "./leserlage.js";
import { segmentText, zerlegeEreignisDateiname, type Einsatzablage } from "./pfade.js";
import { angekuendigterNachfolger } from "./segmentlese.js";
import { neuerFremderOffset } from "./uploadZustand.js";
import { leseZeilengrenzen } from "./zeile.js";
import type { Zeitquelle } from "./zeit.js";

export interface AbgleichOptionen {
  readonly dateisystem: Dateisystem;
  readonly ablage: Einsatzablage;
  readonly zeit: Zeitquelle;
  readonly eigenesPraefix: string;
  readonly identitaeten: Identitaetenbuch;
  readonly lagen: Map<string, Dateilage>;
}

/**
 * Setzt `leseOffset` und die Identitätenmenge aus dem lokalen Spiegel.
 *
 * §5.5 sagt zu, dass der Spiegel einer fremden Datei „ihr geprüftes Präfix"
 * ist; daraus folgt, dass seine Länge genau `leseOffset` ist. Der Abgleich
 * macht `upload-state.json` damit zu dem, was §4.4 auch über `schreiber.json`
 * sagt: einem Beschleuniger, keinem Wahrheitsträger. Er ist nicht bloß
 * Vorsicht, sondern nötig — nach einem Kennungswechsel (§4.5, Schritt 6) ist
 * die eigene alte Datei plötzlich eine fremde, deren Spiegel bereits
 * vollständig dasteht. Ohne Abgleich läse der Leser sie ab Byte 0 erneut und
 * hängte ihren gesamten Inhalt ein zweites Mal an den eigenen Spiegel an —
 * genau der doppelte Anhang, den §5.4.2 als den einen Fehler benennt, den
 * dieses Verfahren ausschließen soll.
 *
 * Zugleich baut er die Menge der gesehenen Identitäten auf, die §5.3 „beim
 * Öffnen aus dem lokalen Spiegel" verlangt.
 *
 * **Ohne Kettenprüfung**, und das ist Absicht: Gesucht ist die Länge des
 * Spiegels und der Kettenwert an ihr, kein Urteil. Eine Prüfung bräuchte den
 * Anker dieser Datei — bei einem fremden Ersatzsegment ist das eine innere
 * Zeile des ersetzten Segments (§4.6, Schritt 3) —, und mit dem falschen Anker
 * fiele `leseOffset` auf 0 zurück.
 */
export async function gleicheMitSpiegelAb(optionen: AbgleichOptionen): Promise<void> {
  const namen = await optionen.dateisystem.listeVerzeichnis(optionen.ablage.lokalEreignisse);
  const jePraefix = new Map<string, { name: string; segment: number }[]>();
  for (const name of namen) {
    const kennung = zerlegeEreignisDateiname(name);
    if (kennung === undefined || kennung.praefix === optionen.eigenesPraefix) continue;
    const liste = jePraefix.get(kennung.praefix) ?? [];
    liste.push({ name, segment: kennung.segment });
    jePraefix.set(kennung.praefix, liste);
  }

  for (const liste of jePraefix.values()) {
    for (const { name } of liste.sort((a, b) => a.segment - b.segment)) {
      const bytes = await optionen.dateisystem.liesAb(optionen.ablage.lokalDatei(name), 0);
      const { endeOffset, letzteKette } = grenzeUndKette(bytes);
      const zeilen = leseZeilengrenzen(bytes, 0).zeilen;
      optionen.identitaeten.merkeAlle(zeilen);
      const lage =
        optionen.lagen.get(name) ?? new Dateilage(name, neuerFremderOffset(), optionen.zeit());
      lage.offsets = {
        ...lage.offsets,
        leseOffset: endeOffset,
        letzteKette,
        abgeschlossen: lage.offsets.abgeschlossen || angekuendigterNachfolger(zeilen) !== undefined,
      };
      lage.ankerBekannt = true;
      lage.gesehenesEnde = endeOffset;
      optionen.lagen.set(name, lage);
    }
  }
}

/** Die Segmente einer fremden Kennung aus dem lokalen Spiegel (§5.5). */
export function spiegelquelle(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
  praefix: string,
): Segmentquelle {
  return async (segment) => {
    const name = `${praefix}.${segmentText(segment)}.jsonl`;
    try {
      return await dateisystem.liesAb(ablage.lokalDatei(name), 0);
    } catch {
      return undefined;
    }
  };
}

/**
 * Der Kettenanker einer neu entdeckten Datei (§2.3, Sonderfälle).
 *
 * `undefined` heißt „noch nicht bestimmbar", nicht „defekt": Der Aufrufer stellt
 * die Datei zurück, statt sie in Quarantäne zu setzen.
 */
export async function anfangsKette(
  dateiname: string,
  bytes: Uint8Array,
  quelleFuer: (praefix: string) => Segmentquelle,
): Promise<string | undefined> {
  const kennung = zerlegeEreignisDateiname(dateiname);
  if (kennung === undefined) return undefined;
  return kettenanker(kennung.segment, bytes, quelleFuer(kennung.praefix));
}
