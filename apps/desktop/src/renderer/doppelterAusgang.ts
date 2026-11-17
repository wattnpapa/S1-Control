/**
 * Zwei gleiche Ausgänge hintereinander (Audit Sachgebietsleiter P3-20): Bei
 * Funkverkehr ist ein doppelter Befehl nicht harmlos. Vor „Aufgeben“ prüft die
 * Maske, ob dieselbe Anschrift mit demselben Betreff und Inhalt vor wenigen
 * Minuten schon aufgegeben wurde, und fragt einmal nach — wie „Trotzdem ohne
 * Nummer“ bei der Beförderung. Sperren tut sie nicht: Ein Befehl, der absichtlich
 * wiederholt wird, geht mit dem zweiten Klick hinaus.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import { rufe } from "./bruecke.js";

/** Innerhalb dieser Zeit gilt ein gleicher Ausgang als Verdacht auf Doppelung. */
export const DOPPELT_FENSTER_MS = 5 * 60_000;

export interface Neuausgang {
  readonly anschrift: string;
  readonly betreff: string;
  readonly inhalt: string;
}

const norm = (text: string): string => text.trim().replace(/\s+/gu, " ").toLocaleLowerCase("de");

/** Der gleiche Ausgang (Anschrift, Betreff, Inhalt) aus den letzten Minuten, sonst `undefined`; Zurückgezogene zählen nicht. */
export function findeDoppelten(neu: Neuausgang, zeilen: readonly Nachrichtenzeile[], jetzt: number = Date.now()): Nachrichtenzeile | undefined {
  return zeilen.find((z) => {
    const zeit = z.abfassungszeit === undefined ? Number.NaN : Date.parse(z.abfassungszeit);
    return (
      z.richtungKurz === "A" &&
      !z.zurueckgezogen &&
      Number.isFinite(zeit) &&
      jetzt - zeit <= DOPPELT_FENSTER_MS &&
      norm(z.anschrift) === norm(neu.anschrift) &&
      norm(z.betreff) === norm(neu.betreff) &&
      norm(z.inhalt) === norm(neu.inhalt)
    );
  });
}

/** Der Satz für die Rückfrage; `undefined`, wenn es keinen gleichen Ausgang gibt oder die Abfrage scheitert (dann gilt: aufgeben). */
export async function doppelterAusgangText(akteId: string, neu: Neuausgang): Promise<string | undefined> {
  try {
    const ansicht = await rufe({ art: "nachrichtenAnfordern", akteId, sicht: "nachweisung", ...(neu.betreff.trim() === "" ? {} : { suche: neu.betreff.trim() }) });
    const doppelt = findeDoppelten(neu, ansicht.zeilen);
    if (doppelt === undefined) return undefined;
    const nummer = doppelt.nummer === undefined ? "ohne Nummer" : `Nr. ${String(doppelt.nummer)}`;
    return `Dieselbe Nachricht an ${doppelt.anschrift} ist vor wenigen Minuten schon aufgegeben (${nummer}). Noch einmal aufgeben?`;
  } catch {
    // Die Prüfung ist Komfort: Ohne Antwort wird nichts aufgehalten.
    return undefined;
  }
}
