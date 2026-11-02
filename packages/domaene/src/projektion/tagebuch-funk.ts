/**
 * Die Sätze des Funkplans im Einsatztagebuch (KONZEPT-FUNKPLAN.md §8).
 *
 * Ein Rufgruppenwechsel steht als „Rufgruppe THW_OL_BR → THW_OL_EA2“ im
 * Tagebuch und nicht als Kennung; der Grund steht wie bei jeder Zeile in
 * seiner eigenen Spalte. Gesucht wird der Name **heute**, wie im übrigen
 * Tagebuch; eine Gruppe, die es nicht mehr gibt, heißt nach ihrer Kennung.
 */

import type { EingehendesEreignis } from "../fold.js";
import type { Zustand } from "../zustand.js";

const BETRIEBSART_WORT: Readonly<Record<string, string>> = { TMO: "TMO", DMO: "DMO", ANALOG: "Analog" };

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

/** Das Wort einer Betriebsart; ein unbekannter Wert steht, wie er kam (§3.7). */
export function betriebsartWort(wert: unknown): string {
  const art = text(wert);
  return art === undefined ? "—" : (BETRIEBSART_WORT[art] ?? art);
}

/** Der Name einer Rufgruppe statt ihrer Kennung. */
export function rufgruppenname(zustand: Zustand, id: unknown): string {
  const kennung = text(id);
  if (kennung === undefined) return "keine Rufgruppe";
  return text(zustand.rufgruppen?.[kennung]?.name.wert) ?? kennung;
}

function bereichsname(zustand: Zustand, id: unknown): string {
  const kennung = text(id);
  if (kennung === undefined) return "kein Bereich";
  return text(zustand.abschnitte[kennung]?.name.wert) ?? kennung;
}

function anlagesatz(ereignis: EingehendesEreignis, betreff: string): string {
  const n = (ereignis.nutzlast ?? {}) as Record<string, unknown>;
  const teile = [betriebsartWort(n["betriebsart"]), text(n["zweck"]), text(n["hoert"]) === undefined ? undefined : `hört ${String(n["hoert"])}`];
  return `${betreff} (${teile.filter((t): t is string => t !== undefined).join(", ")})`;
}

function aenderungssatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string | undefined {
  const feld = (ereignis.nutzlast as { feld?: unknown } | null)?.feld;
  const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
  if (feld === "abschnittId") {
    return `${betreff} (Bereich): ${bereichsname(zustand, vorher)} → ${bereichsname(zustand, ereignis.neu)}`;
  }
  if (feld === "betriebsart") {
    return `${betreff} (Betriebsart): ${betriebsartWort(vorher)} → ${betriebsartWort(ereignis.neu)}`;
  }
  return undefined;
}

/** Der Satz für die Arten des Funkplans; `undefined`, wenn der allgemeine Zusammenbau gilt. */
export function funksatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string | undefined {
  switch (ereignis.typ) {
    case "RufgruppeAngelegt":
      return anlagesatz(ereignis, betreff);
    case "RufgruppeGeaendert":
      return aenderungssatz(zustand, ereignis, betreff);
    case "RufgruppeAufgeloest":
    case "RufgruppeWiederhergestellt":
      return betreff;
    case "EinheitRufgruppeGesetzt": {
      const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
      const von = text(vorher) === undefined ? "" : `${rufgruppenname(zustand, vorher)} → `;
      return `${betreff}: ${von}${rufgruppenname(zustand, ereignis.neu)}`;
    }
    default:
      return undefined;
  }
}
