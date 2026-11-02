/**
 * Die Funkproben als Zeitfolge (KONZEPT-FUNKPLAN.md §5, Sicht „Funkproben").
 *
 * Eine Projektion des Ereignisstroms wie das Tagebuch und nicht Teil des
 * Zustands: Das Feld `letzteFunkprobe` hält nur die letzte Probe je Ergebnis,
 * die Folge aller Proben steht nur im Protokoll. Dadurch bleibt der Zustand
 * klein, und die Sicht braucht keine Liste in der Akte (§8).
 *
 * Eine Rücknahme ist keine Probe: Sie erscheint nicht als eigene Zeile, die
 * zurückgenommene Probe bleibt stehen und ist gekennzeichnet — wie im
 * Tagebuch geht nichts verloren. Geordnet wird nach Funkzeit, die jüngste
 * zuerst; bei gleicher Funkzeit nach der Ordnung des Protokolls (§3.5).
 * Namen von Einheit und Rufgruppe werden **heute** gesucht, wie im Tagebuch.
 */

import type { EingehendesEreignis } from "../fold.js";
import { vergleicheHlc } from "../hlc.js";
import { vergleicheNachCodepunkt } from "../kanonisch.js";
import { anzeigename } from "../kennzahlen.js";
import type { Id, Zeitpunkt } from "../werte.js";
import type { Zustand } from "../zustand.js";
import { rufgruppenname } from "./tagebuch-funk.js";

/** Wie viele Proben die Sicht höchstens zeigt — die jüngsten. */
export const FUNKPROBEN_GRENZE = 200;

export interface Funkprobenzeile {
  readonly ereignisId: string;
  readonly einheitId: Id;
  readonly einheit: string;
  readonly rufgruppeId?: Id;
  readonly rufgruppe?: string;
  readonly ergebnis: "KONTAKT" | "KEIN_KONTAKT";
  /** Die Funkzeit der Probe. */
  readonly zeitpunkt: Zeitpunkt;
  /** Wer die Probe eingetragen hat. */
  readonly akteur: string;
  readonly grund?: string;
  /** Später zurückgenommen (§6). */
  readonly zurueckgenommen: boolean;
}

interface Probe {
  readonly ereignis: EingehendesEreignis;
  readonly einheitId: Id;
  readonly ergebnis: "KONTAKT" | "KEIN_KONTAKT";
  readonly zeitpunkt: Zeitpunkt;
  readonly rufgruppeId?: Id;
}

function alsProbe(ereignis: EingehendesEreignis): Probe | undefined {
  if (ereignis.typ !== "FunkprobeDurchgefuehrt" || ereignis.undoOf !== undefined) return undefined;
  const nutzlast = (ereignis.nutzlast ?? {}) as { einheitId?: unknown; ergebnis?: unknown };
  const neu = (ereignis.neu ?? {}) as { zeitpunkt?: unknown; rufgruppeId?: unknown };
  if (typeof nutzlast.einheitId !== "string" || typeof neu.zeitpunkt !== "string") return undefined;
  if (nutzlast.ergebnis !== "KONTAKT" && nutzlast.ergebnis !== "KEIN_KONTAKT") return undefined;
  return {
    ereignis,
    einheitId: nutzlast.einheitId,
    ergebnis: nutzlast.ergebnis,
    zeitpunkt: neu.zeitpunkt,
    ...(typeof neu.rufgruppeId === "string" && neu.rufgruppeId !== "" ? { rufgruppeId: neu.rufgruppeId } : {}),
  };
}

/** Jüngste Funkzeit zuerst; bei Gleichstand die spätere im Protokoll. */
function neuereZuerst(a: Probe, b: Probe): number {
  const zeit = Date.parse(b.zeitpunkt) - Date.parse(a.zeitpunkt);
  if (zeit !== 0 && !Number.isNaN(zeit)) return zeit;
  const hlc = vergleicheHlc(b.ereignis.hlc, a.ereignis.hlc);
  return hlc !== 0 ? hlc : vergleicheNachCodepunkt(b.ereignis.id, a.ereignis.id);
}

function zeile(zustand: Zustand, probe: Probe, zurueckgenommen: boolean): Funkprobenzeile {
  const einheit = zustand.einheiten[probe.einheitId];
  const grund = probe.ereignis.grund;
  return {
    ereignisId: probe.ereignis.id,
    einheitId: probe.einheitId,
    einheit: einheit === undefined ? probe.einheitId : anzeigename(einheit),
    ...(probe.rufgruppeId === undefined ? {} : { rufgruppeId: probe.rufgruppeId, rufgruppe: rufgruppenname(zustand, probe.rufgruppeId) }),
    ergebnis: probe.ergebnis,
    zeitpunkt: probe.zeitpunkt,
    akteur: probe.ereignis.akteur.benutzer,
    ...(grund === undefined || grund === "" ? {} : { grund }),
    zurueckgenommen,
  };
}

/** Die jüngsten Funkproben des Einsatzes, höchstens `grenze`, jüngste zuerst. */
export function funkprobenfolge(
  zustand: Zustand,
  ereignisse: Iterable<EingehendesEreignis>,
  grenze: number = FUNKPROBEN_GRENZE,
): readonly Funkprobenzeile[] {
  const proben: Probe[] = [];
  const zurueck = new Set<string>();
  for (const ereignis of ereignisse) {
    if (ereignis.typ === "FunkprobeDurchgefuehrt" && ereignis.undoOf !== undefined) zurueck.add(ereignis.undoOf);
    const probe = alsProbe(ereignis);
    if (probe !== undefined) proben.push(probe);
  }
  return proben
    .sort(neuereZuerst)
    .slice(0, Math.max(0, grenze))
    .map((probe) => zeile(zustand, probe, zurueck.has(probe.ereignis.id)));
}
