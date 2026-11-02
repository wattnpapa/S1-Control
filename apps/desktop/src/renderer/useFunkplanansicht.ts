/**
 * Holt das Blatt „Funkplan" und hält es am Zeiger frisch (KONZEPT-FUNKPLAN.md
 * §5, M3.7).
 *
 * Ein eigener Haken wie `useVersorgungsansicht` und kein Feld im Store: Die
 * Ansicht braucht nur dieses Blatt, und der Monitor (F4) soll denselben
 * Haken ohne Store nehmen können. Geholt wird beim ersten Zeichnen, bei jedem
 * neuen Zeigerstand und bei jeder neuen Suche; eine Uhr braucht der Plan nicht.
 *
 * Eine überholte Antwort wird verworfen: Trifft die Antwort auf eine ältere
 * Suche nach der auf eine jüngere ein, bleibt das jüngere Bild stehen.
 */

import { useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import type { Funkplanansicht } from "../kontrakt/index.js";

export interface Funkplanabruf {
  readonly ansicht: Funkplanansicht | undefined;
  readonly fehler: string | undefined;
}

export function useFunkplanansicht(akteId: string | undefined, lageZeiger: number | undefined, suche = ""): Funkplanabruf {
  const [ansicht, setzeAnsicht] = useState<Funkplanansicht | undefined>(undefined);
  const [fehler, setzeFehler] = useState<string | undefined>(undefined);
  const laufend = useRef(0);

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
  }, [akteId, lageZeiger, suche]);

  return { ansicht, fehler };
}
