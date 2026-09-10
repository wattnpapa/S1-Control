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

import { useMemo, useState } from "react";

import { Abschnittsbaum } from "./Abschnittsbaum.js";
import { Einheitentabelle } from "./Einheitentabelle.js";
import { Ausgaben } from "./Ausgaben.js";
import { Monitorwahl } from "./Monitorwahl.js";
import { Scanner } from "./Scanner.js";
import { Tagebuch } from "./Tagebuch.js";
import { useLaden } from "./laden.js";
import { useKuerzel } from "./tastatur.js";

export function Lage(): React.JSX.Element {
  const laden = useLaden();
  const [abschnittId, setzeAbschnittId] = useState<string | undefined>(undefined);
  const [einheitId, setzeEinheitId] = useState<string | undefined>(undefined);
  const [scannerOffen, setzeScannerOffen] = useState(false);

  // Strg+Q öffnet den Scanner — der Buchstabe der Excel für „digitalen EEB in
  // neue Zeile" (m_makroFunktionen). Er wird hier angemeldet und nicht in der
  // Tabelle: Der Scanner gehört zur Lage, nicht zu einer ihrer Ansichten.
  useKuerzel(
    useMemo(
      () => ({
        eeb: () => {
          setzeScannerOffen(true);
        },
      }),
      [],
    ),
  );

  return (
    <section aria-label="Lagebild" className="lage">
      <div className="lagekopf">
        <h2>{laden.lagebild?.einsatzName ?? "Wird geöffnet …"}</h2>
        <button type="button" onClick={() => void laden.schliesseEinsatz()}>
          Einsatz schließen
        </button>
        <button
          type="button"
          onClick={() => {
            setzeScannerOffen(true);
          }}
        >
          Erfassungsbogen einlesen
        </button>
        <Monitorwahl />
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
        <Abschnittsbaum
          gewaehlt={abschnittId}
          aufWahl={(gewaehlt) => {
            setzeAbschnittId(gewaehlt);
            // Ein Abschnittswechsel hebt die Einheitenwahl auf: Die gewählte
            // Einheit steht danach fast immer außerhalb des Filters, und eine
            // Auswahl, die man nicht sieht, ist schlimmer als keine.
            setzeEinheitId(undefined);
          }}
        />
        <Einheitentabelle
          abschnittId={abschnittId}
          einheitId={einheitId}
          aufEinheit={setzeEinheitId}
        />
      </div>

      <Ausgaben />

      {scannerOffen && (
        <Scanner
          abschnittId={abschnittId}
          aufSchliessen={() => {
            setzeScannerOffen(false);
          }}
        />
      )}

      <Tagebuch einheitId={einheitId} abschnittId={abschnittId} />
    </section>
  );
}
