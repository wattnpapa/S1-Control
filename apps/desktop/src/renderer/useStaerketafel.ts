/**
 * Holt die Stärketafeln des Sachgebiets 1 für den Monitor (Ansichten
 * „Abschnitte" und „Organisationen") und hält sie am Zeiger frisch.
 *
 * Anders als die Versorgung hängt die Ist-Stärke nicht an der Uhr, sondern
 * nur an Ereignissen — deshalb kein Minutentakt, nur der Zeigerstand.
 * Eine überholte Antwort wird verworfen, wie in `useVersorgungsansicht`.
 */

import { useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import type { Staerketafelansicht } from "../kontrakt/index.js";

export function useStaerketafel(akteId: string | undefined, lageZeiger: number | undefined, aktiv: boolean): Staerketafelansicht | undefined {
  const [ansicht, setzeAnsicht] = useState<Staerketafelansicht | undefined>(undefined);
  const laufend = useRef(0);

  useEffect(() => {
    if (!aktiv || akteId === undefined) return;
    laufend.current += 1;
    const meine = laufend.current;
    rufe({ art: "staerketafelAnfordern", akteId })
      .then((antwort) => {
        const wert: unknown = antwort;
        if (meine !== laufend.current || wert === null || typeof wert !== "object") return;
        setzeAnsicht(antwort);
      })
      .catch(() => {
        // Ohne Antwort bleibt das letzte Bild stehen; der Fuß nennt den Stand.
      });
  }, [akteId, lageZeiger, aktiv]);

  return ansicht;
}
