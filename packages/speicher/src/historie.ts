/**
 * Die Wiederaufnahme beim Öffnen — der Fachzustand aus dem lokalen Spiegel.
 *
 * Ohne sie hat ein wiedergeöffneter Einsatz keinen Zustand. Der Grund liegt in
 * zwei Regeln, die jede für sich richtig sind und erst zusammen eine Lücke
 * lassen: Der Leser hält je fremder Datei einen `leseOffset` und liest
 * **ab** diesem Offset (§6.2), und er liest seine eigenen Dateien überhaupt
 * nicht (§5.4.1) — die kennt der Schreiber. Beide Offsets überstehen den
 * Neustart in `upload-state.json`. Nach einem Neustart kommt deshalb nichts
 * mehr an, was vor ihm geschrieben wurde: weder eigenes noch fremdes. Der
 * Ereignisstrom ist vollständig, der lokale Spiegel auch — nur die Faltung
 * beginnt leer und bleibt es, bis jemand etwas Neues schreibt.
 *
 * Diese Datei schließt die Lücke an der Stelle, die das Konzept dafür nennt:
 * im **lokalen Spiegel**. §5.3 baut die Menge der gesehenen Identitäten beim
 * Öffnen aus ihm auf, §4.4 den Undo-Stapel („Er liegt nirgends"), und für
 * beides gilt dieselbe Begründung wie hier — der Spiegel enthält nach §5.5
 * ausschließlich geprüfte Zeilen und ist damit die vollständige, bereits
 * geprüfte Quelle. Ein Schnappschuss (§7) wird diesen Weg später abkürzen; er
 * ersetzt ihn nicht, denn ein Schnappschuss ist ein Beschleuniger und keine
 * zweite Wahrheit (§1.3).
 *
 * **Ohne Kettenprüfung, und das mit Absicht.** Die Kette ist die Prüfung des
 * Leseweges *in* den Spiegel (§5.5); was dort liegt, hat sie bereits bestanden.
 * Sie hier ein zweites Mal zu ziehen hieße, für jede Datei den Anker aus ihrem
 * Vorgänger- oder ersetzten Segment zu bestimmen (§2.3) — dieselbe Arbeit, die
 * `bereiteSchreiberVor` für die eigenen Segmente ohnehin leistet — und den
 * Bediener bei einem Kettenbruch aus seiner eigenen Akte auszusperren, statt
 * ihm zu zeigen, was lesbar ist (§8, Grundsatz). Prüfsumme, Längenfeld und
 * JSON jeder Zeile werden sehr wohl geprüft; eine Datei, die mittendrin
 * abbricht, liefert ihren lesbaren Anfang und meldet den Rest als Lesefehler.
 */

import type { Dateisystem } from "./dateisystem.js";
import { DateisystemFehler } from "./dateisystem.js";
import { shareklasse } from "./fehler.js";
import { zerlegeEreignisDateiname, type Einsatzablage } from "./pfade.js";
import type { Lesefehler } from "./pollergebnis.js";
import { leseZeilengrenzen, type GeleseneZeile } from "./zeile.js";

/** Was der lokale Spiegel beim Öffnen hergibt. */
export interface Historienbefund {
  /**
   * Alle Zeilen des Spiegels — eigene wie fremde, in keiner verbindlichen
   * Ordnung. Die Faltung ordnet nach HLC (§3.1) und überspringt Wiederholungen
   * anhand der Ereignis-Id; die Aufrufer müssen hier nichts sortieren.
   */
  readonly zeilen: readonly GeleseneZeile[];
  /** Dateien, die gar nicht oder nur teilweise lesbar waren (§8.3). */
  readonly lesefehler: readonly Lesefehler[];
  /** Zahl der gelesenen Segmentdateien — für die Auskunft in der Statuszeile. */
  readonly dateien: number;
}

/**
 * Liest den gesamten lokalen Spiegel eines Einsatzes.
 *
 * Fehlt der Ereignisordner, ist das kein Fehler, sondern der erste Start
 * dieses Arbeitsplatzes auf diesem Einsatz: leerer Befund, keine Meldung.
 */
export async function liesLokaleHistorie(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
): Promise<Historienbefund> {
  const lesefehler: Lesefehler[] = [];
  let namen: readonly string[];
  try {
    namen = await dateisystem.listeVerzeichnis(ablage.lokalEreignisse);
  } catch (fehler) {
    if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
      return { zeilen: [], lesefehler: [], dateien: 0 };
    }
    return { zeilen: [], lesefehler: [alsLesefehler("ereignisse", fehler)], dateien: 0 };
  }

  // Aufsteigend nach Dateiname: Innerhalb eines Schreibers ist das die
  // Segmentordnung (§4.1). Die Faltung braucht sie nicht, ein Mensch, der die
  // Zeilen im Fehlerfall liest, sehr wohl.
  const kennungen = namen
    .map((name) => zerlegeEreignisDateiname(name))
    .filter((k) => k !== undefined)
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const zeilen: GeleseneZeile[] = [];
  let dateien = 0;
  for (const kennung of kennungen) {
    let bytes: Uint8Array;
    try {
      bytes = await dateisystem.liesAb(ablage.lokalDatei(kennung.name), 0);
    } catch (fehler) {
      lesefehler.push(alsLesefehler(kennung.name, fehler));
      continue;
    }
    dateien += 1;
    const ergebnis = leseZeilengrenzen(bytes, 0);
    for (const zeile of ergebnis.zeilen) zeilen.push(zeile);
    if (ergebnis.abschluss.art === "defekt") {
      // §8, Grundsatz: Der lesbare Anfang wird genommen, der Rest gemeldet.
      // Ein Abbruch hier machte aus einer beschädigten Zeile einen toten
      // Arbeitsplatz.
      lesefehler.push({
        datei: kennung.name,
        klasse: "dauerhaft",
        code: `${ergebnis.abschluss.grund}@${String(ergebnis.abschluss.offset)}`,
      });
    }
  }
  return { zeilen, lesefehler, dateien };
}

function alsLesefehler(datei: string, fehler: unknown): Lesefehler {
  const code = fehler instanceof DateisystemFehler ? fehler.code : "EUNKNOWN";
  return { datei, klasse: shareklasse(fehler), code };
}
