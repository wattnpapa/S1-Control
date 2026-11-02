/**
 * Holt das Blatt „Funkplan" und hält es am Zeiger frisch (KONZEPT-FUNKPLAN.md
 * §5, M3.7).
 *
 * Ein eigener Haken wie `useVersorgungsansicht` und kein Feld im Store: Die
 * Ansicht braucht nur dieses Blatt, und der Monitor (F4) soll denselben
 * Haken ohne Store nehmen können. Geholt wird beim ersten Zeichnen, bei jedem
 * neuen Zeigerstand, bei jeder neuen Suche und (F3) mit `jedeMinute` einmal
 * je Minute: Der letzte Kontakt wird gegen die Uhr des Workers älter, auch
 * ohne Ereignis — wie die Vorausschau der Versorgung. Die Maske aus der Lage
 * holt ohne Uhr: Ein neuer Stand darf ihre Vorher-Werte nicht verschieben.
 *
 * Eine überholte Antwort wird verworfen: Trifft die Antwort auf eine ältere
 * Suche nach der auf eine jüngere ein, bleibt das jüngere Bild stehen.
 */

import { useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import type { Funkplanansicht } from "../kontrakt/index.js";

const MINUTE_MS = 60_000;

export interface Funkplanabruf {
  readonly ansicht: Funkplanansicht | undefined;
  readonly fehler: string | undefined;
}

export function useFunkplanansicht(akteId: string | undefined, lageZeiger: number | undefined, suche = "", jedeMinute = false): Funkplanabruf {
  const [ansicht, setzeAnsicht] = useState<Funkplanansicht | undefined>(undefined);
  const [fehler, setzeFehler] = useState<string | undefined>(undefined);
  const [minute, setzeMinute] = useState(0);
  const laufend = useRef(0);

  useEffect(() => {
    if (!jedeMinute) return undefined;
    const zeitgeber = setInterval(() => {
      setzeMinute((bisher) => bisher + 1);
    }, MINUTE_MS);
    return () => {
      clearInterval(zeitgeber);
    };
  }, [jedeMinute]);

  useEffect(() => {
    if (akteId === undefined) return;
    laufend.current += 1;
    const meine = laufend.current;
    const text = suche.trim();
    rufe({ art: "funkplanAnfordern", akteId, ...(text === "" ? {} : { suche: text }) })
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
  }, [akteId, lageZeiger, suche, minute]);

  return { ansicht, fehler };
}
