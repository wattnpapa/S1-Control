/**
 * Die injizierte Zeitquelle (KONZEPT-SPEICHER.md §8, Vorbemerkung).
 *
 * Wörtlich: „Alle Fristen und Takte dieses Dokuments beziehen ihre Zeit aus
 * einer injizierbaren Quelle. Die Speicherschicht ruft keine Uhr unmittelbar
 * auf." Ohne diese Festlegung wären die Fehlerbilder mit Frist — die
 * Fünf-Minuten-Regel in §8.1, der Verfall in §6.2, der Rückstau in §5.4.4, der
 * Zeitausstieg in §8.4, der Präsenztakt in §6.4 — nur in Läufen prüfbar, die
 * tatsächlich Minuten dauern, und die Unit-Tests aus der DoD von M0.3 wären
 * nicht schreibbar.
 *
 * `@s1/domaene` hat in M0.2 dieselbe Behandlung bekommen (`Wanduhr` in
 * `hlc.ts`); die Form ist absichtlich dieselbe.
 */

/** Unix-Millisekunden. Die einzige Zeitquelle dieser Schicht. */
export type Zeitquelle = () => number;

/** Die echte Uhr. Sie steht genau an einer Stelle im Paket und wird sonst injiziert. */
export const systemZeit: Zeitquelle = () => Date.now();

/**
 * Eine Frist, die an einem beobachteten Ereignis hängt (§6.2, §8.1).
 *
 * Sie merkt sich, wann zuletzt etwas geschah, und beantwortet, ob seither mehr
 * als `dauerMs` vergangen ist. Bewusst ohne eigenen Zeitgeber: Sie wird
 * gefragt, sie meldet sich nicht.
 */
export class Frist {
  readonly #zeit: Zeitquelle;
  readonly #dauerMs: number;
  #seit: number;

  constructor(zeit: Zeitquelle, dauerMs: number) {
    this.#zeit = zeit;
    this.#dauerMs = dauerMs;
    this.#seit = zeit();
  }

  /** Setzt die Frist zurück — es ist etwas geschehen. */
  zuruecksetzen(): void {
    this.#seit = this.#zeit();
  }

  /** `true`, sobald seit dem letzten {@link zuruecksetzen} mehr als die Dauer vergangen ist. */
  abgelaufen(): boolean {
    return this.#zeit() - this.#seit > this.#dauerMs;
  }

  /** Wie lange die Frist schon läuft, in Millisekunden. */
  laeuftSeitMs(): number {
    return this.#zeit() - this.#seit;
  }
}

/**
 * Wandelt Unix-Millisekunden in die Textform der Wanduhr nach §2.4:
 * ISO-8601 mit Zeitzone. Nur zur Anzeige und Plausibilisierung, nie zur
 * Ordnung (§3.1).
 */
export function wanduhrText(millisekunden: number): string {
  return new Date(millisekunden).toISOString();
}
