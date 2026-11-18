/**
 * Das Handzeichenverzeichnis (Audits Nachrichten Runde 2, R2-ETB P2-7).
 *
 * Handzeichen sind zwei bis vier freie Zeichen. Nach dem Einsatz ist die
 * Präsenz leer, und nichts führte „Fm“, „Si“, „Ru“ auf eine Person oder Stelle
 * zurück — ein Handzeichen ohne Verzeichnis ist als Beleg dünn, zumal zwei
 * Bediener an zwei Schichten dasselbe führen können. Im Papierbetrieb gibt es
 * dafür das Handzeichenverzeichnis.
 *
 * Gebaut wird es aus den Ereignissen, nicht aus der Präsenz: Jedes Ereignis
 * mit Handzeichen (Vermerke der FmZ, Sichtung, Kenntnis, Erledigung,
 * Zurückziehen, Einsatzende) nennt in der Nutzlast die Stelle der Sitzung und
 * im Rahmen den Anzeigenamen des Arbeitsplatzes. Je Handzeichen stehen alle
 * Namen und Stellen, unter denen es vorkam, und der erste und letzte Eintrag
 * — so fällt auch auf, wenn zwei Personen dasselbe Zeichen führten.
 */

import type { EingehendesEreignis } from "../fold.js";
import { vergleicheHlc } from "../hlc.js";
import { handzeichenDer, stelleDer } from "./tagebuch-nachrichtenbezug.js";

export interface Handzeicheneintrag {
  readonly handzeichen: string;
  /** Anzeigenamen der Arbeitsplätze, in der Reihenfolge des ersten Auftretens. */
  readonly namen: readonly string[];
  /** Stellen (Kennung, „FMZ“, „S4“), in der Reihenfolge des ersten Auftretens. */
  readonly stellen: readonly string[];
  /** Wanduhr des ersten und letzten Ereignisses mit diesem Handzeichen (ISO). */
  readonly erster: string;
  readonly letzter: string;
  readonly anzahl: number;
}

interface Sammler {
  handzeichen: string;
  namen: string[];
  stellen: string[];
  erster: string;
  letzter: string;
  anzahl: number;
}

function fuegeHinzu(liste: string[], wert: string | undefined): void {
  const sauber = wert?.trim() ?? "";
  if (sauber !== "" && !liste.includes(sauber)) liste.push(sauber);
}

/**
 * Je Handzeichen ein Eintrag, nach Handzeichen geordnet (ohne Rücksicht auf
 * Groß- und Kleinschreibung; die erste Schreibweise gilt). Rücknahmen zählen
 * mit — auch sie tragen ein Handzeichen.
 */
export function handzeichenverzeichnis(ereignisse: readonly EingehendesEreignis[]): readonly Handzeicheneintrag[] {
  const geordnet = [...ereignisse].sort((a, b) => vergleicheHlc(a.hlc, b.hlc) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const nachZeichen = new Map<string, Sammler>();
  for (const e of geordnet) {
    const hz = handzeichenDer(e)?.trim() ?? "";
    if (hz === "") continue;
    const schluessel = hz.toLocaleLowerCase("de-DE");
    const eintrag = nachZeichen.get(schluessel) ?? { handzeichen: hz, namen: [], stellen: [], erster: e.wanduhr, letzter: e.wanduhr, anzahl: 0 };
    fuegeHinzu(eintrag.namen, e.akteur.benutzer);
    fuegeHinzu(eintrag.stellen, stelleDer(e));
    eintrag.letzter = e.wanduhr;
    eintrag.anzahl += 1;
    nachZeichen.set(schluessel, eintrag);
  }
  return [...nachZeichen.entries()].sort(([a], [b]) => a.localeCompare(b, "de")).map(([, e]) => ({ ...e }));
}
