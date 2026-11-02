/**
 * Die Sätze der Verpflegung im Einsatztagebuch (S4.3).
 *
 * Eine Bestellung steht als „Abend 10.09.: 280 Portionen (31 veg., 6 vegan)"
 * im Tagebuch, nicht als Kennung — das Tagebuch ist die Urkunde, und wer
 * nachliest, sucht die Mahlzeit, nicht die Id.
 */

import type { EingehendesEreignis } from "../fold.js";
import { MAHLZEITEN, type Mahlzeit, type Mahlzeitenregel } from "../werte.js";
import type { Zustand } from "../zustand.js";

const MAHLZEIT_WORT: Readonly<Record<Mahlzeit, string>> = {
  FRUEHSTUECK: "Frühstück",
  MITTAG: "Mittag",
  ABEND: "Abend",
  NACHT: "Nacht",
};

function mahlzeitWort(wert: unknown): string {
  return typeof wert === "string" && (MAHLZEITEN as readonly string[]).includes(wert) ? MAHLZEIT_WORT[wert as Mahlzeit] : String(wert);
}

function tagWort(datum: unknown): string {
  if (typeof datum !== "string") return "";
  const [, monat, tag] = datum.split("-");
  return `${tag ?? ""}.${monat ?? ""}.`;
}

/** „Abend 10.09." — die Bestellung beim Namen ihrer Mahlzeit. */
export function bestellungsname(zustand: Zustand, id: string): string {
  const b = zustand.bestellungen?.[id];
  if (b === undefined) return id;
  return `${mahlzeitWort(b.mahlzeit.wert)} ${tagWort(b.datum.wert)}`;
}

function ausgabestellenname(zustand: Zustand, id: unknown): string {
  if (typeof id !== "string") return "—";
  const name = zustand.ausgabestellen?.[id]?.name.wert;
  return typeof name === "string" ? name : id;
}

/** „Frühstück 0600, Mittag 1200 …" — die gesetzte Regel als Satz. */
function regelkurz(wert: unknown): string {
  if (!Array.isArray(wert)) return "—";
  return (wert as Mahlzeitenregel)
    .map((z) => `${mahlzeitWort(z.mahlzeit)} ${z.uhrzeit} (${z.schichten.join("/")})`)
    .join(", ");
}

export function verpflegungssatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string | undefined {
  const n = (ereignis.nutzlast ?? {}) as Record<string, unknown>;
  switch (ereignis.typ) {
    case "MahlzeitenregelGesetzt":
      return `${betreff}: ${regelkurz(ereignis.neu)}`;
    case "AusgabestelleAngelegt":
      return typeof n["traeger"] === "string" ? `${betreff} (${n["traeger"]})` : betreff;
    case "AbschnittAusgabestelleGesetzt":
      return `${betreff}: ${ausgabestellenname(zustand, ereignis.neu)}`;
    case "MahlzeitBestellt": {
      const bei = typeof n["bestelltBei"] === "string" ? ` bei ${n["bestelltBei"]}` : "";
      return `${mahlzeitWort(n["mahlzeit"])} ${tagWort(n["datum"])} bestellt: ${String(n["portionen"])} Portionen (${String(n["vegetarisch"])} veg., ${String(n["vegan"])} vegan)${bei}`;
    }
    case "MahlzeitGeliefert": {
      const bestellt = typeof n["bestellungId"] === "string" ? zustand.bestellungen?.[n["bestellungId"]]?.portionen.wert : undefined;
      return `${betreff}: ${String(ereignis.neu)}${typeof bestellt === "number" ? ` von ${String(bestellt)}` : ""} Portionen`;
    }
    default:
      return undefined;
  }
}
