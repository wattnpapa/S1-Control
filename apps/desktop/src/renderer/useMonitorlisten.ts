/**
 * Die Listen des Monitors, die nicht im Lagebild stehen: die Warteschlange
 * des Nachrichtenwegs (FmZ) und der Lageticker aus dem Einsatztagebuch (S2).
 *
 * Geholt wird nur, solange die Ansicht zu sehen ist, bei jedem neuen
 * Lagezeiger und einmal je Minute — die Wartezeiten wachsen mit der Uhr des
 * Workers auch ohne Ereignis. Eine überholte Antwort wird verworfen, ohne
 * Antwort bleibt das letzte Bild stehen (wie `useStaerketafel`).
 */

import type { Nachrichtenzeile, Tagebuchzeile } from "@s1/domaene";
import { useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";

const MINUTE_MS = 60_000;
/** Wie viele Zeilen je Sicht bzw. aus dem Tagebuch geholt werden — mehr passt nicht an die Wand. */
export const LISTE_MAX = 40;
/** Die Sichten, deren Zeilen in der Warteschlange stehen: beim LdF, vor der FmZ, vor dem Sichter. */
export const WARTESICHTEN = ["ldf", "fmz", "sichter"] as const;

function useMinute(aktiv: boolean): number {
  const [minute, setzeMinute] = useState(0);
  useEffect(() => {
    if (!aktiv) return undefined;
    const zeitgeber = setInterval(() => {
      setzeMinute((bisher) => bisher + 1);
    }, MINUTE_MS);
    return () => {
      clearInterval(zeitgeber);
    };
  }, [aktiv]);
  return minute;
}

/** Holt neu, sobald sich `schluessel` ändert; `holen` fehlt, solange nichts zu holen ist. */
function useAbruf<T>(holen: (() => Promise<T>) | undefined, schluessel: string): T | undefined {
  const [wert, setzeWert] = useState<T | undefined>(undefined);
  const laufend = useRef(0);
  const aktuell = useRef(holen);
  aktuell.current = holen;
  useEffect(() => {
    const h = aktuell.current;
    if (h === undefined) return;
    laufend.current += 1;
    const meine = laufend.current;
    h()
      .then((antwort) => {
        if (meine === laufend.current) setzeWert(antwort);
      })
      .catch(() => {
        // Ohne Antwort bleibt das letzte Bild stehen; der Fuß nennt den Stand.
      });
  }, [schluessel]);
  return wert;
}

/** Zeilen mehrerer Sichten zusammen, jede Nachricht einmal. */
export function vereinige(listen: readonly (readonly Nachrichtenzeile[])[]): readonly Nachrichtenzeile[] {
  const gesehen = new Map<string, Nachrichtenzeile>();
  for (const liste of listen) for (const z of liste) if (!gesehen.has(z.id)) gesehen.set(z.id, z);
  return [...gesehen.values()];
}

export function useWarteschlange(akteId: string | undefined, lageZeiger: number | undefined, aktiv: boolean): readonly Nachrichtenzeile[] | undefined {
  const minute = useMinute(aktiv);
  const holen =
    !aktiv || akteId === undefined
      ? undefined
      : async (): Promise<readonly Nachrichtenzeile[]> => {
          const antworten = await Promise.all(WARTESICHTEN.map((sicht) => rufe({ art: "nachrichtenAnfordern", akteId, sicht, anzahl: LISTE_MAX })));
          return vereinige(antworten.map((a) => (a === null || typeof a !== "object" ? [] : a.zeilen)));
        };
  return useAbruf(holen, `${akteId ?? ""}|${String(lageZeiger)}|${String(aktiv)}|${String(minute)}`);
}

export function useTagebuchticker(akteId: string | undefined, lageZeiger: number | undefined, aktiv: boolean): readonly Tagebuchzeile[] | undefined {
  const holen =
    !aktiv || akteId === undefined
      ? undefined
      : async (): Promise<readonly Tagebuchzeile[]> => {
          const antwort = await rufe({ art: "tagebuchAnfordern", akteId, von: 0, anzahl: LISTE_MAX });
          const wert: unknown = antwort;
          return wert === null || typeof wert !== "object" ? [] : antwort.zeilen;
        };
  return useAbruf(holen, `${akteId ?? ""}|${String(lageZeiger)}|${String(aktiv)}`);
}
