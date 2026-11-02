/**
 * Unterbringung (S4.1/S4.2, KONZEPT-S4.md §5.3): Bedarf, Unterkünfte, Belegung.
 *
 * Der **Bedarf** ist K6 — „Unterbringung ja" aus dem Bogen, Köpfe nach m/w/d
 * aus den Personen oder dem Override der Einheit. Die **Belegung** einer
 * Unterkunft ist die Summe der Einheiten, die ihr zugewiesen sind
 * (`unterkunftId` an der Einheit): mit ihrem Bedarf, und wo keiner gemeldet
 * ist, mit ihren Köpfen — wer zugewiesen wird, schläft dort.
 *
 * Eine Zuweisung über die Kapazität wird nicht verweigert, sondern als
 * überbelegt gezeigt: Im Einsatz schlafen zwanzig Leute auch in einer Halle
 * für zwölf, und die Software soll das wissen, nicht verhindern.
 */

import { logistik, uebernachtung } from "../kennzahlen.js";
import type { UnterkunftZustand, Zustand } from "../zustand.js";

import { bezeichnung, bogenbedarf, type Versorgungseinheit } from "./versorgung.js";

export interface Bettensumme {
  readonly m: number;
  readonly w: number;
  readonly d: number;
  readonly gesamt: number;
}

export type Unterbringungszustand = "OHNE_UNTERKUNFT" | "ZUGEWIESEN" | "AUFGELOEST";

export interface Bedarfszeile {
  readonly einheitId: string;
  readonly einheit: string;
  readonly bereich: string;
  readonly schicht: string;
  readonly m: number;
  readonly w: number;
  readonly d: number;
  readonly ruhezeit: boolean;
  /** Noch im Anmarsch — der Bedarf kommt, ist aber nicht da. */
  readonly anmarsch: boolean;
  /** Die zugewiesene Unterkunft, sofern eine gilt (auch eine aufgelöste). */
  readonly unterkunftId?: string;
  readonly unterkunft?: string;
  readonly zustand: Unterbringungszustand;
}

export interface Unterbringungsbedarf {
  readonly zeilen: readonly Bedarfszeile[];
  /** Die Summe der Einsatzbereiche — ohne Anmarsch, wie K6 im Logistikblatt. */
  readonly summe: Bettensumme & { readonly einheiten: number };
  readonly anmarsch: Bettensumme & { readonly einheiten: number };
}

type Summe = Bettensumme & { einheiten: number };
const BETTEN_NULL: Summe = { m: 0, w: 0, d: 0, gesamt: 0, einheiten: 0 };

function plus(s: Summe, z: { readonly m: number; readonly w: number; readonly d: number }): Summe {
  return { m: s.m + z.m, w: s.w + z.w, d: s.d + z.d, gesamt: s.gesamt + z.m + z.w + z.d, einheiten: s.einheiten + 1 };
}

/** Eine Unterkunft, die gilt: angelegt und nicht aufgelöst. */
function gueltig(u: UnterkunftZustand | undefined): u is UnterkunftZustand {
  return u !== undefined && u.aufgeloest?.wert !== true;
}

function zuweisung(zustand: Zustand, eintrag: Versorgungseinheit): { id?: string; u?: UnterkunftZustand } {
  const wert = eintrag.einheit.unterkunftId?.wert;
  if (typeof wert !== "string") return {};
  const u = zustand.unterkuenfte?.[wert];
  return u === undefined ? { id: wert } : { id: wert, u };
}

function zustandDer(u: UnterkunftZustand | undefined, id: string | undefined): Unterbringungszustand {
  if (id === undefined) return "OHNE_UNTERKUNFT";
  return gueltig(u) ? "ZUGEWIESEN" : "AUFGELOEST";
}

const REIHENFOLGE: Readonly<Record<Unterbringungszustand, number>> = { OHNE_UNTERKUNFT: 0, AUFGELOEST: 1, ZUGEWIESEN: 2 };

/** Die Einheiten mit Übernachtungsbedarf oder Zuweisung: ohne Unterkunft zuerst, Anmarsch zuletzt. */
export function unterbringungsbedarf(zustand: Zustand, einheiten: readonly Versorgungseinheit[]): readonly Bedarfszeile[] {
  const zeilen: Bedarfszeile[] = [];
  for (const eintrag of einheiten) {
    const bedarf = uebernachtung(zustand, eintrag.einheit);
    const { id, u } = zuweisung(zustand, eintrag);
    if (bedarf.m + bedarf.w + bedarf.d === 0 && id === undefined) continue;
    const name = u?.name.wert;
    zeilen.push({
      einheitId: eintrag.einheit.id,
      einheit: bezeichnung(eintrag),
      bereich: eintrag.bereich,
      schicht: eintrag.schicht,
      ...bedarf,
      ruhezeit: bogenbedarf(eintrag)?.ruhezeitErforderlich === true,
      anmarsch: eintrag.klasse !== "BESTAND",
      ...(id === undefined ? {} : { unterkunftId: id }),
      ...(typeof name === "string" ? { unterkunft: name } : {}),
      zustand: zustandDer(u, id),
    });
  }
  return zeilen.sort(
    (a, b) => Number(a.anmarsch) - Number(b.anmarsch) || REIHENFOLGE[a.zustand] - REIHENFOLGE[b.zustand],
  );
}

/** Der Übernachtungsbedarf (K6) mit Summen, Anmarsch getrennt. */
export function unterbringung(zustand: Zustand, einheiten: readonly Versorgungseinheit[]): Unterbringungsbedarf {
  const zeilen = unterbringungsbedarf(zustand, einheiten);
  return {
    zeilen,
    summe: zeilen.filter((z) => !z.anmarsch).reduce(plus, BETTEN_NULL),
    anmarsch: zeilen.filter((z) => z.anmarsch).reduce(plus, BETTEN_NULL),
  };
}

// ---------------------------------------------------------------------------
// Belegung (4e, Monitor 4b)
// ---------------------------------------------------------------------------

export interface Belegungszeile {
  readonly einheitId: string;
  readonly einheit: string;
  readonly bereich: string;
  readonly m: number;
  readonly w: number;
  readonly d: number;
}

export interface Unterkunftskarte {
  readonly unterkunftId: string;
  readonly name: string;
  readonly ort?: string;
  readonly bemerkung?: string;
  readonly kapazitaet: number;
  readonly aufgeloest: boolean;
  readonly belegt: Bettensumme;
  /** `kapazitaet − belegt`; negativ heißt überbelegt. */
  readonly frei: number;
  readonly ueberbelegt: boolean;
  readonly einheiten: readonly Belegungszeile[];
}

export interface Belegung {
  /** Die geltenden Unterkünfte in Namensordnung, die aufgelösten danach. */
  readonly unterkuenfte: readonly Unterkunftskarte[];
  /** Summen über die geltenden Unterkünfte; `frei` je Halle nicht unter null. */
  readonly kapazitaet: number;
  readonly belegt: number;
  readonly frei: number;
  /** Bedarf der Einsatzbereiche ohne geltende Unterkunft (Bernstein). */
  readonly ohneZuweisung: { readonly koepfe: number; readonly einheiten: number };
}

/** Was eine zugewiesene Einheit belegt: ihren Bedarf, ohne Bedarf ihre Köpfe (K5). */
function belegtVon(zustand: Zustand, eintrag: Versorgungseinheit): { m: number; w: number; d: number } {
  const bedarf = uebernachtung(zustand, eintrag.einheit);
  if (bedarf.m + bedarf.w + bedarf.d > 0) return bedarf;
  const k = logistik(zustand, eintrag.einheit);
  return { m: k.maennlich, w: k.weiblich, d: k.divers };
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.length > 0 ? wert : undefined;
}

function karte(u: UnterkunftZustand, einheiten: readonly Belegungszeile[]): Unterkunftskarte {
  const belegt = einheiten.reduce<Summe>(plus, BETTEN_NULL);
  const kapazitaet = typeof u.kapazitaet.wert === "number" ? u.kapazitaet.wert : 0;
  const ort = text(u.ort?.wert);
  const bemerkung = text(u.bemerkung?.wert);
  return {
    unterkunftId: u.id,
    name: text(u.name.wert) ?? u.id,
    ...(ort === undefined ? {} : { ort }),
    ...(bemerkung === undefined ? {} : { bemerkung }),
    kapazitaet,
    aufgeloest: u.aufgeloest?.wert === true,
    belegt: { m: belegt.m, w: belegt.w, d: belegt.d, gesamt: belegt.gesamt },
    frei: kapazitaet - belegt.gesamt,
    ueberbelegt: belegt.gesamt > kapazitaet,
    einheiten,
  };
}

/** Die Unterkünfte mit Belegung, die Summen und wer noch ohne Bett ist. */
export function belegung(zustand: Zustand, einheiten: readonly Versorgungseinheit[]): Belegung {
  const jeUnterkunft = new Map<string, Belegungszeile[]>();
  let ohne = { koepfe: 0, einheiten: 0 };
  for (const eintrag of einheiten) {
    const { id, u } = zuweisung(zustand, eintrag);
    if (id !== undefined && gueltig(u)) {
      jeUnterkunft.set(id, [...(jeUnterkunft.get(id) ?? []), { einheitId: eintrag.einheit.id, einheit: bezeichnung(eintrag), bereich: eintrag.bereich, ...belegtVon(zustand, eintrag) }]);
      continue;
    }
    const bedarf = uebernachtung(zustand, eintrag.einheit);
    const koepfe = bedarf.m + bedarf.w + bedarf.d;
    if (eintrag.klasse === "BESTAND" && koepfe > 0) ohne = { koepfe: ohne.koepfe + koepfe, einheiten: ohne.einheiten + 1 };
  }
  const karten = Object.values(zustand.unterkuenfte ?? {})
    .map((u) => karte(u, jeUnterkunft.get(u.id) ?? []))
    .sort((a, b) => Number(a.aufgeloest) - Number(b.aufgeloest) || a.name.localeCompare(b.name, "de"));
  const geltend = karten.filter((k) => !k.aufgeloest);
  const kapazitaet = geltend.reduce((s, k) => s + k.kapazitaet, 0);
  const belegt = geltend.reduce((s, k) => s + k.belegt.gesamt, 0);
  // Frei ist, was in den einzelnen Hallen frei ist: Eine überbelegte Halle
  // macht in einer anderen kein Bett frei.
  const frei = geltend.reduce((s, k) => s + Math.max(0, k.frei), 0);
  return { unterkuenfte: karten, kapazitaet, belegt, frei, ohneZuweisung: ohne };
}
