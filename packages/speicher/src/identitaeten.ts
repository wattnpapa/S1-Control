/**
 * Die Menge der bereits gesehenen Ereignis-Identitäten —
 * KONZEPT-SPEICHER.md §5.3, letzter Absatz.
 *
 * „Zusätzlich hält der Leser je Einsatz die Menge der bereits gesehenen
 * Ereignis-Identitäten. Sie wird nicht gespeichert, sondern beim Öffnen aus
 * dem lokalen Spiegel aufgebaut — der Spiegel enthält nach §5.5 ausschließlich
 * geprüfte Zeilen und damit genau diese Menge. Nur so greift die Regel aus
 * §4.6 (‚dieselbe Identität mit anderem Inhalt ist ein Defekt') auch nach
 * einem Neustart und nicht bloß innerhalb einer Sitzung."
 *
 * Gemerkt wird nicht die Zeile, sondern ihr Inhaltsschlüssel nach §4.6: der
 * Rahmen **ohne** `vorgaenger`. Ein Byte-Vergleich wäre hier falsch — die
 * wiederholte Zeile eines Ersatzsegments (§4.6) ist byteweise zwangsläufig
 * verschieden und trotzdem dasselbe Ereignis.
 */

import { inhaltsSchluessel, type GeleseneZeile, type Identitaetenblick } from "./zeile.js";

export class Identitaetenbuch implements Identitaetenblick {
  readonly #inhalte = new Map<string, string>();

  /** Anzahl der gemerkten Identitäten. */
  get anzahl(): number {
    return this.#inhalte.size;
  }

  /** Der Inhaltsschlüssel einer bereits gesehenen Identität, sonst `undefined`. */
  inhaltVon(id: string): string | undefined {
    return this.#inhalte.get(id);
  }

  /**
   * Merkt eine geprüfte Zeile.
   *
   * Ein zweiter Eintrag mit demselben Schlüssel überschreibt nichts: Er wäre
   * entweder dieselbe Zeile (dann ändert sich nichts) oder ein Defekt (dann
   * ist die Zeile gar nicht erst hierhergekommen, weil §8.2 sie vorher
   * abgewiesen hat).
   */
  merke(zeile: GeleseneZeile): void {
    const id = zeile.rahmen.id;
    if (!this.#inhalte.has(id)) this.#inhalte.set(id, inhaltsSchluessel(zeile.rahmen));
  }

  /** Merkt eine ganze Folge geprüfter Zeilen. */
  merkeAlle(zeilen: Iterable<GeleseneZeile>): void {
    for (const zeile of zeilen) this.merke(zeile);
  }
}
