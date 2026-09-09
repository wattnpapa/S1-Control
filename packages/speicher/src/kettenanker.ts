/**
 * Der Kettenanker eines Segments — KONZEPT-SPEICHER.md §2.3, Sonderfälle.
 *
 * §2.3 nennt drei Fälle, und sie sind **nicht** gleich:
 *
 * > - Erste Zeile des **ersten** Segments eines Clients in einem Einsatz:
 * >   `vorgaenger` = 32 Nullen.
 * > - Erste Zeile eines **Folgesegments**: `vorgaenger` = Kettenprüfsumme der
 * >   letzten Zeile des Vorgängersegments. Die Kette läuft also über den
 * >   Segmentwechsel hinweg durch (§4.3).
 * > - Erste Zeile eines **Ersatzsegments** (§4.6): `vorgaenger` =
 * >   Kettenprüfsumme der letzten **unbeschädigten** Zeile des ersetzten
 * >   Segments. Das ist bewusst nicht dessen letzte Zeile — die Kette schließt
 * >   an der Stelle an, ab der repariert wird.
 *
 * Diese Datei ist die **einzige** Stelle, an der diese drei Fälle
 * unterschieden werden. Der Grund steht im Fehlerbild, das ihr Fehlen erzeugt:
 * Wer für jedes Segment 32 Nullen annimmt, hält jede Datei ab Segment 1 für
 * kettenfalsch — und zwar still, weil die Prüfung schon an Byte 0 abbricht und
 * die Datei damit „leer" aussieht.
 *
 * **Berechnet, nicht übernommen.** Der Anker wird aus den eigenen Bytes
 * ausgerechnet, nie aus dem `vorgaenger`-Feld der zu prüfenden Zeile gelesen.
 * Ein aus der Datei übernommener Anker prüfte nichts.
 *
 * Die Kettenprüfsumme einer Zeile ist nach §2.3 der SHA-256 über ihre
 * vollständigen Bytes — sie hängt an keinem Anker. Deshalb kommt diese Datei
 * ohne Kettenprüfung aus und benutzt {@link leseZeilengrenzen}; sie sucht
 * Zeilengrenzen, sie beurteilt nichts.
 */

import { KETTE_ANFANG, kettenPruefsumme } from "./pruefsummen.js";
import {
  TYP_SEGMENT_ABGESCHLOSSEN,
  TYP_SEGMENT_ERSETZT,
  ersatzAus,
  nachfolgerAus,
} from "./verwaltungsereignisse.js";
import { leseZeilengrenzen } from "./zeile.js";

/**
 * Liefert die Bytes eines Segments derselben Schreiberkennung, oder
 * `undefined`, wenn es nicht vorliegt.
 *
 * Gefragt wird immer die **eigene, geprüfte** Seite — der lokale Spiegel oder
 * die eigenen lokalen Segmente —, nie der Share. Sonst ließe sich der Anker
 * aus derselben Quelle fälschen, gegen die er prüfen soll.
 */
export type Segmentquelle = (segment: number) => Promise<Uint8Array | undefined>;

/**
 * Der `vorgaenger`, den die erste Zeile dieses Segments tragen muss.
 *
 * @param segment       Nummer des Segments, dessen Anker gesucht ist.
 * @param segmentBytes  Die Bytes dieses Segments — nur, um an seiner ersten
 *                      Zeile ein Ersatzsegment zu erkennen.
 * @param quelle        Zugriff auf die übrigen Segmente derselben Kennung.
 * @returns `undefined`, wenn der Anker (noch) nicht bestimmbar ist. Das ist
 *          kein Defekt: Der Aufrufer stellt die Datei zurück, statt sie zu
 *          verurteilen.
 */
export async function kettenanker(
  segment: number,
  segmentBytes: Uint8Array,
  quelle: Segmentquelle,
  quelleIstVollstaendig = false,
): Promise<string | undefined> {
  if (segment === 0) return KETTE_ANFANG;

  const erste = leseZeilengrenzen(segmentBytes, 0).zeilen[0];
  if (erste !== undefined && erste.rahmen.typ === TYP_SEGMENT_ERSETZT) {
    const ersatz = ersatzAus(erste.rahmen["nutzlast"]);
    if (ersatz === undefined) return undefined;
    return ketteAnStelle(ersatz.ersetztesSegment, ersatz.abOffset, quelle, quelleIstVollstaendig);
  }

  return ketteAmEnde(segment - 1, quelle, quelleIstVollstaendig);
}

/**
 * Die Kettenprüfsumme der Zeile, die in `segment` genau bei `offset` endet
 * (§4.6, Schritt 3).
 *
 * `offset === 0` heißt: Der Ersatz beginnt vor der ersten Zeile des ersetzten
 * Segments. Dann ist der Anker der desselben Segments, also die Kette am Ende
 * seines Vorgängers.
 */
export async function ketteAnStelle(
  segment: number,
  offset: number,
  quelle: Segmentquelle,
  quelleIstVollstaendig = false,
): Promise<string | undefined> {
  if (offset === 0) {
    // **Der Anker ist der des ersetzten Segments selbst, nicht der seines
    // Vorgängers.** Für ein gewöhnliches Segment ist das dasselbe (§2.3: „die
    // Kettenprüfsumme der letzten Zeile des Vorgängersegments"), für ein
    // **Ersatzsegment** nicht: Es setzt nach §4.6 Schritt 3 auf der letzten
    // unbeschädigten Zeile des von ihm ersetzten Segments auf, irgendwo in
    // dessen Mitte. Wird ein Ersatzsegment selbst beschädigt, und zwar gleich
    // an seiner ersten Zeile, dann ersetzt der Ersatz des Ersatzes es ab
    // Offset 0 — und die Frage lautet, worauf **es** aufsetzte, nicht was
    // hinter seinem Vorgänger steht.
    //
    // Ohne diese Unterscheidung trägt die erste Zeile des zweiten
    // Ersatzsegments einen Anker, den der Start nicht nachvollziehen kann:
    // `bereiteSchreiberVor` bricht mit `LokalerKettenbruch` an Byte 0 ab, und
    // der Client kommt an seine eigene Akte nie wieder heran (§8, Grundsatz;
    // §8.8 Punkt 5). Befund aus der Simulation M0.4.
    //
    // Die Rekursion endet: Ein Ersatzsegment trägt immer eine **höhere**
    // Nummer als das von ihm ersetzte (§4.6 Schritt 1, „die nächste freie
    // Nummer"), die Frage wandert also stets zu kleineren Segmenten.
    if (segment === 0) return KETTE_ANFANG;
    const bytes = await quelle(segment);
    if (bytes === undefined) return undefined;
    return kettenanker(segment, bytes, quelle, quelleIstVollstaendig);
  }
  const bytes = await quelle(segment);
  if (bytes === undefined) return undefined;
  const zeile = leseZeilengrenzen(bytes, 0).zeilen.find((z) => z.offset + z.laenge === offset);
  return zeile === undefined ? undefined : kettenPruefsumme(zeile.bytes);
}

/**
 * Die Kettenprüfsumme der letzten Zeile eines Segments — der Anker seines
 * Nachfolgers (§2.3, §4.3).
 *
 * **Nur, wenn dieses Segment abgeschlossen ist.** §2.3 sagt „Kettenprüfsumme
 * der letzten Zeile des Vorgängersegments", und §4.3 legt fest, woran man die
 * letzte Zeile erkennt: an der Abschlusszeile, die den Nachfolger ankündigt.
 * Ohne diese Bedingung nimmt der Leser die letzte Zeile, die er **bisher**
 * gespiegelt hat — und die ist es nur zufällig. Genau daraus entsteht das
 * Fehlerbild, gegen das dieser Anker gebaut wurde, nur umgekehrt: Ein Leser,
 * der den Vorgänger erst zur Hälfte gelesen hat und den Nachfolger im selben
 * Durchlauf anfasst, berechnet einen falschen Anker, findet die erste Zeile
 * des Nachfolgers kettenfalsch und setzt eine **gesunde** Datei nach §8.2
 * **dauerhaft** in Quarantäne — mit dem sichtbaren Hinweis, die Einträge
 * dieses Arbeitsplatzes seien beschädigt. Das ist eine nachweislich falsche
 * Aussage über einen anderen Arbeitsplatz, und sie ist nicht heilbar: §8.2
 * Punkt 5 prüft die Stelle nur beim Programmstart erneut, und dort steht
 * dieselbe halb gelesene Datei. Befund aus der Simulation M0.4.
 *
 * `undefined` heißt deshalb hier wie überall „noch nicht bestimmbar": Der
 * Aufrufer stellt die Datei zurück (§5.5) und versucht es im nächsten
 * Durchlauf, wenn der Vorgänger weiter gelesen ist. Die Verfallsregel aus §6.2
 * sorgt dafür, dass eine dauerhaft unbestimmbare Datei nicht für den Rest der
 * Lage den kurzen Takt kostet.
 */
export async function ketteAmEnde(
  segment: number,
  quelle: Segmentquelle,
  quelleIstVollstaendig = false,
): Promise<string | undefined> {
  if (segment < 0) return KETTE_ANFANG;
  const bytes = await quelle(segment);
  if (bytes === undefined) return undefined;
  const zeilen = leseZeilengrenzen(bytes, 0).zeilen;
  const letzte = zeilen.at(-1);
  if (letzte === undefined) {
    // Ein **leeres** Segment trägt nichts zur Kette bei. Bei vollständiger
    // Quelle — den eigenen lokalen Dateien — darf die Frage deshalb an den
    // Vorgänger weitergehen: Eine leere Datei entsteht, wenn der erste Anhang
    // an ein neues Segment scheitert (§8.8) und danach ein Ersatzsegment oder
    // ein Kennungswechsel folgt. Bei einem **Spiegel** darf sie das nicht: Dort
    // heißt „leer" auch „noch nichts gelesen", und der Vorgänger wäre der
    // falsche Anker.
    if (!quelleIstVollstaendig) return undefined;
    return segment === 0 ? KETTE_ANFANG : ketteAmEnde(segment - 1, quelle, true);
  }
  // §4.3: Erst die Abschlusszeile macht eine Zeile zur letzten — **wenn die
  // Quelle ein Spiegel ist**. Der Schreiber kennt seine eigenen Dateien
  // vollständig; für ihn ist die letzte Zeile die letzte Zeile, auch ohne
  // Abschlusszeile (etwa bei einem nach §4.6 ersetzten Segment, das nie eine
  // bekommt). Für einen Leser gilt das nicht: Sein Spiegel ist nach §5.5 nur
  // das geprüfte Präfix, und seine bisher letzte Zeile ist es nur zufällig.
  if (!quelleIstVollstaendig && letzte.rahmen.typ !== TYP_SEGMENT_ABGESCHLOSSEN) return undefined;
  if (
    !quelleIstVollstaendig &&
    nachfolgerAus(letzte.rahmen["nutzlast"]) === undefined
  ) {
    return undefined;
  }
  return kettenPruefsumme(letzte.bytes);
}

/**
 * Die Kettenprüfsumme am Ende eines Byte-Abschnitts, ohne Kettenprüfung.
 *
 * Für die eigenen und die gespiegelten Bytes, die nach §5.4.1 und §5.5 bereits
 * geprüft sind: Gesucht ist dort die Zeilengrenze und der Wert an ihr, nicht
 * ein Urteil über die Kette. Eine Prüfung mit falschem Anker wäre genau der
 * Fehler, den {@link kettenanker} behebt.
 */
export function grenzeUndKette(
  bytes: Uint8Array,
  abOffset = 0,
  ketteBeiAbOffset = KETTE_ANFANG,
): { readonly endeOffset: number; readonly letzteKette: string } {
  const gelesen = leseZeilengrenzen(bytes, abOffset);
  const letzte = gelesen.zeilen.at(-1);
  return {
    endeOffset: gelesen.endeOffset,
    letzteKette: letzte === undefined ? ketteBeiAbOffset : kettenPruefsumme(letzte.bytes),
  };
}
