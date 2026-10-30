/**
 * Die Bremse gegen Durchprobieren (ADR-006).
 *
 * Je Absender hoechstens {@link BremseOptionen.maxFehlversuche} Fehlversuche
 * im gleitenden Fenster; danach wird jeder weitere Versuch abgewiesen, bis der
 * aelteste Fehlversuch aus dem Fenster faellt — auch einer mit richtigem
 * Passwort, sonst waere die Bremse nur eine Verzoegerung.
 *
 * Im Speicher und nicht in einer Datei: Ein Neustart des Dienstes setzt die
 * Bremse zurueck, und das ist hinnehmbar — wer den Container neu starten
 * kann, braucht das Passwort nicht zu erraten.
 */

export interface BremseOptionen {
  readonly maxFehlversuche?: number;
  readonly fensterMs?: number;
  readonly zeit?: () => number;
}

export const FEHLVERSUCHE = 5;
export const FENSTER_MS = 15 * 60_000;

export class Bremse {
  readonly #max: number;
  readonly #fensterMs: number;
  readonly #zeit: () => number;
  readonly #versuche = new Map<string, number[]>();

  constructor(optionen: BremseOptionen = {}) {
    this.#max = optionen.maxFehlversuche ?? FEHLVERSUCHE;
    this.#fensterMs = optionen.fensterMs ?? FENSTER_MS;
    this.#zeit = optionen.zeit ?? Date.now;
  }

  /** Wie lange dieser Absender noch warten muss, in Millisekunden; 0 heisst „darf". */
  wartezeit(absender: string): number {
    const liste = this.#frische(absender);
    if (liste.length < this.#max) return 0;
    const aeltester = liste[liste.length - this.#max] ?? this.#zeit();
    return Math.max(1, aeltester + this.#fensterMs - this.#zeit());
  }

  fehlversuch(absender: string): void {
    const liste = this.#frische(absender);
    liste.push(this.#zeit());
    this.#versuche.set(absender, liste);
    this.#raeumeAuf();
  }

  /** Nach einer gelungenen Anmeldung zaehlen die alten Fehlversuche nicht mehr. */
  erfolg(absender: string): void {
    this.#versuche.delete(absender);
  }

  #frische(absender: string): number[] {
    const grenze = this.#zeit() - this.#fensterMs;
    return (this.#versuche.get(absender) ?? []).filter((zeitpunkt) => zeitpunkt > grenze);
  }

  /** Haelt die Tabelle klein, auch wenn viele Absender es je einmal versuchen. */
  #raeumeAuf(): void {
    if (this.#versuche.size < 1000) return;
    for (const absender of [...this.#versuche.keys()]) {
      const frisch = this.#frische(absender);
      if (frisch.length === 0) this.#versuche.delete(absender);
      else this.#versuche.set(absender, frisch);
    }
  }
}
