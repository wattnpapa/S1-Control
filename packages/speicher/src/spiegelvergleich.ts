/**
 * Die drei Ausgänge des Vergleichs — KONZEPT-SPEICHER.md §5.4.3.
 *
 * Sie sind zu unterscheiden, „weil zwei davon einen Bedienerhinweis mit einer
 * Ursachenbehauptung auslösen und die dritte den einzigen Weg zurück
 * eröffnet".
 *
 * Die Unterscheidung von B und C ist der Grund, warum die Laufnummer nach §3.3
 * persistent geführt wird: „Sie ist das einzige Merkmal, das eine fremde
 * Schreibspur von verfälschten Bytes trennt. Ohne diese Trennung führte jedes
 * gekippte Byte zu einer neuen `clientId` und zur Meldung ‚Dieses
 * Benutzerprofil wurde offenbar kopiert' — einer nachweislich falschen Aussage
 * über den Rechner des Bedieners — und zugleich zu einem Schreibverbot für
 * genau den Client, der die Beschädigung als einziger heilen kann."
 *
 * Deshalb geht der Zweifel zugunsten von B aus: „Ist eine Share-Zeile ab der
 * Abweichungsstelle weder als Zeile lesbar noch einer Identität zuzuordnen
 * (verfälschte Länge, verfälschter CRC), zählt sie für diese Unterscheidung
 * nicht als fremde Schreibspur; sie stützt Ausgang B." Ausgang B ist folgenlos,
 * wenn er sich als Irrtum erweist; Ausgang C zieht einen Kennungswechsel und
 * eine Aussage über den Rechner des Bedieners nach sich.
 */

import { inhaltsSchluessel, leseZeilengrenzen, type Identitaetenblick } from "./zeile.js";

/** Der Ausgang eines Vergleichs nach §5.4.3. */
export type Vergleichsausgang =
  /**
   * Ausgang A — Präfix, kein Widerspruch (Normalfall). `gepruefteBytes` ist die
   * Zahl der Share-Bytes ab `shareOffset`, die mit den lokalen übereinstimmen;
   * ab dort wird weiter angehängt.
   */
  | { readonly art: "A"; readonly gepruefteBytes: number }
  /**
   * Ausgang B — Abweichung, aber keine fremde Schreibspur. Reparatur nach §4.6
   * ab `abOffset`, dem Offset der ersten abweichenden Zeile.
   */
  | { readonly art: "B"; readonly abOffset: number }
  /**
   * Ausgang C — fremde Schreibspur. Reaktion: Fall 2 nach §4.5. `id` benennt
   * die Zeile, die den Ausschlag gab; `grund` sagt, welches der beiden
   * Kriterien aus §5.4.3 zutraf.
   */
  | {
      readonly art: "C";
      readonly abOffset: number;
      readonly id: string;
      readonly grund: "identitaetUnbekannt" | "inhaltAbweichend";
    };

export interface VergleichEingabe {
  /** Die ab `shareOffset` **gelesenen** Share-Bytes (§5.4.2 — nie über die Dateigröße). */
  readonly shareBytes: Uint8Array;
  /** Absoluter Byte-Offset, an dem `shareBytes` beginnt. */
  readonly shareOffset: number;
  /**
   * Die eigenen lokalen Bytes derselben Datei ab 0, höchstens bis zum
   * `lokalerVollstaendigerOffset` (§5.4.1).
   */
  readonly lokaleBytes: Uint8Array;
  /** Die lokal vergebenen Identitäten samt Inhaltsschlüssel (§5.3). */
  readonly lokaleInhalte: Identitaetenblick;
}

/**
 * Vergleicht die gelesenen Share-Bytes mit den eigenen lokalen Bytes an
 * derselben Stelle und liefert einen der drei Ausgänge aus §5.4.3.
 */
export function vergleicheSpiegel(eingabe: VergleichEingabe): Vergleichsausgang {
  const { shareBytes, shareOffset, lokaleBytes, lokaleInhalte } = eingabe;

  const abweichung = ersteAbweichung(shareBytes, shareOffset, lokaleBytes);
  if (abweichung === undefined) return { art: "A", gepruefteBytes: shareBytes.byteLength };

  // Ab der Abweichungsstelle werden die Share-Zeilen betrachtet. Maßgeblich ist
  // die Zeile, in die die Abweichung fällt — nicht das einzelne Byte.
  //
  // Gelesen wird hier **ohne** Kettenprüfung, und das ist keine Nachlässigkeit:
  // §5.4.3 nennt als nicht auswertbar ausdrücklich „verfälschte Länge,
  // verfälschter CRC". Eine abweichende Kette gehört nicht dazu — `vorgaenger`
  // liegt innerhalb des CRC-Bereichs, eine Zeile mit stimmigem CRC und
  // abweichender Kette wurde also genau so **geschrieben**. Das ist eine
  // Schreibspur, kein gekipptes Bit. Prüfte man hier die Kette mit, verschwände
  // genau der Fall aus §4.5 Schritt 1 in Ausgang B: der Klon, der ein Segment
  // mit höherer Nummer und eigener Kette begonnen hat.
  const gelesen = leseZeilengrenzen(shareBytes, shareOffset);
  const absoluteAbweichung = shareOffset + abweichung;
  const erste = gelesen.zeilen.findIndex((z) => z.offset + z.laenge > absoluteAbweichung);
  const betroffene = erste < 0 ? [] : gelesen.zeilen.slice(erste);
  // Liegt die Abweichung hinter allen auswertbaren Zeilen — etwa weil schon
  // das Laengenfeld verfaelscht ist —, ist die Reparaturstelle das Ende der
  // letzten auswertbaren Zeile. `endeOffset` ist immer eine Zeilengrenze; ein
  // Byte-Offset mitten in einer Zeile waere als Ansatzpunkt fuer §4.6 falsch.
  const abOffset = betroffene[0]?.offset ?? gelesen.endeOffset;

  for (const zeile of betroffene) {
    const id = zeile.rahmen.id;
    const lokalerInhalt = lokaleInhalte.inhaltVon(id);
    if (lokalerInhalt === undefined) {
      // „In der eigenen Datei auf dem Share steht mindestens eine auswertbare
      // Zeile, deren Ereignis-Identität lokal **nicht** vergeben ist."
      return { art: "C", abOffset, id, grund: "identitaetUnbekannt" };
    }
    if (lokalerInhalt !== inhaltsSchluessel(zeile.rahmen)) {
      // „… oder deren Identität lokal vergeben ist, deren Inhalt (ohne
      // `vorgaenger`, §4.6) sich aber von der lokalen Zeile derselben
      // Identität unterscheidet." Das ist die symmetrische Klon-Lage aus §4.5
      // Schritt 4: beide Kopien laufen gleich weit und vergeben dieselbe
      // Nummer für ein anderes Ereignis.
      return { art: "C", abOffset, id, grund: "inhaltAbweichend" };
    }
  }

  // Keine fremde Schreibspur nachweisbar — auch dann nicht, wenn der Abschluss
  // des Lesens „defekt" oder „unvollständig" lautet: Eine Zeile, die weder
  // lesbar noch einer Identität zuzuordnen ist, stützt Ausgang B (§5.4.3).
  return { art: "B", abOffset };
}

/**
 * Der Index des ersten Bytes, an dem die Share-Bytes von den lokalen
 * abweichen, oder `undefined`, wenn die Share-Bytes ein Präfix der lokalen
 * sind.
 *
 * Reichen die lokalen Bytes nicht so weit, ist das ebenfalls eine Abweichung:
 * Dann läge auf dem Share etwas, das es lokal nicht gibt — genau die
 * Verletzung der Präfix-Invariante aus §5.4.1, die entweder ein Klon oder ein
 * Fehler dieses Verfahrens ist. Beides gehört betrachtet, nicht übersehen.
 */
function ersteAbweichung(
  shareBytes: Uint8Array,
  shareOffset: number,
  lokaleBytes: Uint8Array,
): number | undefined {
  for (let i = 0; i < shareBytes.byteLength; i += 1) {
    const lokal = shareOffset + i;
    if (lokal >= lokaleBytes.byteLength) return i;
    if (shareBytes[i] !== lokaleBytes[lokal]) return i;
  }
  return undefined;
}
