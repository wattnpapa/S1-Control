/**
 * Holt das Blatt „Versorgung" und hält es am Zeiger frisch (S4.1, M3.7).
 *
 * Ein eigener Haken und kein Feld im Store aus `laden.ts`: Das Blatt und der
 * Monitor brauchen dieselbe Ansicht, und der Monitor hat keinen Store
 * (MonitorFenster.tsx). Geholt wird beim ersten Zeichnen, bei jedem neuen
 * Zeigerstand, beim Wechsel des Horizonts und einmal je Minute — die
 * Vorausschau hängt an der Uhr, nicht nur an den Ereignissen.
 *
 * Eine überholte Antwort wird verworfen: Trifft die Antwort auf einen älteren
 * Ruf nach der auf einen jüngeren ein, bleibt das jüngere Bild stehen.
 */

import { useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import type { Versorgungsansicht } from "../kontrakt/index.js";

const MINUTE_MS = 60_000;

export interface Versorgungsabruf {
  readonly ansicht: Versorgungsansicht | undefined;
  readonly fehler: string | undefined;
}

export function useVersorgungsansicht(
  akteId: string | undefined,
  lageZeiger: number | undefined,
  stunden: 24 | 48 = 24,
  aktiv = true,
): Versorgungsabruf {
  const [ansicht, setzeAnsicht] = useState<Versorgungsansicht | undefined>(undefined);
  const [fehler, setzeFehler] = useState<string | undefined>(undefined);
  const [minute, setzeMinute] = useState(0);
  const laufend = useRef(0);

  useEffect(() => {
    if (!aktiv) return undefined;
    const zeitgeber = setInterval(() => {
      setzeMinute((bisher) => bisher + 1);
    }, MINUTE_MS);
    return () => {
      clearInterval(zeitgeber);
    };
  }, [aktiv]);

  useEffect(() => {
    if (!aktiv || akteId === undefined) return;
    laufend.current += 1;
    const meine = laufend.current;
    rufe({ art: "versorgungAnfordern", akteId, stunden })
      .then((antwort) => {
        if (meine !== laufend.current) return;
        // Eine Attrappe oder ein alter Dienst antwortet mit `null` — dann
        // bleibt die Ansicht leer, statt eine halbe zu zeigen.
        const wert: unknown = antwort;
        if (wert === null || typeof wert !== "object") return;
        setzeAnsicht(antwort);
        setzeFehler(undefined);
      })
      .catch((grund: unknown) => {
        if (meine !== laufend.current) return;
        setzeFehler(grund instanceof Error ? grund.message : String(grund));
      });
  }, [akteId, lageZeiger, stunden, aktiv, minute]);

  return { ansicht, fehler };
}
