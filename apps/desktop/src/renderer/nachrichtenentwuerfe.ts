/**
 * Zurückgestellte Entwürfe der Nachrichtenmaske (R2-FaBe P3-4, R2-SGL P3-2).
 *
 * „Abbrechen“ schließt die Maske, ohne den Entwurf zu verwerfen; beim
 * nächsten Öffnen derselben Maske (neue Nachricht, Antwort auf dieselbe
 * Nachricht, Eingang aufnehmen) steht er wieder da. Verworfen wird nur mit
 * „Verwerfen“ nach Rückfrage, oder er verschwindet mit dem Aufgeben.
 *
 * Der Entwurf ist eine Sache **dieses Fensters** (KONZEPT-NACHRICHTEN.md §5:
 * „Bis zum Knopf ‚Aufgeben' ist sie ein Entwurf dieses Fensters, kein
 * Ereignis“) und liegt deshalb im Speicher des Fensters, nicht in der Akte.
 * Solange einer liegt, warnt das Fenster beim Verlassen (`entwurf.ts`).
 */

import { merkeOffeneEingabe } from "./entwurf.js";

/** Was die Maske beim Zurückstellen hält; die Teile sind die Zustände der Maske, wie getippt. */
export interface Zurueckgestellt<T> {
  /** Wann zurückgestellt wurde (ms), für den Satz „Entwurf von 10:45“. */
  readonly zeit: number;
  readonly teile: T;
}

const ablage = new Map<string, Zurueckgestellt<unknown>>();

/** Legt den Entwurf unter `schluessel` ab; das Fenster warnt danach beim Verlassen. */
export function stelleZurueck<T>(schluessel: string, teile: T, zeit: number = Date.now()): void {
  ablage.set(schluessel, { zeit, teile });
  merkeOffeneEingabe(`nachrichtenentwurf:${schluessel}`, true);
}

/** Der zurückgestellte Entwurf unter `schluessel`, sonst `undefined`. */
export function zurueckgestellt<T>(schluessel: string | undefined): Zurueckgestellt<T> | undefined {
  return schluessel === undefined ? undefined : (ablage.get(schluessel) as Zurueckgestellt<T> | undefined);
}

/** Vergisst den Entwurf (aufgegeben oder verworfen). */
export function vergiss(schluessel: string | undefined): void {
  if (schluessel === undefined) return;
  ablage.delete(schluessel);
  merkeOffeneEingabe(`nachrichtenentwurf:${schluessel}`, false);
}

/** Leert die Ablage — für Tests und den Wechsel des Einsatzes. */
export function vergissAlle(): void {
  for (const schluessel of [...ablage.keys()]) vergiss(schluessel);
}
