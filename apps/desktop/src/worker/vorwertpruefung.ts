/**
 * Die optimistische Vorwert-Prüfung: Ablehnen statt still überschreiben.
 *
 * Zwei Arbeitsplätze ändern dasselbe Feld. Der Fold entscheidet zwar immer
 * (Hybrid-Uhr, §3), aber er entscheidet **still**: Der Zweite überschreibt den
 * Ersten, und der Erste erfährt es höchstens als Konflikthinweis im Nachhinein.
 * Ein Bediener, der nach einer Unterbrechung zu seinem offenen Editor
 * zurückkehrt, überschreibt so unbemerkt den neueren Wert des Kollegen.
 *
 * Der Entwurf kann deshalb den Wert mitbringen, den der Editor **beim Öffnen**
 * sah (`vorher`) und `vorwertPruefen` setzen. Gilt im Zustand inzwischen ein
 * anderer Wert, den **ein anderer Arbeitsplatz** gesetzt hat, wird abgewiesen:
 * „Wurde inzwischen von … geändert (neu: …). Neu laden?" Der Bediener sieht den
 * neuen Wert und entscheidet; wer danach bewusst bestätigt, schreibt mit dem
 * dann aktuellen Vorwert.
 *
 * Bewusst nur auf Verlangen (`vorwertPruefen`): Ältere Aufrufer und Masken, die
 * ihren `vorher`-Wert nicht aus dem Editor-Beginn nehmen, bleiben unberührt. Und
 * bewusst nur gegen **fremde** Änderungen: Der eigene letzte Schritt ist kein
 * Konflikt, auch wenn die Anzeige ihm noch hinterherläuft.
 */

import { KATALOG, type Katalogeintrag, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

import { CODE_VORWERT, type Bedienergebnis } from "../kontrakt/index.js";

/** Der Entwurf mit dem optionalen Verlangen aus dem Kontrakt (`zEntwurf.vorwertPruefen`). */
export type PruefbarerEntwurf = Ereignisentwurf & { readonly vorwertPruefen?: boolean };


const SAMMLUNGEN: Readonly<Record<string, keyof Zustand>> = {
  abschnitt: "abschnitte",
  einheit: "einheiten",
  fahrzeug: "fahrzeuge",
  person: "personen",
  auftrag: "auftraege",
  anforderung: "anforderungen",
};

interface Beobachtet {
  readonly wert: unknown;
  readonly clientId: string;
}

function alsText(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.length > 0 ? wert : undefined;
}

/** Der Restpfad des gesetzten Feldes (Form a) – wie ihn der Fold aus dem Katalog liest. */
function feldpfad(eintrag: Katalogeintrag, nutzlast: Record<string, unknown>): string | undefined {
  const feld = eintrag.feld;
  if (feld === undefined) return undefined;
  if (feld.art === "fest") return feld.pfad;
  const name = alsText(nutzlast[feld.schluessel]);
  if (name === undefined) return undefined;
  return feld.praefix === undefined ? name : `${feld.praefix}/${name}`;
}

function gehe(start: unknown, pfad: string): unknown {
  let knoten = start;
  for (const teil of pfad.split("/")) {
    if (typeof knoten !== "object" || knoten === null) return undefined;
    knoten = (knoten as Record<string, unknown>)[teil];
  }
  return knoten;
}

/** Das Feld, das der Entwurf setzen würde: sein geltender Wert und wer ihn gesetzt hat. */
function geltendes(zustand: Zustand, entwurf: PruefbarerEntwurf): Beobachtet | undefined {
  const eintrag = KATALOG.get(entwurf.typ);
  if (eintrag?.form !== "a") return undefined;
  const sammlung = SAMMLUNGEN[eintrag.entitaet];
  const nutzlast = entwurf.nutzlast;
  if (sammlung === undefined || typeof nutzlast !== "object" || nutzlast === null) return undefined;
  const werte = nutzlast as Record<string, unknown>;
  const id = alsText(werte[eintrag.idFeld]);
  const pfad = feldpfad(eintrag, werte);
  if (id === undefined || pfad === undefined) return undefined;
  const feld = gehe((zustand[sammlung] as Record<string, unknown>)[id], pfad) as
    | { wert?: unknown; hlc?: { clientId?: unknown } }
    | undefined;
  const clientId = feld?.hlc?.clientId;
  if (feld === undefined || typeof clientId !== "string") return undefined;
  return { wert: feld.wert ?? null, clientId };
}

/** Stabile Zeichenfolge zum Vergleich: gleiche Werte, gleiche Folge, `undefined` wie `null`. */
function stabil(wert: unknown): string {
  if (wert === undefined || wert === null) return "null";
  if (Array.isArray(wert)) return `[${wert.map(stabil).join(",")}]`;
  if (typeof wert === "object") {
    const objekt = wert as Record<string, unknown>;
    const teile = Object.keys(objekt)
      .sort()
      .map((schluessel) => `${JSON.stringify(schluessel)}:${stabil(objekt[schluessel])}`);
    return `{${teile.join(",")}}`;
  }
  return JSON.stringify(wert);
}

/** Der Wert in Worten für die Meldung: „0/1/8", „leer", Text unverändert. */
export function werttext(wert: unknown): string {
  if (wert === null || wert === undefined || wert === "") return "leer";
  if (typeof wert === "object") {
    const w = wert as Record<string, unknown>;
    if (["fuehrer", "unterfuehrer", "mannschaft"].every((k) => typeof w[k] === "number")) {
      return `${String(w["fuehrer"])}/${String(w["unterfuehrer"])}/${String(w["mannschaft"])}`;
    }
    return JSON.stringify(wert);
  }
  return String(wert);
}

export interface Vorwertumfeld {
  readonly eigeneClientId: string;
  /** Anzeigename des Arbeitsplatzes zu einer Client-Kennung, falls bekannt. */
  readonly nameVon: (clientId: string) => string | undefined;
}

/** Liefert die Abweisung, wenn ein anderer Arbeitsplatz das Feld inzwischen anders gesetzt hat. */
export function pruefeVorwert(
  zustand: Zustand,
  entwurf: PruefbarerEntwurf,
  umfeld: Vorwertumfeld,
): Bedienergebnis | undefined {
  if (entwurf.vorwertPruefen !== true) return undefined;
  const jetzt = geltendes(zustand, entwurf);
  if (jetzt === undefined || jetzt.clientId === umfeld.eigeneClientId) return undefined;
  if (stabil(jetzt.wert) === stabil(entwurf.vorher)) return undefined;
  const wer = umfeld.nameVon(jetzt.clientId) ?? "einem anderen Arbeitsplatz";
  return {
    art: "abgewiesen",
    meldung: `Wurde inzwischen von ${wer} geändert (neu: ${werttext(jetzt.wert)}). Neu laden?`,
    code: CODE_VORWERT,
    dauerhafterHinweis: false,
  };
}
