/**
 * Die Bedienschritte der Versorgung (S4) — Entwürfe für den Ruf `bedienen`.
 *
 * Eigene Datei neben `bedienschritte.ts`, damit jene nicht weiter wächst.
 * Jede Funktion baut genau einen Entwurf; geschrieben wird im Worker, in
 * einer Transaktion, wie jeder andere Bedienschritt.
 */

import type { Entwurf } from "./index.js";

export interface Unterkunftsanlage {
  readonly unterkunftId: string;
  readonly name: string;
  readonly ort?: string;
  readonly kapazitaet: number;
  readonly bemerkung?: string;
}

export function unterkunftAnlegen(anlage: Unterkunftsanlage): Entwurf {
  return { typ: "UnterkunftAngelegt", nutzlast: { ...anlage } };
}

export const UNTERKUNFTSFELDER = ["name", "ort", "kapazitaet", "bemerkung"] as const;
export type Unterkunftsfeld = (typeof UNTERKUNFTSFELDER)[number];

/** Ein Feld der Unterkunft; `vorher` ist der Wert, den der Editor beim Öffnen sah. */
export function unterkunftGeaendert(
  unterkunftId: string,
  feld: Unterkunftsfeld,
  vorher: string | number | null,
  neu: string | number | null,
): Entwurf {
  return { typ: "UnterkunftGeaendert", nutzlast: { unterkunftId, feld }, vorher, neu, vorwertPruefen: true };
}

export function unterkunftAufgeloest(unterkunftId: string, grund: string): Entwurf {
  return { typ: "UnterkunftAufgeloest", nutzlast: { unterkunftId }, vorher: null, neu: true, grund };
}

export function unterkunftWiederhergestellt(unterkunftId: string): Entwurf {
  return { typ: "UnterkunftWiederhergestellt", nutzlast: { unterkunftId }, vorher: true, neu: false };
}

/** Weist eine Einheit einer Unterkunft zu; `vorher` ist die bisherige oder `null`. */
export function einheitUntergebracht(einheitId: string, vorher: string | null, unterkunftId: string): Entwurf {
  return { typ: "EinheitUntergebracht", nutzlast: { einheitId }, vorher, neu: unterkunftId, vorwertPruefen: true };
}

export function unterbringungAufgehoben(einheitId: string, vorher: string): Entwurf {
  return { typ: "UnterbringungAufgehoben", nutzlast: { einheitId }, vorher, neu: null, vorwertPruefen: true };
}

/** Der Zuweisungsschritt aus einer Zellwahl: neue Unterkunft, Aufhebung oder nichts. */
export function zuweisung(einheitId: string, vorher: string | undefined, gewaehlt: string): Entwurf | undefined {
  if (gewaehlt === (vorher ?? "")) return undefined;
  if (gewaehlt === "") return vorher === undefined ? undefined : unterbringungAufgehoben(einheitId, vorher);
  return einheitUntergebracht(einheitId, vorher ?? null, gewaehlt);
}
