/**
 * Fachliche Werttypen, die Ereigniskatalog und Zustand gemeinsam brauchen.
 *
 * Sie stehen in einem eigenen Modul, damit `zustand.ts` sie nutzen kann, ohne
 * den Ereigniskatalog zu ziehen: Der Zustand ist das Ergebnis des Folds und
 * kennt keine Ereignisarten. `ereignis.ts` reicht sie unveraendert weiter,
 * damit bestehende Importe gueltig bleiben.
 *
 * Paragraphenverweise zeigen auf `docs/v2/konzepte/KONZEPT-EREIGNISSE.md`,
 * sofern nichts anderes dabeisteht.
 */

/** Der Schluessel einer Entitaet in ihrer Datensammlung — ohne Praefix (§3.2). */
export type Id = string;

/**
 * Ein fachlicher Zeitpunkt als ISO-8601 mit Zeitzone.
 *
 * Nicht zu verwechseln mit der Wanduhr des Rahmens: Diese Zeit ist die vom
 * Bediener gemeldete (§2.5) und wird gegen die Wanduhr plausibilisiert, nie
 * zur Ordnung benutzt (§3.1).
 */
export type Zeitpunkt = string;

/**
 * Staerke als Meldestand F/UF/M (Zieldatenmodell §3.2).
 *
 * Ein Tripel, keine drei unabhaengigen Felder — deshalb gilt bei
 * `StaerkeGeaendert` Last-Writer-Wins ueber das ganze Tripel (§5.4.2).
 */
export interface Staerke {
  readonly fuehrer: number;
  readonly unterfuehrer: number;
  readonly mannschaft: number;
}

/**
 * Dieselben drei Rollen, aber **ungeklemmt** (§5.4.2).
 *
 * Ein eigener Typ und nicht `Staerke`, weil hier negative Zahlen zulaessig
 * sind: `wirksameStaerkeRechnerisch` ist die Bilanzgroesse, gegen die P4
 * misst, und das Klemmen bei 0 geschieht erst in `wirksameStaerke`. Wer
 * beides denselben Typ gibt, klemmt frueher oder spaeter an der falschen
 * Stelle und verdeckt genau den Fall aus T154.
 */
export interface StaerkeRechnerisch {
  readonly fuehrer: number;
  readonly unterfuehrer: number;
  readonly mannschaft: number;
}

/** Eine Stufe der taktischen Hierarchie einer Einheit (Zieldatenmodell §3.2). */
export interface HierarchieEbene {
  readonly ebene: string;
  readonly bezeichnung: string;
}

/** Erreichbarkeit einer Fuehrungskraft oder Person (Zieldatenmodell §3.4). */
export interface Kontakt {
  readonly art: string;
  readonly wert: string;
  readonly bemerkung?: string;
}

/** Sofortbedarf einer Einheit (Zieldatenmodell §3.2). */
export interface Sofortbedarf {
  readonly text: string;
  readonly bisWann?: Zeitpunkt;
}

/** Summe der drei Rollen eines Staerke-Tripels. */
export function staerkeSumme(staerke: Staerke | StaerkeRechnerisch): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

/** Wertgleichheit zweier Staerke-Tripel. */
export function staerkeGleich(
  a: Staerke | StaerkeRechnerisch,
  b: Staerke | StaerkeRechnerisch,
): boolean {
  return (
    a.fuehrer === b.fuehrer && a.unterfuehrer === b.unterfuehrer && a.mannschaft === b.mannschaft
  );
}

/** Rollenweise Summe zweier Tripel; ungeklemmt (§5.4.2). */
export function staerkePlus(a: StaerkeRechnerisch, b: StaerkeRechnerisch): StaerkeRechnerisch {
  return {
    fuehrer: a.fuehrer + b.fuehrer,
    unterfuehrer: a.unterfuehrer + b.unterfuehrer,
    mannschaft: a.mannschaft + b.mannschaft,
  };
}

/** Rollenweise Differenz zweier Tripel; ungeklemmt (§5.4.2). */
export function staerkeMinus(a: StaerkeRechnerisch, b: StaerkeRechnerisch): StaerkeRechnerisch {
  return {
    fuehrer: a.fuehrer - b.fuehrer,
    unterfuehrer: a.unterfuehrer - b.unterfuehrer,
    mannschaft: a.mannschaft - b.mannschaft,
  };
}

/**
 * Klemmt jede Rolle einzeln bei 0 (§5.4.2).
 *
 * Je Rolle und nicht ueber die Summe: Ein Tripel mit -1 Fuehrern und
 * +3 Mannschaft ist keine Lage, die jemand melden kann, und die Summe
 * verdeckte den negativen Anteil.
 */
export function staerkeGeklemmt(staerke: StaerkeRechnerisch): Staerke {
  return {
    fuehrer: Math.max(0, staerke.fuehrer),
    unterfuehrer: Math.max(0, staerke.unterfuehrer),
    mannschaft: Math.max(0, staerke.mannschaft),
  };
}

/** `true`, wenn mindestens eine Rolle negativ ist — Ausloeser von `staerkeGeklemmt`. */
export function staerkeIstNegativ(staerke: StaerkeRechnerisch): boolean {
  return staerke.fuehrer < 0 || staerke.unterfuehrer < 0 || staerke.mannschaft < 0;
}

/** Das neutrale Element der Stärkerechnung. */
export const STAERKE_NULL: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };
