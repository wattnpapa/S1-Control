/**
 * Der Laufzeitzustand einer beobachteten fremden Datei — KONZEPT-SPEICHER.md
 * §6.2 (zwei Takte), §8.1 (unvollständige Zeile) und §8.2 (Quarantäne).
 *
 * Getrennt vom Leser, weil hier keine Entscheidung fällt: Diese Datei hält
 * fest, was über eine Datei bekannt ist, und beantwortet daraus die drei
 * Fragen, die §6.2 stellt — steht sie in Takt A, wird sie in Takt B gelesen,
 * ist sie verfallen.
 */

import { zerlegeEreignisDateiname } from "./pfade.js";
import { UNVOLLSTAENDIG_FRIST_MS, VERFALL_MS } from "./startwerte.js";
import type { FremderOffset } from "./uploadZustand.js";
import type { Zeitquelle } from "./zeit.js";

/** In welchem Takt eine Datei geführt wird (§6.2). */
export type Takt = "A" | "B";

/** Der Laufzeitzustand einer fremden Datei. */
export class Dateilage {
  readonly name: string;
  offsets: FremderOffset;
  takt: Takt;
  /** Wann zuletzt **neue** Bytes kamen — Grundlage des Verfalls aus §6.2. */
  letzteBytes: number;
  /**
   * Das weiteste bisher gesehene Dateiende (`leseOffset` plus gelesene Bytes).
   *
   * Nötig, um „neue Bytes" von „dieselben Bytes noch einmal" zu unterscheiden:
   * Eine unvollständige Zeile wird bei jedem Durchlauf erneut mitgelesen, ohne
   * dass die Datei gewachsen wäre. Ohne diese Unterscheidung setzte sie den
   * Verfall aus §6.2 endlos zurück, und die Datei bliebe für den Rest der Lage
   * im kurzen Takt.
   */
  gesehenesEnde: number;
  /** Seit wann dieselbe unvollständige Zeile unverändert unvollständig ist (§8.1). */
  unvollstaendigSeit: number | undefined = undefined;
  /** Byte-Offset, an dem die unvollständige Zeile beginnt — zur Prüfung „unverändert". */
  unvollstaendigAb: number | undefined = undefined;
  /** §4.3: durch eine Abschlusszeile angekündigt, aber noch nicht vorhanden. */
  angekuendigt = false;
  /**
   * Ob der Kettenanker dieser Datei feststeht (§2.3, Sonderfälle).
   *
   * Solange er nicht feststeht, wird die Datei **nicht** ausgewertet — sonst
   * bräche die Kettenprüfung an einer Stelle, an der gar nichts kaputt ist.
   */
  ankerBekannt: boolean;
  /** Warum diese Datei in Quarantäne steht (§8.2 Punkt 6, `s1 akte pruefe`). */
  quarantaenegrund: string | undefined = undefined;
  /** Wann die Quarantäne entstand — §8.2 Punkt 6 verlangt den Zeitpunkt. */
  quarantaeneSeit: number | undefined = undefined;

  constructor(name: string, offsets: FremderOffset, jetzt: number) {
    this.name = name;
    this.offsets = offsets;
    this.takt = offsets.quarantaeneAb === null ? "A" : "B";
    this.letzteBytes = jetzt;
    this.gesehenesEnde = offsets.leseOffset;
    this.ankerBekannt = offsets.leseOffset > 0 || zerlegeEreignisDateiname(name)?.segment === 0;
  }

  /** `true`, wenn diese Datei im kurzen Takt geführt wird (§6.2). */
  inTaktA(): boolean {
    if (this.offsets.abgeschlossen) return false;
    if (this.offsets.quarantaeneAb !== null) return false;
    return this.takt === "A" || this.angekuendigt;
  }

  /**
   * `true`, wenn diese Datei in Takt B **gelesen** wird (§6.2, §7.6 Bedingung 3).
   *
   * §7.6 nennt dafür ausdrücklich nur „verfallene, vorläufig quarantänisierte,
   * angekündigte". Eine endgültig quarantänisierte Datei gehört nicht dazu:
   * §8.2 Punkt 2 sagt „wird ab dort nicht weiter ausgewertet **und nicht weiter
   * gepollt**". Sie erneut zu lesen erzeugte bei jedem Durchlauf dieselbe
   * Meldung über einen Defekt, der längst gemeldet ist.
   */
  inTaktB(): boolean {
    if (this.offsets.abgeschlossen) return false;
    if (this.endgueltigeQuarantaene()) return false;
    return !this.inTaktA();
  }

  /** `true` bei einer Quarantäne nach §8.2 (endgültig), nicht nach §8.1 (vorläufig). */
  endgueltigeQuarantaene(): boolean {
    return this.offsets.quarantaeneAb !== null && this.offsets.vorlaeufig !== true;
  }

  /** `true` bei einer vorläufigen Quarantäne nach §8.1. */
  vorlaeufigeQuarantaene(): boolean {
    return this.offsets.quarantaeneAb !== null && this.offsets.vorlaeufig === true;
  }

  /**
   * §6.2, Verfallsregel: „Liefert eine Datei in Takt A über fünf Minuten hinweg
   * keine neuen Bytes, fällt sie in Takt B zurück." Sie gilt damit nicht als
   * verloren — liefert sie in Takt B wieder Bytes, kehrt sie unmittelbar nach
   * Takt A zurück.
   *
   * Rein zeitgesteuert und ohne Bezug auf eine andere Datei; insbesondere nicht
   * auf die Präsenzdatei, die nach §6.4 ausfallen **darf** und den Verfall
   * allenfalls vorziehen, nie verhindern darf.
   */
  verfallPruefen(zeit: Zeitquelle): void {
    if (zeit() - this.letzteBytes > VERFALL_MS) this.takt = "B";
  }

  /** Merkt neue Bytes und holt die Datei damit nach Takt A zurück (§6.2). */
  merkeBytes(bisOffset: number, jetzt: number): void {
    if (bisOffset <= this.gesehenesEnde) return;
    this.gesehenesEnde = bisOffset;
    this.letzteBytes = jetzt;
    this.takt = "A";
  }

  /** `true`, wenn dieselbe unvollständige Zeile länger als die Frist steht (§8.1). */
  fristAbgelaufen(zeit: Zeitquelle): boolean {
    if (this.unvollstaendigSeit === undefined) return false;
    return zeit() - this.unvollstaendigSeit > UNVOLLSTAENDIG_FRIST_MS;
  }

  /**
   * Vermerkt, dass der gelesene Abschnitt unvollständig endete (§8.1).
   *
   * Die Frist beginnt nur dann neu, wenn die unvollständige Zeile an einer
   * **anderen** Stelle beginnt — sonst liefe sie bei jedem Durchlauf zurück,
   * und §8.1 griffe nie.
   */
  merkeUnvollstaendig(abOffset: number, jetzt: number): void {
    if (this.unvollstaendigAb === abOffset) return;
    this.unvollstaendigAb = abOffset;
    this.unvollstaendigSeit = jetzt;
  }

  /** Vermerkt, dass der gelesene Abschnitt sauber endete (§8.1). */
  merkeVollstaendig(): void {
    this.unvollstaendigAb = undefined;
    this.unvollstaendigSeit = undefined;
  }

  /** Setzt eine Quarantäne (§8.1 vorläufig, §8.2 endgültig). */
  quarantaene(offset: number, grund: string, vorlaeufig: boolean, jetzt: number): void {
    this.offsets = { ...this.offsets, quarantaeneAb: offset, vorlaeufig };
    this.quarantaenegrund = grund;
    this.quarantaeneSeit = jetzt;
    this.takt = "B";
  }

  /**
   * Hebt eine Quarantäne auf.
   *
   * §8.1 für die vorläufige: „Wird die Zeile später doch vollständig und
   * kettenrichtig, fällt die Quarantäne **ohne Zutun** weg und die Datei kehrt
   * in Takt A zurück." §8.2 Punkt 5 für die endgültige, dort aber nur einmal je
   * Programmstart.
   */
  quarantaeneAufheben(): void {
    this.offsets = { ...this.offsets, quarantaeneAb: null, vorlaeufig: false };
    this.quarantaenegrund = undefined;
    this.quarantaeneSeit = undefined;
    this.takt = "A";
  }
}
