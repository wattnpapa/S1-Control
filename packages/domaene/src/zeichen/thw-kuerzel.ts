/**
 * THW-Kuerzel und ihre Aufloesung (M1.4, uebernommen aus v1
 * `tactical-sign-aliases.ts` und `tactical-sign/thw-shortcodes.ts`).
 *
 * Die Listen selbst sind Fachwissen aus der StAN und werden unveraendert
 * uebernommen; geaendert ist nur die Ebene (Zieldatenmodell §2.8 statt der
 * englischen v1-Werte) und dass die Textnormalisierung aus `text.ts` kommt.
 *
 * Vier dieser Kuerzel sind ausdruecklich **nicht** aufgeloest: „MT" ist eine
 * Kopiervorlage der StAN (`Stärke!C26`), deren Bedeutung offen ist
 * (04-OFFENE-ENTSCHEIDUNGEN.md Nr. 20). Es steht deshalb hier nicht als Regel,
 * sondern faellt in den Katalogabgleich — ein erfundener Eintrag saehe wie eine
 * Festlegung aus.
 */

import type { TaktischeEbene } from "../ereignis.js";
import { normalisiereText, trifftMuster, wortmenge } from "./text.js";

/** Ein Kuerzel, das auf eine Einheit und eine Ebene fuehrt. */
export interface KuerzelRegel {
  /** Der Einheitenteil des taktischen Zeichens, etwa „BrB". */
  readonly einheit: string;
  /** Ausgeschrieben, fuer die Anzeige und den Treffernachweis. */
  readonly bezeichnung: string;
  readonly ebene: TaktischeEbene;
  readonly muster: readonly string[];
}

export interface KuerzelTreffer {
  readonly regel: KuerzelRegel;
  readonly sicherheit: number;
}

/** Zusaetzliche Schreibweisen je Katalogeintrag (v1 `TACTICAL_SIGN_ALIASES`). */
export const ZEICHEN_ALIASE: readonly { readonly schluessel: string; readonly aliase: readonly string[] }[] = [
  { schluessel: "thw-fk-fernmeldetrupp", aliase: ["fk", "fgr fk", "fernmeldetrupp", "fuekom", "fuekomkw"] },
  { schluessel: "thw-fk-zugtrupp", aliase: ["zugtrupp fk", "zt fk", "zugtrupp"] },
  { schluessel: "thw-bergungsgruppe-1", aliase: ["bergung 1", "ber 1", "b1"] },
  { schluessel: "thw-bergungsgruppe-2", aliase: ["bergung 2", "ber 2", "b2"] },
  { schluessel: "rettd", aliase: ["rettd", "rettungsdienst", "rd"] },
  { schluessel: "sanitaetsgruppe", aliase: ["san gruppe", "sangruppe", "sangr"] },
  { schluessel: "betreuung", aliase: ["betreuung", "btgr", "betreuungsgruppe"] },
  { schluessel: "verpflegung", aliase: ["verpflegung", "vpfl", "verpflegungsgruppe"] },
  { schluessel: "technischer-zug", aliase: ["tz", "technischer zug"] },
  { schluessel: "fuehrungsgruppe", aliase: ["fuehrungsgruppe", "fue grp", "fuegr"] },
  { schluessel: "elw", aliase: ["elw", "einsatzleitwagen"] },
];

/** Die Fachgruppen- und Truppkuerzel des THW (v1 `THW_SHORTCODE_RULES`). */
export const THW_KUERZEL: readonly KuerzelRegel[] = [
  { einheit: "Ztr", bezeichnung: "Zugtrupp", ebene: "ZUGTRUPP", muster: ["ztr", "zugtrupp", "zug trupp"] },
  { einheit: "BrB", bezeichnung: "Brückenbau", ebene: "GRUPPE", muster: ["brb", "bruckenbau", "brueckenbau", "brucken bau"] },
  { einheit: "BT", bezeichnung: "Bergungstauchen", ebene: "GRUPPE", muster: ["bt", "bergungstauchen", "bergung tauchen"] },
  { einheit: "E", bezeichnung: "Elektroversorgung", ebene: "GRUPPE", muster: ["fg e", "fgr e", "elektroversorgung", "elektro versorgung"] },
  { einheit: "I", bezeichnung: "Infrastruktur", ebene: "GRUPPE", muster: ["fg i", "fgr i", "infrastruktur"] },
  { einheit: "N", bezeichnung: "Notversorgung und Notinstandsetzung", ebene: "GRUPPE", muster: ["fg n", "fgr n", "notversorgung", "notinstandsetzung", "not versorgung"] },
  { einheit: "Öl", bezeichnung: "Ölschaden", ebene: "GRUPPE", muster: ["ol", "oel", "olschaden", "oelschaden"] },
  { einheit: "O", bezeichnung: "Ortung", ebene: "GRUPPE", muster: ["fg o", "fgr o", "ortung"] },
  { einheit: "R", bezeichnung: "Räumen", ebene: "GRUPPE", muster: ["fg r", "fgr r", "raumen", "raeumen"] },
  { einheit: "SB", bezeichnung: "Schwere Bergung", ebene: "GRUPPE", muster: ["sb", "schwere bergung"] },
  { einheit: "SP", bezeichnung: "Sprengen", ebene: "GRUPPE", muster: ["sp", "sprengen"] },
  { einheit: "TW", bezeichnung: "Trinkwasserversorgung", ebene: "GRUPPE", muster: ["tw", "trinkwasser", "trinkwasserversorgung"] },
  { einheit: "W", bezeichnung: "Wassergefahren", ebene: "GRUPPE", muster: ["fg w", "fgr w", "w", "wassergefahren"] },
  { einheit: "WP", bezeichnung: "Wasserschaden/Pumpen", ebene: "GRUPPE", muster: ["wp", "wasserschaden", "pumpen"] },
  { einheit: "F", bezeichnung: "Führungsunterstützung", ebene: "GRUPPE", muster: ["fg f", "fgr f", "fuhrungsunterstutzung", "fuehrungsunterstuetzung"] },
  { einheit: "K", bezeichnung: "Kommunikation", ebene: "GRUPPE", muster: ["fg k", "fgr k", "kommunikation"] },
  { einheit: "Log-MW", bezeichnung: "Logistik-Materialwirtschaft", ebene: "GRUPPE", muster: ["log mw", "log-mw", "logmw", "materialwirtschaft"] },
  { einheit: "Log-V", bezeichnung: "Logistik-Verpflegung", ebene: "GRUPPE", muster: ["log v", "log-v", "logv", "verpflegung"] },
  { einheit: "Log-M", bezeichnung: "Logistik-Materialerhaltung", ebene: "GRUPPE", muster: ["log m", "log-m", "logm", "materialerhaltung"] },
  { einheit: "Log-VG", bezeichnung: "Logistik-Verbrauchsgüter", ebene: "GRUPPE", muster: ["log vg", "log-vg", "logvg", "verbrauchsguter", "verbrauchsgueter"] },
  { einheit: "ESS", bezeichnung: "Trupp Einsatzstellensicherung", ebene: "TRUPP", muster: ["ess", "einsatzstellensicherung", "einsatzstellen sicherung"] },
  { einheit: "UL", bezeichnung: "Trupp Unbemannte Luftfahrtsysteme", ebene: "TRUPP", muster: ["ul", "unbemannte luftfahrtsysteme", "uas"] },
  { einheit: "TS", bezeichnung: "Trupp Transport Schwer", ebene: "TRUPP", muster: ["ts", "transport schwer"] },
];

interface Namenslage {
  readonly normalisiert: string;
  readonly worte: ReadonlySet<string>;
}

function baueNamenslage(name: string): Namenslage | null {
  const normalisiert = normalisiereText(name);
  const worte = wortmenge(name);
  if (normalisiert.length === 0 || worte.size === 0) return null;
  return { normalisiert, worte };
}

function trifftEines(lage: Namenslage, muster: readonly string[]): boolean {
  return muster.some((eines) => trifftMuster(lage.normalisiert, lage.worte, eines));
}

/**
 * Findet das am besten passende Fachgruppen- oder Truppkuerzel.
 *
 * Die Sicherheit waechst mit der Zahl der getroffenen Muster: ein Treffer
 * ergibt 0,80, jeder weitere 0,08 mehr, gedeckelt bei 1. Der Startwert 0,72
 * aus v1 lag unter der Uebernahmeschwelle von 0,6 nicht — er lag darueber,
 * aber so knapp, dass ein einzelnes zusaetzliches Wort im Namen den Ausschlag
 * gab. Die Zahlen sind aus v1 uebernommen und in `inferenz.ts` als Startwerte
 * gefuehrt.
 */
export function findeThwKuerzel(name: string): KuerzelTreffer | null {
  const lage = baueNamenslage(name);
  if (lage === null) return null;

  let bestes: KuerzelTreffer | null = null;
  for (const regel of THW_KUERZEL) {
    const treffer = regel.muster.filter((eines) =>
      trifftMuster(lage.normalisiert, lage.worte, eines),
    ).length;
    if (treffer === 0) continue;
    const sicherheit = Math.min(1, 0.72 + treffer * 0.08);
    if (bestes === null || sicherheit > bestes.sicherheit) {
      bestes = { regel, sicherheit };
    }
  }
  return bestes;
}

/**
 * Erkennt die zusammengesetzten Zuege: Technischer Zug mit Fachgruppe,
 * Fachzug Fuehrung/Kommunikation, Fachzug Logistik.
 *
 * Sie muessen **vor** dem einfachen Kuerzel geprueft werden: „TZ-R Oldenburg"
 * traegt sowohl „tz" als auch „r", und das Ergebnis soll der Zug sein, nicht
 * die Fachgruppe.
 */
export function findeThwZug(name: string): KuerzelTreffer | null {
  const lage = baueNamenslage(name);
  if (lage === null) return null;

  const istTechnischerZug = trifftEines(lage, ["tz", "technischer zug"]);
  const istFachzug = trifftEines(lage, ["fz", "fachzug"]);
  if (!istTechnischerZug && !istFachzug) return null;

  if (istFachzug) {
    if (trifftEines(lage, ["fz fk", "fachzug fuhrung kommunikation", "fachzug fuehrung kommunikation", "fuhrung kommunikation"])) {
      return {
        regel: { einheit: "FZ-FK", bezeichnung: "Fachzug Führung und Kommunikation", ebene: "ZUG", muster: [] },
        sicherheit: 0.9,
      };
    }
    if (trifftEines(lage, ["fz log", "fachzug log", "fachzug logistik", "logistikzug"])) {
      return {
        regel: { einheit: "FZ-Log", bezeichnung: "Fachzug Logistik", ebene: "ZUG", muster: [] },
        sicherheit: 0.9,
      };
    }
  }

  if (istTechnischerZug) {
    for (const regel of THW_KUERZEL) {
      if (regel.ebene !== "GRUPPE") continue;
      if (!trifftEines(lage, [regel.einheit, regel.bezeichnung, ...regel.muster])) continue;
      return {
        regel: {
          einheit: `TZ-${regel.einheit}`,
          bezeichnung: `Technischer Zug mit Fachgruppe ${regel.bezeichnung}`,
          ebene: "ZUG",
          muster: [],
        },
        sicherheit: 0.88,
      };
    }
  }

  return null;
}
