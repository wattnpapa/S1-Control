/**
 * Die Tagebuchsätze zur Anforderung (§5.6, M5.3).
 *
 * Der allgemeine Zusammenbau in `tagebuch.ts` schriebe bei einer Zusage
 * „anf-lq3…: Ablösung zugesagt: — → zugesagtFuer: 2026-10-30T15:00:00.000Z,
 * zugesagtVon: THW RB“ — Kennung, Schlüssel und ISO-Zeit, also drei Dinge,
 * die ein Tagebuch nicht enthalten soll. Diese Datei formuliert die drei
 * Handlungen aus, an denen die Ablösung hängt: anfordern, zusagen,
 * eintreffen. Genannt werden die Kennung der Anforderung, die Einheiten mit
 * ihrem **heutigen** Namen (dieselbe Regel wie §5.9.1) und die Zeiten als
 * „TT.MM.JJJJ HH:MM“.
 */

import { zeitpunktText } from "../beschriftungen.js";
import type { EingehendesEreignis } from "../fold.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";

function eintrag(quelle: unknown, schluessel: string): string | undefined {
  if (typeof quelle !== "object" || quelle === null) return undefined;
  const wert = (quelle as Record<string, unknown>)[schluessel];
  return typeof wert === "string" && wert.trim() !== "" ? wert.trim() : undefined;
}

function einheitsname(zustand: Zustand, id: Id | null | undefined): string | undefined {
  if (id === undefined || id === null) return undefined;
  const wert = zustand.einheiten[id]?.bezeichnung.wert;
  return typeof wert === "string" && wert !== "" ? wert : id;
}

/**
 * „Anforderung ANF-001“ — mit der Kennung; ohne Kennung mit dem, woran man sie
 * erkennt (Ablösung für …, vorgesehene Einheit), nie mit der inneren Id.
 */
export function anforderungsname(zustand: Zustand, id: Id): string {
  const anforderung = zustand.anforderungen[id];
  const kennung = anforderung?.kennung?.wert;
  if (typeof kennung === "string" && kennung.trim() !== "") return `Anforderung ${kennung.trim()}`;
  const abzuloesende = einheitsname(zustand, anforderung?.abzuloesendeEinheitId?.wert);
  if (abzuloesende !== undefined) return `Anforderung (Ablösung für ${abzuloesende})`;
  const vorgesehen = anforderung?.vorgeseheneEinheitText?.wert;
  if (typeof vorgesehen === "string" && vorgesehen.trim() !== "") return `Anforderung (${vorgesehen.trim()})`;
  return "Anforderung ohne Kennung";
}

function teile(...stuecke: readonly (string | undefined)[]): string {
  return stuecke.filter((stueck): stueck is string => stueck !== undefined).join("; ");
}

function anlage(zustand: Zustand, ereignis: EingehendesEreignis): string {
  const n = ereignis.nutzlast;
  const abzuloesende = einheitsname(zustand, eintrag(n, "abzuloesendeEinheitId"));
  const vorgesehen = eintrag(n, "vorgeseheneEinheitText");
  const auftrag = eintrag(n, "vorgesehenerAuftrag");
  const rest = teile(
    abzuloesende === undefined ? undefined : `Ablösung für ${abzuloesende}`,
    vorgesehen === undefined ? undefined : `vorgesehen: ${vorgesehen}`,
    auftrag === undefined ? undefined : `Auftrag: ${auftrag}`,
  );
  return rest === "" ? "angelegt" : `angelegt — ${rest}`;
}

function zusage(ereignis: EingehendesEreignis): string {
  const fuer = eintrag(ereignis.neu, "zugesagtFuer");
  const von = eintrag(ereignis.neu, "zugesagtVon");
  return [
    "Zusage erfasst",
    fuer === undefined ? undefined : `für ${zeitpunktText(fuer)}`,
    von === undefined ? undefined : `von ${von}`,
  ]
    .filter((stueck): stueck is string => stueck !== undefined)
    .join(" ");
}

function eintreffen(zustand: Zustand, ereignis: EingehendesEreignis, anforderungId: Id): string {
  const am = eintrag(ereignis.neu, "erledigtAm");
  const durch = einheitsname(zustand, eintrag(ereignis.neu, "abloesendeEinheitId"));
  const kopf = am === undefined ? "eingetroffen" : `eingetroffen ${zeitpunktText(am)}`;
  if (durch === undefined) return kopf;
  // „Ablösung“ nur, wo die Anforderung auch eine Einheit ablöst.
  const loestAb = zustand.anforderungen[anforderungId]?.abzuloesendeEinheitId?.wert !== undefined;
  return `${kopf} — ${loestAb ? "Ablösung durch" : "als Einheit"} ${durch}`;
}

/**
 * Der Satz einer Anlage, Zusage oder Erledigung — oder `undefined` für jede
 * andere Art, die dann der allgemeine Zusammenbau übernimmt.
 */
export function anforderungssatz(zustand: Zustand, ereignis: EingehendesEreignis): string | undefined {
  const id = eintrag(ereignis.nutzlast, "anforderungId");
  if (id === undefined) return undefined;
  const name = anforderungsname(zustand, id);
  switch (ereignis.typ) {
    case "AnforderungAngelegt":
      return `${name}: ${anlage(zustand, ereignis)}`;
    case "AbloesungZugesagt":
      return `${name}: ${zusage(ereignis)}`;
    case "AnforderungErledigt":
      return `${name}: ${eintreffen(zustand, ereignis, id)}`;
    default:
      return undefined;
  }
}

/**
 * Die Einheit, zu der eine Zeile über eine Anforderung gehört: die
 * abzulösende. So steht die Ablösung im Tagebuch der Einheit, die sie
 * betrifft, und der Filter „nur diese Einheit“ findet sie.
 */
export function anforderungsbezug(zustand: Zustand, ereignis: EingehendesEreignis): Id | undefined {
  const ausNutzlast = eintrag(ereignis.nutzlast, "abzuloesendeEinheitId");
  if (ausNutzlast !== undefined) return ausNutzlast;
  const id = eintrag(ereignis.nutzlast, "anforderungId");
  const wert = id === undefined ? undefined : zustand.anforderungen[id]?.abzuloesendeEinheitId?.wert;
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}
