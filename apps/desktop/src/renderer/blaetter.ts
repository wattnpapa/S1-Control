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
    | "anforderungen"
    | "fuest"
    | "kosten"
    | "fueorg"
    | "ausgaben"
    | "tagebuch"
    | "diagnose";
  readonly titel: string;
  /** Steht am rechten Rand der Leiste statt in der Reihe. */
  readonly rechts?: boolean;
}

export const BLAETTER: readonly Reiter[] = [
  { schluessel: "lage", titel: "Lage" },
  { schluessel: "eingang", titel: "Eingangskorb" },
  { schluessel: "anforderungen", titel: "Anforderungen" },
  { schluessel: "fuest", titel: "Führungsstelle" },
  { schluessel: "kosten", titel: "Kosten" },
  { schluessel: "fueorg", titel: "Führungsorganisation" },
  { schluessel: "ausgaben", titel: "Ausgaben" },
  { schluessel: "tagebuch", titel: "Einsatztagebuch" },
  // Ganz rechts und als letztes Blatt: Die Diagnose wird nicht im Betrieb
  // gelesen, sondern wenn etwas klemmt (M7.3). Sie steht deshalb dort, wo
  // niemand sie versehentlich aufschlägt — und trotzdem im selben Griff.
  { schluessel: "diagnose", titel: "Diagnose", rechts: true },
];

export type Blatt = Reiter["schluessel"];

/** Die Blätter, die auf der Auswahl der Lage aufsetzen (Abschnitt, Einheit). */
export type Lageblatt = Extract<Blatt, "lage" | "ausgaben" | "tagebuch">;

export function gehoertZurLage(blatt: Blatt): blatt is Lageblatt {
  return blatt === "lage" || blatt === "ausgaben" || blatt === "tagebuch";
}
