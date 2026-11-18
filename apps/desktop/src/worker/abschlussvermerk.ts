/**
 * Der Abschluss des Einsatzes im Tagebuch (Audits Nachrichten Runde 2:
 * R2-LdF P2-7, R2-ETB P2-2).
 *
 * Zwei Dinge, die bis hier nur im Dialog „Einsatz beenden“ standen und mit
 * ihm verschwanden:
 *
 *  - **Was an Nachrichten offen blieb.** Vor `EinsatzBeendet` schreibt der
 *    Worker einen Tagebucheintrag „Einsatz beendet, offene Nachrichten: …;
 *    fehlende Nummern: …“ — nur, wenn etwas offen ist. Er steht damit in
 *    Tagebuch und Akte, mit der Zeit des Einsatzendes.
 *  - **Wer beendet hat.** `EinsatzBeendet` trägt Stelle und Handzeichen der
 *    Sitzung; die Abschlusszeile von Tagebuch und Nachweisung nennt sie
 *    („Einsatztagebuch abgeschlossen …, S1 · Mü“) statt „Arbeitsplatz“.
 *
 * **Warum vor und nicht nach dem Einsatzende.** Ein beendeter Einsatz nimmt
 * nichts mehr an außer den Schritten des Abschlusses (`einsatzabschluss.ts`,
 * AGENTS.md §3). Ein Folgeschritt danach müsste diese Sperre durchbrechen.
 * Der Vermerk wird deshalb unmittelbar davor in derselben Warteschlange
 * geschrieben, erst nachdem die Prüfung des Einsatzendes bestanden ist;
 * scheitert das Einsatzende trotzdem, bleibt ein Vermerk mit richtigen
 * Zahlen stehen — kein Schaden, ein zweites Beenden schreibt einen neuen.
 */

import { randomUUID } from "node:crypto";

import { projektion, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import type { Sitzungsstellen } from "../kontrakt/index.js";

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : undefined;
}

/** Stelle und Handzeichen für die Nutzlast; die erste Stelle der Sitzung steht für sie. */
function sitzungsangaben(sitzung: Sitzungsstellen | undefined): { stelle?: string; handzeichen?: string } {
  const stelle = sitzung?.stellen[0];
  const hz = sitzung?.handzeichen?.trim() ?? "";
  return { ...(stelle === undefined ? {} : { stelle }), ...(hz === "" ? {} : { handzeichen: hz }) };
}

/** `EinsatzBeendet` mit Stelle und Handzeichen der Sitzung — nur, wenn die Nutzlast sie nicht schon trägt. */
export function mitAbschlussangaben<T extends Ereignisentwurf>(entwurf: T, sitzung: Sitzungsstellen | undefined): T {
  if (entwurf.typ !== "EinsatzBeendet" || entwurf.undoOf !== undefined) return entwurf;
  const nutzlast = objekt(entwurf.nutzlast) ?? {};
  if (typeof nutzlast["stelle"] === "string" || typeof nutzlast["handzeichen"] === "string") return entwurf;
  return { ...entwurf, nutzlast: { ...nutzlast, ...sitzungsangaben(sitzung) } };
}

/**
 * Der Tagebucheintrag mit den offenen Nachrichten, der vor `EinsatzBeendet`
 * geschrieben wird; `undefined` ohne Nachrichten oder wenn nichts offen ist.
 */
export function abschlussvermerkEntwurf(zustand: Zustand, entwurf: Ereignisentwurf, sitzung: Sitzungsstellen | undefined): Ereignisentwurf | undefined {
  if (entwurf.typ !== "EinsatzBeendet" || typeof entwurf.neu !== "string" || zustand.nachrichten === undefined) return undefined;
  const zeilen = projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen;
  const text = projektion.abschlussvermerk(projektion.offeneNachrichten(zeilen), projektion.nummernluecken(zeilen));
  if (text === undefined) return undefined;
  return {
    typ: "EtbEintragErfasst",
    nutzlast: { etbId: `ETB-abschluss-${randomUUID()}`, zeitpunkt: entwurf.neu, text, ...sitzungsangaben(sitzung) },
  };
}
