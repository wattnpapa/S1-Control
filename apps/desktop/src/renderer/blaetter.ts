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
 *
 * **Reiter je Profil** (Entwurf „Entlastung", 3.2, Schnitt E3): Das Profil
 * des Arbeitsplatzes wählt, welche Blätter im Kopfband stehen; die übrigen
 * stehen unter „Mehr". Ein Zuschnitt und kein Recht — jedes Blatt bleibt
 * erreichbar, die Diagnose wie bisher über das Fenstermenü.
 */

import type { Profil } from "../kontrakt/index.js";

export interface Reiter {
  readonly schluessel:
    | "lage"
    | "uebersicht"
    | "eingang"
    | "nachrichten"
    | "fuest"
    | "funkplan"
    | "versorgung"
    | "kosten"
    | "ausgaben"
    | "tagebuch"
    | "diagnose";
  readonly titel: string;
  /** Additiv (R2-FaBe P2-1): ein Satz als Tooltip am Reiter. */
  readonly erklaerung?: string;
  /**
   * Steht nicht in der Reiterzeile, sondern im Fenstermenü „⋯" (Entwurf
   * „Entlastung", 3.2). Das Blatt bleibt ein Blatt: Der Arbeitsplatz schlägt
   * es auf wie jedes andere, nur der Weg dorthin ist ein anderer.
   */
  readonly imFenstermenue?: boolean;
}

export const BLAETTER: readonly Reiter[] = [
  // Umbenannt 2026-11-22: „S1“ statt „Lage“, „S4“ statt „Versorgung“, „Exporte“ statt „Ausgaben“.
  { schluessel: "lage", titel: "S1" },
  // Stab-Review 2026-11-22 (docs/audits/stab): Kräfte nach Status je
  // Abschnitt und alle Aufträge auf einer Seite, zum Lesen und für den Lagevortrag.
  { schluessel: "uebersicht", titel: "Übersicht", erklaerung: "Kräfte nach Status je Abschnitt und alle Aufträge aller Einheiten" },
  // Entlastung E3: Eingangskorb und Anforderungen sind ein Blatt mit
  // Umschalter — beides ist, was von außen hereinkommt (`unterblaetter.ts`).
  // R2-FaBe P2-1: „Eingangskorb“ statt „Eingang“ — der Fachberater suchte hier seine Nachricht;
  // die Post nach Vordruck steht im Blatt „Nachrichten“ unter „Posteingang“.
  { schluessel: "eingang", titel: "Eingangskorb", erklaerung: "Erfassungsbögen und Anforderungen; Nachrichten stehen unter „Nachrichten“ im Posteingang" },
  // Nachrichten N1 (KONZEPT-NACHRICHTEN.md §6, Entscheidung 10): zwischen
  // Eingang und Führungsstelle — der Vordruck läuft zwischen den Stellen.
  { schluessel: "nachrichten", titel: "Nachrichten" },
  // Ebenso Stammdaten mit Schichtplan und die Führungsorganisation: Beide
  // beschreiben die Struktur der Führung.
  { schluessel: "fuest", titel: "Führungsstelle" },
  // Funkplan F1: zwischen Führungsstelle und Versorgung, für alle sichtbar
  // (KONZEPT-FUNKPLAN.md Entscheidung 1) — die Fernmeldezentrale arbeitet den
  // ganzen Einsatz in diesem Blatt.
  { schluessel: "funkplan", titel: "Funkplan" },
  // S4.1: zwischen Führungsstelle und Kosten, für alle sichtbar (Entscheidung 1).
  { schluessel: "versorgung", titel: "S4" },
  { schluessel: "kosten", titel: "Kosten" },
  { schluessel: "ausgaben", titel: "Exporte" },
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

/**
 * Die Reiter im Band je Profil, in der Reihenfolge des Bands. Das erste Blatt
 * ist das der Rolle: Die Fernmeldezentrale arbeitet im Funkplan, die S4 in
 * der Versorgung. „alle" fehlt hier — das ist das Band, wie es bis E3 war.
 */
const BAND: Readonly<Record<Exclude<Profil, "alle">, readonly Blatt[]>> = {
  // 2026-11-22: Funkplan und S4 ins Band; Eingangskorb, Führungsstelle und
  // Einsatztagebuch unter „Mehr“ (ebenso weiterhin die Kosten).
  fuehrungsstelle: ["lage", "nachrichten", "funkplan", "versorgung", "ausgaben"],
  // Die Fernmeldezentrale (FmZ): Nachrichten vor dem Funkplan (§6).
  fernmeldezentrale: ["nachrichten", "funkplan", "lage", "tagebuch"],
  versorgung: ["versorgung", "lage", "ausgaben"],
  // Stab-Review 2026-11-22: Leitung, ETB-Führer und Sachgebiete lesen zuerst
  // die Übersicht; Anforderungen (Eingangskorb) und Tagebuch stehen im Band.
  leitung: ["uebersicht", "nachrichten", "lage", "eingang", "tagebuch", "ausgaben"],
};

export interface Reiterzuschnitt {
  readonly imBand: readonly Reiter[];
  /** In der Reihenfolge der Blätter; leer heißt: kein „Mehr". */
  readonly unterMehr: readonly Reiter[];
}

/** Welche Reiter ein Profil im Band zeigt und welche unter „Mehr" stehen. */
export function reiterFuer(profil: Profil = "fuehrungsstelle"): Reiterzuschnitt {
  const reiter = BLAETTER.filter((eintrag) => eintrag.imFenstermenue !== true);
  if (profil === "alle") return { imBand: reiter, unterMehr: [] };
  const band = BAND[profil];
  return {
    imBand: band.flatMap((schluessel) => reiter.filter((eintrag) => eintrag.schluessel === schluessel)),
    unterMehr: reiter.filter((eintrag) => !band.includes(eintrag.schluessel)),
  };
}
