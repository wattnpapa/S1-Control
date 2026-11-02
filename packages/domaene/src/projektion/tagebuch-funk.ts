/**
 * Die Sätze des Funkplans im Einsatztagebuch (KONZEPT-FUNKPLAN.md §8).
 *
 * Ein Rufgruppenwechsel steht als „Rufgruppe THW_OL_BR → THW_OL_EA2“ im
 * Tagebuch und nicht als Kennung; der Grund steht wie bei jeder Zeile in
 * seiner eigenen Spalte. Gesucht wird der Name **heute**, wie im übrigen
 * Tagebuch; eine Gruppe, die es nicht mehr gibt, heißt nach ihrer Kennung.
 *
 * Dazu der Funkauszug einer Einheit (Maske „Funk und Erreichbarkeit"): welche
 * Zeilen zum Funkplan gehören, entscheidet {@link istFunkzeile} an einer
 * Stelle, damit der Auszug nicht im Renderer nach Wörtern im Satz sucht.
 */

import type { EingehendesEreignis } from "../fold.js";
import { FUNK_KONTAKT_SCHWELLE_VORBELEGUNG } from "../werte.js";
import type { Zustand } from "../zustand.js";

import type { Tagebuchzeile } from "./tagebuch.js";

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

/** „THW_OL_FUE, DMO 311" — die Namen einer Liste weiterer Rufgruppen; leer heißt „keine". */
function rufgruppenliste(zustand: Zustand, wert: unknown): string {
  const ids = Array.isArray(wert) ? wert.filter((id): id is string => typeof id === "string" && id !== "") : [];
  return ids.length === 0 ? "keine" : ids.map((id) => rufgruppenname(zustand, id)).join(", ");
}

/** Die weiteren Rufgruppen mit Namen; die übrigen Stammdaten baut der allgemeine Satz. */
function stammdatensatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string | undefined {
  const feld = (ereignis.nutzlast as { feld?: unknown } | null)?.feld;
  if (feld !== "weitereRufgruppenIds") return undefined;
  const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
  return `${betreff} (weitere Rufgruppen): ${rufgruppenliste(zustand, vorher)} → ${rufgruppenliste(zustand, ereignis.neu)}`;
}

/**
 * Die Stammdatenfelder der Einheit, die zum Funkplan gehören — der Inhalt des
 * Reiters „Funk und Erreichbarkeit". Die Erreichbarkeit steht dabei, weil sie
 * die Antwort auf „wen rufe ich an, wenn Funk nicht geht" ist (§2).
 */
export const FUNKFELDER_DER_EINHEIT: ReadonlySet<string> = new Set([
  "weitereRufgruppenIds",
  "funkHinweis",
  "funkrufnameOverride",
  "erreichbarkeitOverride",
]);

/** Gehört die Zeile in den Funkauszug einer Einheit? */
export function istFunkzeile(zeile: Pick<Tagebuchzeile, "typ" | "feld">): boolean {
  if (zeile.typ === "EinheitRufgruppeGesetzt" || zeile.typ === "FunkprobeDurchgefuehrt") return true;
  return zeile.typ === "EinheitStammdatenGeaendert" && zeile.feld !== undefined && FUNKFELDER_DER_EINHEIT.has(zeile.feld);
}

const ERGEBNIS_WORT: Readonly<Record<string, string>> = { KONTAKT: "Kontakt", KEIN_KONTAKT: "kein Kontakt" };

/**
 * „Funkprobe THW_OL_EA2: Kontakt" — die Gruppe beim Namen, das Ergebnis als
 * Wort; Funkzeit und Grund stehen in ihren eigenen Spalten. Eine Rücknahme
 * setzt den Vorher-Wert und ist keine Probe; sie heißt so.
 */
function funkprobensatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string {
  const ergebnis = (ereignis.nutzlast as { ergebnis?: unknown } | null)?.ergebnis;
  const wort = ERGEBNIS_WORT[String(ergebnis)] ?? String(ergebnis);
  if (ereignis.undoOf !== undefined) return `${betreff} zurückgenommen (${wort})`;
  const gruppe = text((ereignis.neu as { rufgruppeId?: unknown } | null | undefined)?.rufgruppeId);
  return `${betreff}${gruppe === undefined ? "" : ` ${rufgruppenname(zustand, gruppe)}`}: ${wort}`;
}

/** „Schwelle „kein Kontakt“: 60 → 45 min"; ohne Vorher-Wert gilt die Vorbelegung. */
function schwellensatz(ereignis: EingehendesEreignis, betreff: string): string {
  const vorher = "vorher" in ereignis && typeof ereignis.vorher === "number" ? ereignis.vorher : FUNK_KONTAKT_SCHWELLE_VORBELEGUNG;
  const neu = typeof ereignis.neu === "number" ? ereignis.neu : FUNK_KONTAKT_SCHWELLE_VORBELEGUNG;
  return `${betreff}: ${String(vorher)} → ${String(neu)} min`;
}

/** Der Satz für die Arten des Funkplans; `undefined`, wenn der allgemeine Zusammenbau gilt. */
export function funksatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string | undefined {
  switch (ereignis.typ) {
    case "EinheitStammdatenGeaendert":
      return stammdatensatz(zustand, ereignis, betreff);
    case "RufgruppeAngelegt":
      return anlagesatz(ereignis, betreff);
    case "RufgruppeGeaendert":
      return aenderungssatz(zustand, ereignis, betreff);
    case "RufgruppeAufgeloest":
    case "RufgruppeWiederhergestellt":
      return betreff;
    case "FunkprobeDurchgefuehrt":
      return funkprobensatz(zustand, ereignis, betreff);
    case "FunkParameterGesetzt":
      return schwellensatz(ereignis, betreff);
    case "EinheitRufgruppeGesetzt": {
      const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
      const von = text(vorher) === undefined ? "" : `${rufgruppenname(zustand, vorher)} → `;
      return `${betreff}: ${von}${rufgruppenname(zustand, ereignis.neu)}`;
    }
    default:
      return undefined;
  }
}
