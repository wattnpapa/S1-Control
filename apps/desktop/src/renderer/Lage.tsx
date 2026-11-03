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

import { useEffect, useMemo, useState } from "react";

import { Abschnittsbaum } from "./Abschnittsbaum.js";
import { Einheitentabelle } from "./Einheitentabelle.js";
import { Ausgaben } from "./Ausgaben.js";
import { Scanner } from "./Scanner.js";
import { Tagebuch } from "./Tagebuch.js";
import { useKuerzel } from "./tastatur.js";
import type { Lageblatt } from "./blaetter.js";

export interface LageEigenschaften {
  /** Welches der drei Blätter der Lage oben liegt (`blaetter.ts`). */
  readonly blatt: Lageblatt;
  /** Schlägt ein anderes Blatt der Lage auf — für „Im Tagebuch zeigen“. */
  readonly aufBlatt?: ((blatt: Lageblatt) => void) | undefined;
}

export function Lage({ blatt, aufBlatt }: LageEigenschaften): React.JSX.Element {
  const [abschnittId, setzeAbschnittId] = useState<string | undefined>(undefined);
  const [einheitId, setzeEinheitId] = useState<string | undefined>(undefined);
  const [scannerOffen, setzeScannerOffen] = useState(false);
  /** „Im Tagebuch zeigen“: Das Tagebuch beginnt dann auf die gewählte Einheit beschränkt. */
  const [tagebuchAufEinheit, setzeTagebuchAufEinheit] = useState(false);
  useEffect(() => {
    if (blatt !== "tagebuch") setzeTagebuchAufEinheit(false);
  }, [blatt]);

  // Strg+Q öffnet den Scanner — der Buchstabe der Excel für „digitalen EEB in
  // neue Zeile" (m_makroFunktionen). Er wird hier angemeldet und nicht in der
  // Tabelle: Der Scanner braucht den gewählten Abschnitt, und den hält die
  // Lage. Seit Runde 6 („Entlastung", 3.3) gibt es keine Werkzeugzeile der
  // Lage mehr; der Weg mit der Maus ist „Einheit anlegen ▾" der Tabelle.
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
      <div className="lagespalten" hidden={blatt !== "lage"}>
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
          aufScanner={() => {
            setzeScannerOffen(true);
          }}
          // Die Auswahl hält die Lage, das Blatt der Arbeitsplatz: Das
          // Tagebuch filtert dann nach genau dieser Einheit.
          aufTagebuch={
            aufBlatt === undefined
              ? undefined
              : (gewaehlt) => {
                  setzeEinheitId(gewaehlt);
                  setzeTagebuchAufEinheit(true);
                  aufBlatt("tagebuch");
                }
          }
        />
      </div>

      {blatt === "ausgaben" && <Ausgaben />}

      {scannerOffen && (
        <Scanner
          abschnittId={abschnittId}
          aufSchliessen={() => {
            setzeScannerOffen(false);
          }}
        />
      )}

      {blatt === "tagebuch" && <Tagebuch einheitId={einheitId} abschnittId={abschnittId} aufAuswahl={tagebuchAufEinheit} />}
    </section>
  );
}
