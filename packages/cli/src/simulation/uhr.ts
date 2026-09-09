/**
 * Die virtuelle Uhr der Simulation — KONZEPT-SPEICHER.md §8, Vorbemerkung.
 *
 * Die Speicherschicht ruft keine Uhr unmittelbar auf, sondern bekommt eine
 * {@link Zeitquelle} injiziert. Deshalb lassen sich hier Fristen von Minuten
 * (§8.1: fünf Minuten; §6.2: Verfall) und ein Zeitausstieg von 20 Sekunden
 * (§8.4) in einem Lauf prüfen, der Sekunden dauert — und deshalb ist der
 * Uhrsprung aus der Fehlerinjektion ohne Warten prüfbar.
 *
 * Jeder Client bekommt einen eigenen **Versatz** auf diese eine Uhr. Das ist
 * der Modellfall aus §3.2: Die Wanduhren der Arbeitsplätze gehen
 * auseinander, die Ordnung der Ereignisse hängt trotzdem allein an der HLC
 * (§3.1).
 */

import type { Zeitquelle } from "@s1/speicher";

export class Simulationsuhr {
  #jetzt: number;

  /** Startzeitpunkt in Unix-Millisekunden; fest, damit Läufe vergleichbar bleiben. */
  constructor(start = 1_788_000_000_000) {
    this.#jetzt = start;
  }

  jetzt(): number {
    return this.#jetzt;
  }

  /** Stellt die Uhr vor. Rückwärts geht sie nie — nur die Versätze der Clients springen. */
  weiter(ms: number): void {
    if (ms < 0) throw new RangeError(`Die Simulationsuhr läuft nicht rückwärts: ${ms}`);
    this.#jetzt += ms;
  }
}

/** Die Sicht eines Clients auf die Uhr: gemeinsame Zeit plus eigener Versatz (§3.2). */
export class Clientuhr {
  readonly #uhr: Simulationsuhr;
  #versatz = 0;

  constructor(uhr: Simulationsuhr) {
    this.#uhr = uhr;
  }

  /** Als {@link Zeitquelle} für `@s1/speicher` und als Wanduhr für die HLC verwendbar. */
  readonly lies: Zeitquelle = () => this.#uhr.jetzt() + this.#versatz;

  /**
   * Ein Uhrsprung (§3.2, §8.5).
   *
   * Vorwärts wie rückwärts: §3.2 fängt den Rückwärtssprung der eigenen Uhr
   * ausdrücklich ab, und die Delta-Grenze von fünf Minuten gilt in beide
   * Richtungen. Ein Sprung nur nach vorn prüfte die Hälfte.
   */
  springe(ms: number): void {
    this.#versatz += ms;
  }

  get versatz(): number {
    return this.#versatz;
  }
}
