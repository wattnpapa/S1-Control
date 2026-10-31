/**
 * Die weichen Bearbeitungssperren dieses Arbeitsplatzes.
 *
 * Wer eine Zelle, ein Blatt oder eine Maske für eine Einheit, ein Fahrzeug oder
 * einen Abschnitt öffnet, setzt eine kurze Sperre; der offene Editor
 * verlängert sie im Takt. Sie läuft nach {@link SPERRE_MS} von selbst ab – ein
 * abgestürzter Browser hält nichts fest. Die Liste reist in der eigenen
 * Präsenzdatei zu den Kollegen, die dann „wird von … bearbeitet" zeigen.
 *
 * **Weich, mit Absicht.** Eine harte Sperre auf einem Share ohne Server hieße,
 * dass ein hängender Arbeitsplatz die Lage blockiert. Die Sperre warnt und
 * lenkt; ein bewusstes Übernehmen bleibt möglich, und die Vorwert-Prüfung
 * (`vorwertpruefung.ts`) verhindert, dass dabei still etwas überschrieben wird.
 */

export const SPERRE_MS = 30_000;
/** Mehr als das sind keine Editoren, sondern ein Versehen. */
const SPERREN_MAX = 50;

export class Bearbeitungssperren {
  readonly #bis = new Map<string, number>();

  /** Setzt oder verlängert die Sperre; liefert, ob sich die Menge der Sperren geändert hat. */
  setze(entitaetId: string, jetzt: number): boolean {
    const neu = !this.#bis.has(entitaetId);
    this.#bis.set(entitaetId, jetzt + SPERRE_MS);
    while (this.#bis.size > SPERREN_MAX) {
      const aelteste = this.#bis.keys().next();
      if (aelteste.done === true) break;
      this.#bis.delete(aelteste.value);
    }
    return neu;
  }

  gib(entitaetId: string): boolean {
    return this.#bis.delete(entitaetId);
  }

  /** Die gerade gültigen Sperren; abgelaufene fallen heraus. */
  aktive(jetzt: number): readonly string[] {
    for (const [id, bis] of this.#bis) if (bis <= jetzt) this.#bis.delete(id);
    return [...this.#bis.keys()].sort();
  }
}
