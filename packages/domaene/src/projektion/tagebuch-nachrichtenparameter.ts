/**
 * Der Satz zu den Parametern des Nachrichtenwegs im Tagebuch
 * (`NachrichtenParameterGesetzt`) — aus `tagebuch-nachrichten.ts` gelöst, als
 * die Schwellen vor dem Sichter je Vorrang dazukamen (R2-FM P2-5, R2-Si P2-2)
 * und jene Datei sonst über die Größengrenze gewachsen wäre.
 */

import type { EingehendesEreignis } from "../fold.js";
import { FMZ_SCHWELLE_VORBELEGUNG, SICHTER_SCHWELLE_BLITZ_VORBELEGUNG, SICHTER_SCHWELLE_SOFORT_VORBELEGUNG } from "../werte.js";

/** „Nachrichtenparameter gesetzt (Schwelle FmZ): 20 → 30 min". */
export function parametersatz(ereignis: EingehendesEreignis, betreff: string): string {
  const feld = (ereignis.nutzlast as { feld?: unknown } | undefined)?.feld;
  const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
  if (feld === "fmzSchwelleMinuten") {
    const alt = typeof vorher === "number" ? vorher : FMZ_SCHWELLE_VORBELEGUNG;
    const neu = typeof ereignis.neu === "number" ? ereignis.neu : FMZ_SCHWELLE_VORBELEGUNG;
    return `${betreff} (Schwelle FmZ): ${String(alt)} → ${String(neu)} min`;
  }
  // R2-FM P2-5, R2-Si P2-2: die Schwellen vor dem Sichter je Vorrang.
  if (feld === "sichterSchwelleBlitzMinuten" || feld === "sichterSchwelleSofortMinuten") {
    const blitz = feld === "sichterSchwelleBlitzMinuten";
    const vorbelegung = blitz ? SICHTER_SCHWELLE_BLITZ_VORBELEGUNG : SICHTER_SCHWELLE_SOFORT_VORBELEGUNG;
    const alt = typeof vorher === "number" ? vorher : vorbelegung;
    const neu = typeof ereignis.neu === "number" ? ereignis.neu : vorbelegung;
    return `${betreff} (Schwelle vor dem Sichter bei ${blitz ? "Blitz" : "Sofort"}): ${String(alt)} → ${String(neu)} min`;
  }
  const wort = (wert: unknown): string => (wert === true ? "ja" : "nein");
  const name = feld === "ldfStation" ? "LdF als Station" : "Sichtung auch für Ausgänge";
  return `${betreff} (${name}): ${wort(vorher)} → ${wort(ereignis.neu)}`;
}
