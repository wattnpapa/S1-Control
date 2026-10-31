/**
 * Bearbeitungssperren in der Oberfläche (AGENTS.md §4: Datensatz-Sperren).
 *
 * Zwei Hälften: Wer einen Editor öffnet, **setzt** eine Sperre und verlängert
 * sie im Takt ({@link useSperreHalten}); wer eine Zeile ansieht, **liest**, ob
 * ein anderer Arbeitsplatz sie gesperrt hat ({@link useFremdsperren}). Die
 * Sperre selbst lebt im Worker und reist über die Präsenz – hier ist nur die
 * Bedienung. Ein Ausfall (kein Netz, Share weg) lässt nur die Warnung
 * entfallen und stört das Arbeiten nicht.
 */

import { useCallback, useEffect, useRef } from "react";

import type { Peer } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";

/** Kürzer als die Ablaufzeit im Worker (30 s), damit ein verspäteter Takt sie nicht verliert. */
export const SPERRE_TAKT_MS = 10_000;
/** So lange gilt ein bewusstes Übernehmen, bevor die Warnung wieder greift. */
export const UEBERNAHME_MS = 15_000;

/** Wer hält die Sperre auf diesen Datensatz? Nur lebende Arbeitsplätze zählen. */
export function sperrenderArbeitsplatz(peers: readonly Peer[], entitaetId: string): string | undefined {
  const halter = peers.find((p) => !p.veraltet && (p.bearbeitet ?? []).includes(entitaetId));
  if (halter === undefined) return undefined;
  return halter.anzeigename === "" ? halter.rechnername : halter.anzeigename;
}

/** „🔒 wird von Lage 2 bearbeitet" – Symbol und Wort, nicht nur Farbe. */
export function sperrtext(name: string): string {
  return `🔒 wird von ${name} bearbeitet`;
}

/** Setzt die Sperre, solange `entitaetId` gesetzt ist, verlängert sie im Takt und gibt sie frei. */
export function useSperreHalten(entitaetId: string | undefined): void {
  const akteId = useLaden((z) => z.akteId);
  useEffect(() => {
    if (entitaetId === undefined || akteId === undefined) return undefined;
    const sende = (frei: boolean): void => {
      void rufe({ art: "sperre", akteId, entitaetId, ...(frei ? { frei: true } : {}) }).catch(() => undefined);
    };
    sende(false);
    const zeitgeber = setInterval(() => sende(false), SPERRE_TAKT_MS);
    return () => {
      clearInterval(zeitgeber);
      sende(true);
    };
  }, [akteId, entitaetId]);
}

export interface Fremdsperren {
  /** Der sperrende Arbeitsplatz oder `undefined`. */
  readonly von: (entitaetId: string) => string | undefined;
  /**
   * Darf der Editor jetzt öffnen? Bei fremder Sperre zuerst nein (mit Hinweistext
   * als Rückgabe), beim zweiten Versuch binnen {@link UEBERNAHME_MS} ja – bewusstes Übernehmen.
   */
  readonly pruefeStart: (entitaetId: string, jetzt?: number) => string | undefined;
}

export function useFremdsperren(): Fremdsperren {
  const peers = useLaden((z) => z.lagebild?.peers);
  const bewusst = useRef(new Map<string, number>());
  const von = useCallback(
    (entitaetId: string): string | undefined => sperrenderArbeitsplatz(peers ?? [], entitaetId),
    [peers],
  );
  const pruefeStart = useCallback(
    (entitaetId: string, jetzt = Date.now()): string | undefined => {
      const name = von(entitaetId);
      if (name === undefined) return undefined;
      const bis = bewusst.current.get(entitaetId);
      if (bis !== undefined && bis > jetzt) return undefined;
      bewusst.current.set(entitaetId, jetzt + UEBERNAHME_MS);
      return `${sperrtext(name)}. Zum Bearbeiten trotzdem erneut tippen – der Wert wird dann geprüft, nichts wird still überschrieben.`;
    },
    [von],
  );
  return { von, pruefeStart };
}
