/**
 * Prüfungen eines Entwurfs **gegen den Zustand** der Akte (nicht nur gegen
 * sein Schema).
 *
 * - Aufteilen: Der Abzug darf den Bestand der Quelle je Funktion nicht
 *   übersteigen (§5.4.2). Sonst entstünde Personal aus dem Nichts („60 von
 *   12“): Die Quelle würde auf 0 geklemmt, die neue Einheit trüge die volle
 *   Stärke, die Gesamtsumme wüchse.
 * - Funkzeit (`ereignisZeit`): nicht in der Zukunft. Eine Funkzeit ist die
 *   Zeit, zu der etwas geschah; sie kann nicht nach jetzt liegen.
 *
 * Eine eigene Datei, weil `aktendienst.ts` weit über der Grenze für neue
 * Dateien liegt; dort steht nur der Aufruf.
 */

import { aufteilungPruefen, type Staerke, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import type { Bedienergebnis } from "../kontrakt/index.js";

/** Wie weit eine Funkzeit der Uhr voraus sein darf (Uhrenabweichung zwischen Geräten). */
export const FUNKZEIT_VORLAUF_MS = 5 * 60 * 1000;

function schemaFehler(meldung: string): Bedienergebnis {
  return { art: "abgewiesen", meldung, code: "SCHEMA", dauerhafterHinweis: false };
}

function alsStaerke(wert: unknown): Staerke | undefined {
  if (typeof wert !== "object" || wert === null) return undefined;
  const w = wert as Record<string, unknown>;
  if (typeof w["fuehrer"] !== "number" || typeof w["unterfuehrer"] !== "number" || typeof w["mannschaft"] !== "number") {
    return undefined;
  }
  return { fuehrer: w["fuehrer"], unterfuehrer: w["unterfuehrer"], mannschaft: w["mannschaft"] };
}

function pruefeAufteilung(zustand: Zustand, entwurf: Ereignisentwurf): Bedienergebnis | undefined {
  const nutzlast = (entwurf.nutzlast ?? {}) as Record<string, unknown>;
  const quelleId = nutzlast["quellEinheitId"];
  const abzug = alsStaerke(nutzlast["abgeteilteStaerke"]);
  const quelle = typeof quelleId === "string" ? zustand.einheiten[quelleId] : undefined;
  if (quelle === undefined || abzug === undefined) return undefined;
  const befund = aufteilungPruefen(quelle.wirksameStaerkeRechnerisch, abzug);
  return befund.ok ? undefined : { art: "abgewiesen", meldung: befund.meldung, code: "AUFTEILUNG", dauerhafterHinweis: false };
}

function pruefeFunkzeit(entwurf: Ereignisentwurf, jetztMs: number): Bedienergebnis | undefined {
  const zeit = (entwurf.nutzlast as { ereignisZeit?: unknown } | null | undefined)?.ereignisZeit;
  if (zeit === undefined) return undefined;
  const ms = typeof zeit === "string" ? Date.parse(zeit) : Number.NaN;
  if (Number.isNaN(ms)) return schemaFehler("Die Zeit des Ereignisses (Funkzeit) ist keine lesbare Zeitangabe.");
  if (ms > jetztMs + FUNKZEIT_VORLAUF_MS) {
    return schemaFehler("Die Zeit des Ereignisses (Funkzeit) liegt in der Zukunft. Bitte die Uhrzeit prüfen.");
  }
  return undefined;
}

/** Liefert die Abweisung, wenn der Entwurf gegen den Zustand nicht geschrieben werden darf. */
export function pruefeGegenZustand(zustand: Zustand, entwurf: Ereignisentwurf, jetztMs: number): Bedienergebnis | undefined {
  if (entwurf.typ === "EinheitAufgeteilt") return pruefeAufteilung(zustand, entwurf);
  if (entwurf.typ === "StatusGesetzt") return pruefeFunkzeit(entwurf, jetztMs);
  return undefined;
}
