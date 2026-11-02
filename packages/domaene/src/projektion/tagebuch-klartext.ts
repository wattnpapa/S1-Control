/**
 * Tagebuchsätze in Klartext für Vorgänge, deren Rohwerte Kennungen wären.
 *
 * Der allgemeine Zusammenbau in `tagebuch.ts` schriebe bei „Einheit verschoben“
 * `EINGANG → A-3e717cb960bc`, bei „Einheit entfernt“ `(leer) → ja` und bei den
 * Einheiten einer Zusammenführung nur eine Kennung. Ein Tagebuch ist das
 * Beweisstück nach dem Einsatz; dort stehen Namen, die jemand versteht.
 * Gesucht wird der Name **heute** (dieselbe Regel wie im übrigen Tagebuch);
 * fehlt er, steht ein Wort statt der Kennung.
 */

import { zeitpunktText } from "../beschriftungen.js";
import type { EingehendesEreignis } from "../fold.js";
import type { Zustand } from "../zustand.js";

import { funksatz } from "./tagebuch-funk.js";
import { verpflegungssatz } from "./tagebuch-versorgung.js";

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

/** Der Anzeigename eines Abschnitts; der Eingang heißt „Eingang“, nie `EINGANG`. */
export function abschnittsname(zustand: Zustand, id: unknown): string {
  const kennung = text(id);
  if (kennung === undefined) return "kein Bereich";
  const name = text(zustand.abschnitte[kennung]?.name?.wert);
  if (name !== undefined) return name;
  return kennung === "EINGANG" ? "Eingang" : "ein Abschnitt, der nicht mehr geführt wird";
}

/** Der Anzeigename einer Einheit. */
export function einheitenname(zustand: Zustand, id: unknown): string {
  const kennung = text(id);
  if (kennung === undefined) return "unbekannte Einheit";
  return text(zustand.einheiten[kennung]?.bezeichnung?.wert) ?? "eine Einheit, die nicht mehr geführt wird";
}

function zielDerAufloesung(zustand: Zustand, ereignis: EingehendesEreignis): string | undefined {
  const neu = ereignis.neu;
  const roh = typeof neu === "object" && neu !== null ? (neu as Record<string, unknown>)["zielAbschnittId"] : neu;
  return text(roh) === undefined ? undefined : abschnittsname(zustand, roh);
}

/**
 * Der Satz für die Arten, die als Klartext besser lesbar sind als als
 * „vorher → nachher“; `undefined`, wenn der allgemeine Zusammenbau gilt.
 *
 * @param betreff „Name: Vorgang“, wie `tagebuchsatz` ihn bildet.
 */
const SOFORT_WORT: Readonly<Record<string, string>> = {
  VERPFLEGUNG: "Verpflegung",
  DIESEL: "Diesel",
  BENZIN: "Benzin",
  GEMISCH: "Gemisch",
  UNTERBRINGUNG: "Unterbringung",
  RUHEZEIT: "Ruhezeit",
};

/** Der Name einer Unterkunft statt ihrer Kennung (S4.2). */
export function unterkunftsname(zustand: Zustand, id: unknown): string {
  if (typeof id !== "string") return "—";
  const name = zustand.unterkuenfte?.[id]?.name.wert;
  return typeof name === "string" ? name : id;
}

function unterbringungssatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string {
  const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
  if (ereignis.typ === "UnterkunftAngelegt") {
    const n = ereignis.nutzlast as { kapazitaet?: unknown; ort?: unknown } | null;
    const ort = text(n?.ort);
    return `${betreff} (${String(n?.kapazitaet ?? "?")} Plätze${ort === undefined ? "" : `, ${ort}`})`;
  }
  if (ereignis.typ === "UnterbringungAufgehoben") {
    return typeof vorher === "string" ? `${betreff} (war ${unterkunftsname(zustand, vorher)})` : betreff;
  }
  if (typeof ereignis.neu !== "string") return `${betreff}: Zuweisung aufgehoben`;
  const von = typeof vorher === "string" ? `${unterkunftsname(zustand, vorher)} → ` : "";
  return `${betreff}: ${von}${unterkunftsname(zustand, ereignis.neu)}`;
}

export function klartextsatz(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  betreff: string,
): string | undefined {
  switch (ereignis.typ) {
    case "EinheitEntfernt":
    case "EinheitWiederhergestellt":
    case "AbschnittWiederhergestellt":
      return betreff;
    case "EinsatzWiedereroeffnet": {
      const ende = "vorher" in ereignis ? text(ereignis.vorher) : undefined;
      return ende === undefined ? betreff : `${betreff} (Ende ${zeitpunktText(ende)} aufgehoben)`;
    }
    case "EinsatzBeendet": {
      const zeit = text(ereignis.neu);
      return zeit === undefined ? betreff : `${betreff}: ${zeitpunktText(zeit)}`;
    }
    case "EinheitVerschoben":
    case "AbschnittUmgehaengt": {
      const von = "vorher" in ereignis ? ereignis.vorher : undefined;
      return `${betreff}: ${abschnittsname(zustand, von)} → ${abschnittsname(zustand, ereignis.neu)}`;
    }
    case "UnterkunftAngelegt":
    case "EinheitUntergebracht":
    case "UnterbringungAufgehoben":
      return unterbringungssatz(zustand, ereignis, betreff);
    case "SofortbedarfErledigt":
    case "SofortbedarfWiederOffen": {
      const feld = (ereignis.nutzlast as { feld?: unknown } | null)?.feld;
      return `${betreff}: ${SOFORT_WORT[String(feld)] ?? String(feld)}`;
    }
    case "MahlzeitenregelGesetzt":
    case "AusgabestelleAngelegt":
    case "AbschnittAusgabestelleGesetzt":
    case "MahlzeitBestellt":
    case "MahlzeitGeliefert":
      return verpflegungssatz(zustand, ereignis, betreff);
    case "RufgruppeAngelegt":
    case "RufgruppeGeaendert":
    case "RufgruppeAufgeloest":
    case "RufgruppeWiederhergestellt":
    case "EinheitRufgruppeGesetzt":
    case "EinheitStammdatenGeaendert":
      return funksatz(zustand, ereignis, betreff);
    case "AbschnittAufgeloest": {
      const ziel = zielDerAufloesung(zustand, ereignis);
      return ziel === undefined ? betreff : `${betreff} — Einheiten gehen nach ${ziel}`;
    }
    default:
      return undefined;
  }
}
