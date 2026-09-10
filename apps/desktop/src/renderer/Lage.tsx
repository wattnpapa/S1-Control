/**
 * Das Lagebild — der Rahmen, in dem die Ansichten von M3 nebeneinanderstehen.
 *
 * Er hält **eine** Sache: die Auswahl. Welcher Abschnitt gewählt ist,
 * entscheidet, was die Einheitentabelle zeigt; welche Einheit gewählt ist,
 * entscheidet, was das Tagebuch filtert. Diese Auswahl gehört weder in den
 * Baum noch in die Tabelle, sondern dorthin, wo beide sie sehen — und sie
 * gehört **nicht** in den Store: Sie ist eine Sache dieses Fensters und
 * überlebt keinen Wechsel der Akte.
 */

import { useState } from "react";

import { Abschnittsbaum } from "./Abschnittsbaum.js";
import { useLaden } from "./laden.js";

export function Lage(): React.JSX.Element {
  const laden = useLaden();
  const [abschnittId, setzeAbschnittId] = useState<string | undefined>(undefined);

  return (
    <section aria-label="Lagebild" className="lage">
      <div className="lagekopf">
        <h2>{laden.lagebild?.einsatzName ?? "Wird geöffnet …"}</h2>
        <button type="button" onClick={() => void laden.schliesseEinsatz()}>
          Einsatz schließen
        </button>
        <button
          type="button"
          disabled={laden.lagebild === undefined || laden.lagebild.undoTiefe === 0}
          onClick={() => void laden.zurueck()}
        >
          Rückgängig
          {laden.lagebild?.undoObersteArt === undefined ? "" : ` (${laden.lagebild.undoObersteArt})`}
        </button>
      </div>

      <div className="lagespalten">
        <Abschnittsbaum gewaehlt={abschnittId} aufWahl={setzeAbschnittId} />
      </div>
    </section>
  );
}
