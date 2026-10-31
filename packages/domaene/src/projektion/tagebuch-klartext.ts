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

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function nutzlastText(ereignis: EingehendesEreignis, schluessel: string): string | undefined {
  const nutzlast = ereignis.nutzlast;
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  return text((nutzlast as Record<string, unknown>)[schluessel]);
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
    case "AbschnittAufgeloest": {
      const ziel = zielDerAufloesung(zustand, ereignis);
      return ziel === undefined ? betreff : `${betreff} — Einheiten gehen nach ${ziel}`;
    }
    default:
      return undefined;
  }
}
