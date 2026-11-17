/**
 * Was dieser Browser über die gewählte Stelle weiß (Audits LdF P3-3,
 * Fernmelder P3-3): Wer die Seite neu lädt, bekommt die Abfrage von Stelle und
 * Handzeichen wieder — vorbelegt aus den Einstellungen des Dienstes. Die gelten
 * aber für alle Browser am selben Dienst, und an einer Web-Schale mit mehreren
 * Arbeitsplätzen stand dann die Stelle eines anderen darin. Der Merker hier
 * gehört dem Browser-Tab (`sessionStorage`, dazu `localStorage` als Rückfall
 * mit Zeitstempel wie beim Blatt-Merker): Nach F5 steht die eigene Wahl da und
 * wird mit einem Klick bestätigt.
 *
 * Alles hier ist Komfort; ohne Speicher gilt die Vorbelegung aus den
 * Einstellungen wie bisher.
 */

import type { Sitzungsstellen } from "../kontrakt/index.js";

const PRAEFIX = "s1.stelle.";

/** Wie lange der Rückfall im `localStorage` gilt: eine Schicht plus Reserve (wie `MERKER_MAX_ALTER_MS`). */
export const STELLENMERKER_MAX_ALTER_MS = 12 * 60 * 60 * 1000;

interface Gemerkt {
  readonly stellen: readonly string[];
  readonly handzeichen?: string;
  readonly zeit: number;
}

function alsGemerkt(wert: unknown): Gemerkt | undefined {
  if (typeof wert !== "object" || wert === null) return undefined;
  const { stellen, handzeichen, zeit } = wert as Record<string, unknown>;
  if (!Array.isArray(stellen) || !stellen.every((s): s is string => typeof s === "string") || typeof zeit !== "number") return undefined;
  return { stellen, zeit, ...(typeof handzeichen === "string" ? { handzeichen } : {}) };
}

function lies(art: "sessionStorage" | "localStorage", schluessel: string): Gemerkt | undefined {
  try {
    const roh = globalThis[art].getItem(schluessel);
    return roh === null ? undefined : alsGemerkt(JSON.parse(roh));
  } catch {
    return undefined;
  }
}

/** Merkt die bestätigte Wahl dieses Tabs für den Einsatz `ordner`. */
export function merkeStelle(ordner: string, sitzung: Sitzungsstellen, jetzt: number = Date.now()): void {
  const wert = JSON.stringify({ stellen: sitzung.stellen, ...(sitzung.handzeichen === undefined ? {} : { handzeichen: sitzung.handzeichen }), zeit: jetzt });
  for (const art of ["sessionStorage", "localStorage"] as const) {
    try {
      globalThis[art].setItem(PRAEFIX + ordner, wert);
    } catch {
      // Gesperrt oder voll: dann gilt die Vorbelegung aus den Einstellungen.
    }
  }
}

/** Die gemerkte Wahl dieses Tabs für `ordner`; der Rückfall im `localStorage` nur, solange er jung ist. */
export function gemerkteStelle(ordner: string, jetzt: number = Date.now()): Sitzungsstellen | undefined {
  const tab = lies("sessionStorage", PRAEFIX + ordner);
  const lokal = lies("localStorage", PRAEFIX + ordner);
  const treffer = tab ?? (lokal !== undefined && jetzt - lokal.zeit <= STELLENMERKER_MAX_ALTER_MS ? lokal : undefined);
  if (treffer === undefined || treffer.stellen.length === 0) return undefined;
  return { stellen: treffer.stellen, ...(treffer.handzeichen === undefined ? {} : { handzeichen: treffer.handzeichen }) };
}
