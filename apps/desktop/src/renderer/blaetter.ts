/**
 * Die Blätter des Fensters — die Reiter im Kopfband (Entwurf „Oberfläche",
 * Option 2a).
 *
 * **Ein Blatt zur Zeit.** Vorher standen Lage, Ausgaben, Tagebuch und die
 * Nebenblätter untereinander auf einer Fläche; wer die Einheitentabelle sehen
 * wollte, scrollte an allem anderen vorbei. Die Reihenfolge hier ist die des
 * Kopfbands, und sie folgt dem Arbeitstag: erst die Lage, dann was
 * hereinkommt, dann was gerechnet und ausgegeben wird.
 *
 * Die Liste steht in einer eigenen Datei, weil zwei Seiten sie brauchen: das
 * Kopfband zeichnet die Reiter, der Arbeitsplatz entscheidet, was darunter
 * steht.
 */

export interface Reiter {
  readonly schluessel:
    | "lage"
    | "eingang"
    | "fuest"
    | "funkplan"
    | "versorgung"
    | "kosten"
    | "ausgaben"
    | "tagebuch"
    | "diagnose";
  readonly titel: string;
  /**
   * Steht nicht in der Reiterzeile, sondern im Fenstermenü „⋯" (Entwurf
   * „Entlastung", 3.2). Das Blatt bleibt ein Blatt: Der Arbeitsplatz schlägt
   * es auf wie jedes andere, nur der Weg dorthin ist ein anderer.
   */
  readonly imFenstermenue?: boolean;
}

export const BLAETTER: readonly Reiter[] = [
  { schluessel: "lage", titel: "Lage" },
  // Entlastung E3: Eingangskorb und Anforderungen sind ein Blatt mit
  // Umschalter — beides ist, was von außen hereinkommt (`unterblaetter.ts`).
  { schluessel: "eingang", titel: "Eingang" },
  // Ebenso Stammdaten mit Schichtplan und die Führungsorganisation: Beide
  // beschreiben die Struktur der Führung.
  { schluessel: "fuest", titel: "Führungsstelle" },
  // Funkplan F1: zwischen Führungsstelle und Versorgung, für alle sichtbar
  // (KONZEPT-FUNKPLAN.md Entscheidung 1) — die Vermeldezentrale arbeitet den
  // ganzen Einsatz in diesem Blatt.
  { schluessel: "funkplan", titel: "Funkplan" },
  // S4.1: zwischen Führungsstelle und Kosten, für alle sichtbar (Entscheidung 1).
  { schluessel: "versorgung", titel: "Versorgung" },
  { schluessel: "kosten", titel: "Kosten" },
  { schluessel: "ausgaben", titel: "Ausgaben" },
  { schluessel: "tagebuch", titel: "Einsatztagebuch" },
  // Die Diagnose wird nicht im Betrieb gelesen, sondern wenn etwas klemmt
  // (M7.3). Sie steht deshalb nicht in der Reiterzeile, sondern im
  // Fenstermenü — dort, wo niemand sie versehentlich aufschlägt.
  { schluessel: "diagnose", titel: "Diagnose", imFenstermenue: true },
];

export type Blatt = Reiter["schluessel"];

/** Die Blätter, die auf der Auswahl der Lage aufsetzen (Abschnitt, Einheit). */
export type Lageblatt = Extract<Blatt, "lage" | "ausgaben" | "tagebuch">;

export function gehoertZurLage(blatt: Blatt): blatt is Lageblatt {
  return blatt === "lage" || blatt === "ausgaben" || blatt === "tagebuch";
}

export function istBlatt(wert: unknown): wert is Blatt {
  return BLAETTER.some((eintrag) => eintrag.schluessel === wert);
}

export function blatttitel(blatt: Blatt): string {
  return BLAETTER.find((eintrag) => eintrag.schluessel === blatt)?.titel ?? blatt;
}
