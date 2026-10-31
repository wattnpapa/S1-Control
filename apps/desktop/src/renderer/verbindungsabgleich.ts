/**
 * Der Abgleich nach einer Störung (P1-1).
 *
 * Nach einer Wiederverbindung kann die Tabelle veraltet bleiben, ohne dass es
 * auffällt: Die Mitteilungen, die in der Lücke geschoben wurden, sind weg.
 * Dieser Hook hört auf den Verbindungsspeicher und lädt dann alles neu, was
 * das Fenster zeigt, und nimmt die Fehlermeldungen zurück, die nur die
 * Unterbrechung betrafen. Auch nach einem Schreibruf mit unbekanntem Ausgang
 * wird neu geladen, damit die Liste zeigt, ob die Eingabe angekommen ist.
 */

import { useEffect } from "react";

import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { bewerte, useVerbindung } from "./verbindung.js";

/** Holt Stand und Ansichten neu – ein Fehlschlag ist hier kein Fehlerbild. */
export async function gleicheAb(): Promise<void> {
  const laden = useLaden.getState();
  try {
    if (laden.akteId === undefined) {
      await laden.starte();
      return;
    }
    await rufe({ art: "standAnfordern", akteId: laden.akteId });
    await laden.frischeAnsichten();
  } catch {
    // Der nächste Takt der Überwachung versucht es wieder.
  }
}

export function useVerbindungsabgleich(): void {
  useEffect(() => {
    let vorher = useVerbindung.getState();
    return useVerbindung.subscribe((jetzt) => {
      const wieder = jetzt.wiederverbunden !== vorher.wiederverbunden;
      const unklar = jetzt.unklar !== vorher.unklar;
      vorher = jetzt;
      if (wieder) {
        useLaden.getState().entferneVerbindungsmeldungen();
        void gleicheAb();
      } else if (unklar && bewerte(jetzt, Date.now()).zustand !== "unterbrochen") {
        // Bei Unterbrechung folgt der Abgleich mit der Wiederverbindung.
        void gleicheAb();
      }
    });
  }, []);
}
