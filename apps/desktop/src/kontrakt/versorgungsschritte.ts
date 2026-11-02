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

// --- Verpflegung (S4.3) ------------------------------------------------------

export interface Regelzeile {
  readonly mahlzeit: string;
  readonly uhrzeit: string;
  readonly schichten: readonly string[];
}

/** Setzt die Mahlzeitenregel des Einsatzes als Ganzes; `vorher` ist die eigene Regel oder `null`. */
export function mahlzeitenregelGesetzt(einsatzId: string, vorher: readonly Regelzeile[] | null, neu: readonly Regelzeile[]): Entwurf {
  return { typ: "MahlzeitenregelGesetzt", nutzlast: { einsatzId }, vorher, neu };
}

export interface Ausgabestellenanlage {
  readonly ausgabestelleId: string;
  readonly name: string;
  readonly ort?: string;
  readonly traeger?: string;
}

export function ausgabestelleAnlegen(anlage: Ausgabestellenanlage): Entwurf {
  return { typ: "AusgabestelleAngelegt", nutzlast: { ...anlage } };
}

/** Die Ausgabestelle eines Bereichs; `null` stellt die Vorbelegung wieder her. */
export function abschnittAusgabestelle(abschnittId: string, vorher: string | null, neu: string | null): Entwurf {
  return { typ: "AbschnittAusgabestelleGesetzt", nutzlast: { abschnittId }, vorher, neu, vorwertPruefen: true };
}

export interface Bestellanlage {
  readonly bestellungId: string;
  readonly datum: string;
  readonly mahlzeit: string;
  readonly ausgabestelleId?: string;
  readonly portionen: number;
  readonly vegetarisch: number;
  readonly vegan: number;
  readonly bestelltBei?: string;
  readonly bestelltVon?: string;
}

export function mahlzeitBestellt(anlage: Bestellanlage): Entwurf {
  return { typ: "MahlzeitBestellt", nutzlast: { ...anlage } };
}

export function mahlzeitGeliefert(bestellungId: string, vorher: number | null, portionen: number): Entwurf {
  return { typ: "MahlzeitGeliefert", nutzlast: { bestellungId }, vorher, neu: portionen };
}

export function mahlzeitStorniert(bestellungId: string, grund: string): Entwurf {
  return { typ: "MahlzeitStorniert", nutzlast: { bestellungId }, vorher: null, neu: true, grund };
}

// --- Sofortbedarf (S4.4) -----------------------------------------------------

export const SOFORTBEDARF_FELDER = ["VERPFLEGUNG", "DIESEL", "BENZIN", "GEMISCH", "UNTERBRINGUNG", "RUHEZEIT"] as const;
export type Sofortfeld = (typeof SOFORTBEDARF_FELDER)[number];

export function sofortbedarfErledigt(einheitId: string, feld: Sofortfeld): Entwurf {
  return { typ: "SofortbedarfErledigt", nutzlast: { einheitId, feld }, vorher: null, neu: true };
}

export function sofortbedarfWiederOffen(einheitId: string, feld: Sofortfeld): Entwurf {
  return { typ: "SofortbedarfWiederOffen", nutzlast: { einheitId, feld }, vorher: true, neu: false };
}

interface Abarbeitungszeile {
  readonly einheitId: string;
  readonly felder: readonly Sofortfeld[];
  readonly erledigt: { readonly [feld in Sofortfeld]?: string };
}

/**
 * Die Schritte für „Als erledigt melden" bzw. „Wieder öffnen" über eine
 * Auswahl: je gewählter Zeile und Feld ein Ereignis — nur dort, wo sich
 * etwas ändert. `feld` ohne Angabe heißt: alle Felder mit Bedarf.
 */
export function abarbeitung(
  zeilen: readonly Abarbeitungszeile[],
  auswahl: ReadonlySet<string>,
  art: "erledigt" | "offen",
  feld?: Sofortfeld,
): Entwurf[] {
  const schritte: Entwurf[] = [];
  for (const zeile of zeilen) {
    if (!auswahl.has(zeile.einheitId)) continue;
    for (const f of zeile.felder) {
      if (feld !== undefined && f !== feld) continue;
      const ist = zeile.erledigt[f] !== undefined;
      if (art === "erledigt" && !ist) schritte.push(sofortbedarfErledigt(zeile.einheitId, f));
      if (art === "offen" && ist) schritte.push(sofortbedarfWiederOffen(zeile.einheitId, f));
    }
  }
  return schritte;
}
