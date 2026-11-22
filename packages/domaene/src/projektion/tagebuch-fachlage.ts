/**
 * Die Tagebuchsätze der Fachlage (Stab-Review 2026-11-22): Eine Zeile nennt,
 * worum es geht (Abschnitt, Pegel, Deich-km, Kennung, Bezeichnung), und bei
 * einer Änderung Feld und neuen Wert als Wort. Ohne Bezug auf den Zustand
 * nur die Nutzlast — der Satz steht, auch wenn die Entität fehlt.
 */

import { fachlagewort } from "../fachlage-werte.js";
import type { EingehendesEreignis } from "../fold.js";
import type { Zustand } from "../zustand.js";
import { abschnittsname } from "./tagebuch-klartext.js";

type Nutzlast = Readonly<Record<string, unknown>>;

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

const FELD: Readonly<Record<string, string>> = {
  lage: "Lage", ort: "Ort", bedarf: "Bedarf", zurueckgezogen: "zurückgezogen", wertCm: "Wert", prognoseCm: "Prognose",
  prognoseFuer: "Prognose für", quelle: "Quelle", stand: "Stand", massnahme: "Maßnahme", beschreibung: "Beschreibung", art: "Art",
  sichtung: "Sichtung", verbleib: "Verbleib", transportziel: "Transportziel", verletzung: "Verletzung", bemerkung: "Bemerkung",
  umfang: "Umfang", benoetigtAb: "benötigt ab", lieferant: "Lieferant", menge: "Menge", titel: "Titel", text: "Text",
  freigabe: "Freigabe", ersatzweg: "Ersatzweg",
};

function wertText(wert: unknown): string {
  if (wert === null || wert === undefined) return "(leer)";
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  return typeof wert === "string" ? fachlagewort(wert) : String(wert);
}

/** Wovon die Zeile handelt — aus der Anlage im Zustand, sonst aus der Nutzlast. */
function bezug(zustand: Zustand, typ: string, n: Nutzlast): string {
  if (typ.startsWith("Abschnittslage")) {
    const lage = zustand.abschnittslagen?.[String(n["lageId"])];
    return abschnittsname(zustand, n["abschnittId"] ?? lage?.abschnittId.wert);
  }
  if (typ.startsWith("Pegelstand")) return `Pegel ${text(n["pegel"]) ?? text(zustand.pegelmessungen?.[String(n["messungId"])]?.pegel.wert) ?? "?"}`;
  if (typ.startsWith("Deichschaden")) return `Deich-km ${text(n["deichKm"]) ?? text(zustand.deichschaeden?.[String(n["schadenId"])]?.deichKm.wert) ?? "?"}`;
  if (typ.startsWith("Patient")) return `Patient ${text(n["kennung"]) ?? text(zustand.patienten?.[String(n["patientId"])]?.kennung.wert) ?? "?"}`;
  if (typ.startsWith("Amtshilfe")) return `Antrag ${text(n["kennung"]) ?? text(zustand.amtshilfen?.[String(n["antragId"])]?.kennung.wert) ?? "?"}`;
  if (typ.startsWith("Material")) return text(n["bezeichnung"]) ?? text(zustand.materialien?.[String(n["materialId"])]?.bezeichnung.wert) ?? "Material";
  if (typ.startsWith("Pressemitteilung")) return `„${text(n["titel"]) ?? text(zustand.pressemitteilungen?.[String(n["mitteilungId"])]?.titel.wert) ?? "?"}“`;
  return `Störung ${fachlagewort(text(n["bereich"]) ?? text(zustand.stoerungen?.[String(n["stoerungId"])]?.bereich.wert) ?? "?")}`;
}

/** Was die Anlage sagt, knapp. */
function anlagetext(typ: string, n: Nutzlast): string {
  switch (typ) {
    case "AbschnittslageGemeldet":
      return String(n["lage"]);
    case "PegelstandGemessen":
      return `${String(n["wertCm"])} cm${n["prognoseCm"] === undefined ? "" : `, Prognose ${String(n["prognoseCm"])} cm`}`;
    case "DeichschadenGemeldet":
      return `${fachlagewort(String(n["art"]))}${text(n["beschreibung"]) === undefined ? "" : `: ${String(n["beschreibung"])}`}`;
    case "PatientErfasst":
      return `${fachlagewort(String(n["sichtung"]))}${n["einsatzkraft"] === true ? ", Einsatzkraft" : ""}${text(n["verletzung"]) === undefined ? "" : `, ${String(n["verletzung"])}`}`;
    case "AmtshilfeBeantragt":
      return `an ${String(n["an"])}: ${String(n["leistung"])}`;
    case "MaterialAngefordert":
      return `${String(n["menge"])} ${String(n["mengeneinheit"])}`;
    case "PressemitteilungVerfasst":
      return "Entwurf";
    default:
      return String(n["beschreibung"] ?? "");
  }
}

const FACHLAGEARTEN = ["Abschnittslage", "Pegelstand", "Deichschaden", "Patient", "Amtshilfe", "Material", "Pressemitteilung", "Stoerung"];

export function istFachlageart(typ: string): boolean {
  return FACHLAGEARTEN.some((art) => typ.startsWith(art) && /(Gemeldet|Gemessen|Erfasst|Beantragt|Angefordert|Verfasst|Geaendert)$/u.test(typ));
}

export function fachlagesatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string {
  const n = (ereignis.nutzlast ?? {}) as Nutzlast;
  const wer = bezug(zustand, ereignis.typ, n);
  if (!ereignis.typ.endsWith("Geaendert")) return `${betreff} — ${wer}: ${anlagetext(ereignis.typ, n)}`;
  const feld = String(n["feld"]);
  return `${wer}: ${betreff} — ${FELD[feld] ?? feld}: ${wertText(ereignis.neu)}`;
}
