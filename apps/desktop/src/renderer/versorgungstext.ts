/**
 * Die Wörter und Zeitangaben der Versorgung (S4.1) — rein, ohne React.
 *
 * Gerechnet wird in Ring 2; hier wird nur geschrieben: „Abend 1800",
 * „morgen", „in 3 h 17 min", „+24", „−14". `jetzt` wird übergeben wie im
 * Monitor, damit die Texte in jsdom prüfbar sind.
 *
 * Die Uhrzeit steht in Ortszeit des Rechners, wie die taktische Zeit im
 * Kopfband (`taktischeZeit` in formate.ts): Zwei Uhren an einem Arbeitsplatz,
 * die verschieden gehen, ließen den Bediener raten.
 */

import { projektion, type Mahlzeit } from "@s1/domaene";

function zwei(zahl: number): string {
  return String(zahl).padStart(2, "0");
}

/** „1800" — die Ausgabezeit in Ortszeit. */
export function uhrzeitText(zeitpunkt: string): string {
  const datum = new Date(zeitpunkt);
  if (Number.isNaN(datum.getTime())) return "—";
  return `${zwei(datum.getHours())}${zwei(datum.getMinutes())}`;
}

function tagesbeginn(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** „heute", „morgen", „übermorgen" — nach Kalendertag in Ortszeit. */
export function tagText(zeitpunkt: string, jetzt: number): string {
  const ms = Date.parse(zeitpunkt);
  if (Number.isNaN(ms)) return "";
  const tage = Math.round((tagesbeginn(ms) - tagesbeginn(jetzt)) / 86_400_000);
  if (tage <= 0) return "heute";
  if (tage === 1) return "morgen";
  if (tage === 2) return "übermorgen";
  return `in ${String(tage)} Tagen`;
}

/** „in 3 h 17 min", „in 12 min", „jetzt". */
export function restzeitText(zeitpunkt: string, jetzt: number): string {
  const ms = Date.parse(zeitpunkt);
  if (Number.isNaN(ms)) return "";
  const minuten = Math.floor((ms - jetzt) / 60_000);
  if (minuten <= 0) return "jetzt";
  const stunden = Math.floor(minuten / 60);
  const rest = minuten % 60;
  return stunden === 0 ? `in ${String(rest)} min` : `in ${String(stunden)} h ${String(rest)} min`;
}

/** „Abend", oder lang „Abendessen" für den Monitor. */
export function mahlzeitText(mahlzeit: string, lang = false): string {
  const tabelle = lang ? projektion.MAHLZEIT_LANG : projektion.MAHLZEIT_TEXT;
  return tabelle[mahlzeit as Mahlzeit] ?? mahlzeit;
}

/** „+24", „−14", „—" für null — Zu- und Abgänge mit Vorzeichen. */
export function vorzeichen(zahl: number, art: "plus" | "minus"): string {
  if (zahl === 0) return "—";
  return art === "plus" ? `+${String(zahl)}` : `−${String(zahl)}`;
}

const MONATE = ["JAN", "FEB", "MRZ", "APR", "MAI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEZ"];

/** „Nacht 10./11. SEP" — die kommende Nacht in Ortszeit. */
export function nachtText(jetzt: number): string {
  const heute = new Date(jetzt);
  const morgen = new Date(heute.getFullYear(), heute.getMonth(), heute.getDate() + 1);
  const monat = MONATE[morgen.getMonth()] ?? "";
  return `Nacht ${String(heute.getDate())}./${String(morgen.getDate())}. ${monat}`;
}

/** „060012SEP26" — eine Zeit für Listen, wie das Tagebuch sie schreibt. */
export function kurzzeit(zeitpunkt: string): string {
  const datum = new Date(zeitpunkt);
  if (Number.isNaN(datum.getTime())) return "—";
  return `${zwei(datum.getDate())}${zwei(datum.getHours())}${zwei(datum.getMinutes())}`;
}

const SCHICHTEN: Readonly<Record<string, string>> = { TAG: "Tag", NACHT: "Nacht", FRUEH: "Früh", SPAET: "Spät" };

/** „Nacht" statt `NACHT`. */
export function schichtText(schicht: string): string {
  return SCHICHTEN[schicht] ?? schicht;
}
