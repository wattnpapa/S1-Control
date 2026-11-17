/**
 * Was die Fernmeldezentrale und die erweiterte Maske rechnen, ohne zu
 * zeichnen (KONZEPT-NACHRICHTEN.md §5, §6, Schnitt N2) — reine Funktionen
 * neben `nachrichtenformate.ts`, damit jene Datei die Regeln des Verfassers
 * behält und die Tests diese ohne DOM prüfen.
 *
 * Gerechnet wird hier nur, was die Oberfläche über die Zeile hinaus braucht:
 * die Minuten seit der Annahme für die bernsteinfarbene Zeile, die Warnung
 * bei einer schon vergebenen Nummer (Warnung, keine Sperre: Papier geht vor,
 * §9) und die Vorbelegungen von Aufnahme- und Laufzettelteil.
 */

import { datumZeitGruppe, type Nachweisvermerk, type Sichtungsvermerk } from "@s1/domaene";

import type { Sitzungsstellen } from "../kontrakt/index.js";
import type { Nachrichtenfolge } from "../kontrakt/fmzschritte.js";
import { handzeichenPflicht, leereMaske, zeitAusEingabe, type Maskenwerte } from "./nachrichtenformate.js";

/** „seit 34 min" — wie lange eine angenommene Nachricht unbefördert in der FmZ liegt (§5 „Zwanzig Minuten"). */
export function minutenSeit(zeitpunkt: string | undefined, jetzt: string | Date): number | undefined {
  if (zeitpunkt === undefined) return undefined;
  const ende = typeof jetzt === "string" ? Date.parse(jetzt) : jetzt.getTime();
  const seit = ende - Date.parse(zeitpunkt);
  return Number.isFinite(seit) ? Math.max(0, Math.floor(seit / 60000)) : undefined;
}

/** Die Nummer aus der Eingabe: eine ganze Zahl ab 1, sonst `undefined`; leer heißt „keine Nummer". */
export function nummerAusEingabe(eingabe: string): number | undefined {
  const text = eingabe.trim();
  if (!/^\d{1,6}$/u.test(text)) return undefined;
  const nummer = Number(text);
  return nummer >= 1 ? nummer : undefined;
}

/** Die Warnung vor dem Schreiben, wenn die Nummer schon an einer Nachricht steht (§9). */
export function nummerWarnung(nummer: number | undefined, vergeben: readonly number[] | undefined, eigene?: number): string | undefined {
  if (nummer === undefined || nummer === eigene || !(vergeben ?? []).includes(nummer)) return undefined;
  return `Die Nummer ${String(nummer)} ist bereits vergeben. Nachweisen ist trotzdem möglich; die Nachweisung zeigt beide Zeilen mit Marke.`;
}

/** Der Aufnahmevermerk und die Nummer im oberen Teil der Eingangsmaske (Feld 1 bis 6), wie getippt. */
export interface Aufnahmewerte {
  readonly mittel: string;
  readonly zeit: string;
  readonly handzeichen: string;
  readonly gegenstelle: string;
  /** Leer lassen ist erlaubt: Dann weist die FmZ später nach (Entscheidung 2). */
  readonly nummer: string;
}

export function aufnahmeVorlage(sitzung: Sitzungsstellen | undefined, naechsteNummer: number | undefined, jetzt: Date = new Date()): Aufnahmewerte {
  return {
    mittel: "FUNK",
    zeit: datumZeitGruppe(jetzt),
    handzeichen: sitzung?.handzeichen ?? "",
    gegenstelle: "",
    nummer: naechsteNummer === undefined ? "" : String(naechsteNummer),
  };
}

/** Die Eingangsmaske (§5 „Eingang von außen"): Richtung Eingang, Anschrift die eigene Führungsstelle, Absender frei. */
export function eingangVorlage(sitzung: Sitzungsstellen | undefined, fuestName: string | undefined, jetzt: Date = new Date()): Maskenwerte {
  return { ...leereMaske(sitzung, jetzt), richtung: "EINGANG", anschrift: fuestName ?? "", absender: "", zeichen: "", funktion: "" };
}

/** Was im oberen Teil vor „Aufnehmen" fehlt: eine lesbare Aufnahmezeit, ein Handzeichen, eine lesbare Nummer. */
export function aufnahmefehler(werte: Aufnahmewerte, jetzt: Date = new Date()): readonly string[] {
  const fehler: string[] = [];
  if (zeitAusEingabe(werte.zeit, jetzt) === undefined) fehler.push("Zeit der Aufnahme lesbar eintragen");
  // Zwei bis vier Zeichen wie auf dem Vordruck (Sachgebietsleiter P1-4).
  if (handzeichenPflicht(werte.handzeichen) !== undefined) fehler.push("Handzeichen der Aufnahme eintragen (zwei bis vier Zeichen)");
  if (werte.nummer.trim() !== "" && nummerAusEingabe(werte.nummer) === undefined) fehler.push("Nummer als ganze Zahl ab 1 eintragen oder leer lassen");
  return fehler;
}

/** Der Aufnahmevermerk für die Anlage, sofern die Zeit lesbar ist. */
export function aufnahmeAus(werte: Aufnahmewerte, jetzt: Date = new Date()): { mittel: string; zeitpunkt: string; handzeichen: string } | undefined {
  const zeitpunkt = zeitAusEingabe(werte.zeit, jetzt);
  return zeitpunkt === undefined ? undefined : { mittel: werte.mittel, zeitpunkt, handzeichen: werte.handzeichen.trim() };
}

/** Der Nachweis zur Aufnahme — nur mit eingetragener Nummer (Entscheidung 2). */
export function nachweisAus(werte: Aufnahmewerte, jetzt: Date = new Date()): Nachweisvermerk | undefined {
  const nummer = nummerAusEingabe(werte.nummer);
  const zeitpunkt = zeitAusEingabe(werte.zeit, jetzt);
  if (nummer === undefined || zeitpunkt === undefined) return undefined;
  return { nummer, zeitpunkt, handzeichen: werte.handzeichen.trim() };
}

/** Die Folgen, die „Aufnehmen" oder „Aufgeben" mitschreibt; leer ohne Nummer und ohne Verteilung. */
export function folgeAus(nachweis: Nachweisvermerk | undefined, sichtung: Sichtungsvermerk | undefined): Nachrichtenfolge {
  return { ...(nachweis === undefined ? {} : { nachweis }), ...(sichtung === undefined ? {} : { sichtung }) };
}
