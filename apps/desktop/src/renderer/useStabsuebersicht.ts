/**
 * Holt die Stabsübersicht und hält sie am Lagezeiger frisch — wie
 * `useStaerketafel`: Kräfte und Aufträge hängen nur an Ereignissen, nicht an
 * der Uhr. Eine überholte Antwort wird verworfen.
 */

import { useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import type { Stabsuebersichtansicht } from "../kontrakt/index.js";

export function useStabsuebersicht(akteId: string | undefined, lageZeiger: number | undefined): Stabsuebersichtansicht | undefined {
  const [ansicht, setzeAnsicht] = useState<Stabsuebersichtansicht | undefined>(undefined);
  const laufend = useRef(0);

  useEffect(() => {
    if (akteId === undefined) return;
    laufend.current += 1;
    const meine = laufend.current;
    rufe({ art: "stabsuebersichtAnfordern", akteId })
      .then((antwort) => {
        const wert: unknown = antwort;
        if (meine !== laufend.current || wert === null || typeof wert !== "object") return;
        setzeAnsicht(antwort);
      })
      .catch(() => {
        // Ohne Antwort bleibt das letzte Bild stehen.
      });
  }, [akteId, lageZeiger]);

  return ansicht;
}
