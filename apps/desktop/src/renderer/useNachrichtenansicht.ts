/**
 * Holt eine Sicht des Blattes „Nachrichten" und hält sie am Zeiger frisch
 * (KONZEPT-NACHRICHTEN.md §9, M3.7) — ein eigener Haken wie
 * `useFunkplanansicht` und kein Feld im Store: Das Blatt braucht seine Liste
 * nur, solange es aufgeschlagen ist.
 *
 * Geholt wird beim ersten Zeichnen, bei jedem neuen Zeigerstand und bei jeder
 * neuen Anfrage (Sicht, Stellen, Chips, Suche). Eine überholte Antwort wird
 * verworfen: Trifft die Antwort auf eine ältere Suche nach der auf eine
 * jüngere ein, bleibt das jüngere Bild stehen.
 */

import { useEffect, useRef, useState } from "react";

import type { Nachrichtenansicht, Ruf } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { SEITE } from "./laden.js";

export type Nachrichtenanfrage = Omit<Extract<Ruf, { art: "nachrichtenAnfordern" }>, "art" | "akteId">;

export interface Nachrichtenabruf {
  readonly ansicht: Nachrichtenansicht | undefined;
  readonly fehler: string | undefined;
}

export function useNachrichtenansicht(akteId: string | undefined, lageZeiger: number | undefined, anfrage: Nachrichtenanfrage): Nachrichtenabruf {
  const [ansicht, setzeAnsicht] = useState<Nachrichtenansicht | undefined>(undefined);
  const [fehler, setzeFehler] = useState<string | undefined>(undefined);
  const laufend = useRef(0);
  // Die Anfrage als Text: Ein neues, gleiches Objekt bei jedem Zeichnen soll nicht neu holen.
  const schluessel = JSON.stringify(anfrage);

  useEffect(() => {
    if (akteId === undefined) return;
    laufend.current += 1;
    const meine = laufend.current;
    const gelesen = JSON.parse(schluessel) as Nachrichtenanfrage;
    rufe({ art: "nachrichtenAnfordern", akteId, anzahl: SEITE, ...gelesen })
      .then((antwort) => {
        if (meine !== laufend.current) return;
        // Eine Attrappe oder ein alter Dienst antwortet mit `null`.
        const wert: unknown = antwort;
        if (wert === null || typeof wert !== "object") return;
        setzeAnsicht(antwort);
        setzeFehler(undefined);
      })
      .catch((grund: unknown) => {
        if (meine !== laufend.current) return;
        setzeFehler(grund instanceof Error ? grund.message : String(grund));
      });
  }, [akteId, lageZeiger, schluessel]);

  return { ansicht, fehler };
}
