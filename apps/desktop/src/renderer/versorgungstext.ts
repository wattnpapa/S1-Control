/**
 * Die Wörter und Zeitangaben der Versorgung (S4.1) — rein, ohne React.
 *
 * Gerechnet wird in Ring 2; hier wird nur geschrieben: „Abend 1800",
 * „morgen", „in 3 h 17 min", „+24", „−14". `jetzt` wird übergeben wie im
 * Monitor, damit die Texte in jsdom prüfbar sind.
 *
 * Die Uhrzeit steht in der Anzeigezone Europe/Berlin, wie die taktische Zeit
 * im Kopfband (`taktischeZeit` in formate.ts): Zwei Uhren an einem
 * Arbeitsplatz, die verschieden gehen, ließen den Bediener raten (Audits
 * Nachrichten SGL P3-16, LdF P2-4 — vorher die Ortszeit des Rechners).
 */

import { anzeigezoneWandzeit, projektion, uhrzeitVierstellig, type Mahlzeit } from "@s1/domaene";

function zwei(zahl: number): string {
  return String(zahl).padStart(2, "0");
}

/** „1800" — die Ausgabezeit in der Anzeigezone. */
export function uhrzeitText(zeitpunkt: string): string {
  return uhrzeitVierstellig(zeitpunkt) || "—";
}

/** Der Kalendertag in der Anzeigezone als Zahl (Tage seit 1970), für den Abstand zweier Tage. */
function tagesbeginn(ms: number): number {
  const w = anzeigezoneWandzeit(ms);
  return w === undefined ? Number.NaN : Date.UTC(w.jahr, w.monat - 1, w.tag);
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

/** „Nacht 10./11. SEP" — die kommende Nacht in der Anzeigezone. */
export function nachtText(jetzt: number): string {
  const w = anzeigezoneWandzeit(jetzt);
  if (w === undefined) return "";
  const morgen = new Date(Date.UTC(w.jahr, w.monat - 1, w.tag + 1));
  const monat = MONATE[morgen.getUTCMonth()] ?? "";
  return `Nacht ${String(w.tag)}./${String(morgen.getUTCDate())}. ${monat}`;
}

/** „060012SEP26" — eine Zeit für Listen, wie das Tagebuch sie schreibt (Anzeigezone). */
export function kurzzeit(zeitpunkt: string): string {
  const w = anzeigezoneWandzeit(zeitpunkt);
  if (w === undefined) return "—";
  return `${zwei(w.tag)}${zwei(w.stunde)}${zwei(w.minute)}`;
}

const SCHICHTEN: Readonly<Record<string, string>> = { TAG: "Tag", NACHT: "Nacht", FRUEH: "Früh", SPAET: "Spät" };

/** „Nacht" statt `NACHT`. */
export function schichtText(schicht: string): string {
  return SCHICHTEN[schicht] ?? schicht;
}

/** „1 Einheit", „3 Einheiten" — Zahl und Wort in der richtigen Form. */
export function einheitenText(anzahl: number): string {
  return `${String(anzahl)} ${anzahl === 1 ? "Einheit" : "Einheiten"}`;
}
