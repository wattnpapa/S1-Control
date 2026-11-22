/**
 * Die gestellte Uhr des Demo-Einsatzes.
 *
 * Der Demo-Einsatz beginnt zwölf Stunden vor jetzt, und jedes seiner
 * Ereignisse soll die Wanduhr seines Drehbuchschritts tragen: Das Tagebuch
 * liest die Wanduhr, und §2.5 hält jede Ist-Zeit gegen sie. Der Aktendienst
 * bekommt seine Zeit ohnehin injiziert (KONZEPT-SPEICHER.md §8); im
 * Demo-Arbeiter ist das diese Uhr statt der des Rechners.
 *
 * Sie läuft **nur vorwärts**: Zwei Schritte derselben Drehbuchminute
 * bekommen zwei Millisekunden, damit die HLC je Schritt weiterläuft und
 * nicht nur ihr Zähler.
 */

import type { Zeitquelle } from "@s1/speicher";

export class Stelluhr {
  #ms: number;

  constructor(startMs: number) {
    this.#ms = Math.floor(startMs);
  }

  /** Die Zeitquelle für den Aktendienst. */
  readonly zeit: Zeitquelle = () => this.#ms;

  /** Stellt die Uhr auf `ms` — oder eine Millisekunde weiter, wenn sie schon dort oder später steht. */
  stelle(ms: number): number {
    this.#ms = Math.max(this.#ms + 1, Math.floor(ms));
    return this.#ms;
  }
}

/** Die Uhr eines Arbeiters: gestellt, wenn die Startdaten einen Demo-Beginn tragen, sonst die des Rechners. */
export function uhrFuer(demoBeginnMs: number | undefined, system: Zeitquelle): { readonly zeit: Zeitquelle; readonly stelluhr?: Stelluhr } {
  if (demoBeginnMs === undefined) return { zeit: system };
  const stelluhr = new Stelluhr(demoBeginnMs);
  return { zeit: stelluhr.zeit, stelluhr };
}
