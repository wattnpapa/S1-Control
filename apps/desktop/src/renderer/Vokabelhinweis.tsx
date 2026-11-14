/**
 * Der Hinweis über der Einheitentabelle, wenn Einheiten aus einem
 * Erfassungsbogen mit rohen Vokabularcodes übernommen wurden („#3 Bückeburg"
 * statt „Zugtrupp Technischer Zug Bückeburg").
 *
 * Er erscheint nur, solange der Worker offene Korrekturen meldet
 * (`lagebild.vokabelkorrekturen`), und verschwindet nach dem Schreiben von
 * selbst: Das nächste Lagebild zählt null. Geändert wird nur, was noch
 * genau so dasteht, wie der fehlerhafte Import es schrieb.
 */

import { useState } from "react";

import type { Vokabelkorrekturergebnis } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";

function einheitenText(anzahl: number): string {
  return anzahl === 1 ? "1 Einheit" : `${String(anzahl)} Einheiten`;
}

/** Der Klartext zum Ausgang, für die Hinweisleiste. */
export function ergebnistext(ergebnis: Vokabelkorrekturergebnis): string {
  if (ergebnis.art === "abgewiesen") {
    return `Namen nur teilweise eingetragen (${String(ergebnis.ereignisse)} Angaben): ${ergebnis.meldung}`;
  }
  return `Namen eingetragen: ${einheitenText(ergebnis.einheiten)}, ${String(ergebnis.ereignisse)} Angaben.`;
}

export function Vokabelhinweis(): React.JSX.Element | null {
  const offen = useLaden((z) => z.lagebild?.vokabelkorrekturen ?? 0);
  const korrigiere = useLaden((z) => z.korrigiereVokabeln);
  const melde = useLaden((z) => z.melde);
  const [laeuft, setzeLaeuft] = useState(false);
  if (offen === 0) return null;

  const aufKlick = (): void => {
    setzeLaeuft(true);
    void korrigiere()
      .then((ergebnis) => {
        if (ergebnis !== undefined) melde(ergebnis.art === "korrigiert" ? "info" : "warnung", ergebnistext(ergebnis));
      })
      .finally(() => { setzeLaeuft(false); });
  };

  return (
    <p className="vokabelhinweis" role="status">
      <span>
        {einheitenText(offen)} aus Erfassungsbögen {offen === 1 ? "zeigt" : "zeigen"} Codes wie „#3“ statt
        Einheitstyp, Herkunft oder Fahrzeug.
      </span>
      <button
        type="button"
        disabled={laeuft}
        onClick={aufKlick}
        title="Namen aus dem gespeicherten Bogen eintragen. Von Hand geänderte Angaben bleiben, wie sie sind."
      >
        Namen eintragen
      </button>
    </p>
  );
}
