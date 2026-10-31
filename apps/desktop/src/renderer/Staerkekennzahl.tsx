/**
 * Die Kopfzahl „Ist-Stärke“ mit sichtbarer Zählregel.
 *
 * Die Regel steht nicht nur als Tooltip da (auf Touch unlesbar): Ein Tipp auf
 * „Regel“ klappt eine kurze Erklärung auf, ein zweiter schließt sie. Die
 * Nebenzahl nennt, was neben der Ist-Stärke steht und nicht darin: „+4
 * erwartet (angefordert/Anmarsch/Eingang)“. Gezählt wird nach
 * `kennzahlen.zaehlklasse` — dieselbe Regel wie Tabelle, Baum und Ausgaben.
 */

import { useState } from "react";
import { kennzahlen } from "@s1/domaene";
import type { Lagebild } from "../kontrakt/index.js";
import { staerkeText } from "./formate.js";

/** Die Zählregel, kurz — für Tooltip und Vorlesegeräte; die lange steht in `ZAEHLREGEL_TEXT`. */
export const STAERKE_REGEL = kennzahlen.ZAEHLREGEL_TEXT;

/** „+4 erwartet (angefordert/Anmarsch/Eingang) · 2 beendet“ — leer, wenn nichts neben der Kopfzahl steht. */
export function staerkeNebenText(lagebild: Lagebild | undefined): string {
  const beendet = lagebild?.staerkeBeendet ?? 0;
  return [
    kennzahlen.erwartetText(lagebild?.staerkeErwartet ?? 0),
    beendet > 0 ? `${String(beendet)} beendet` : "",
  ]
    .filter((teil) => teil !== "")
    .join(" · ");
}

export function Staerkekennzahl({ lagebild }: { readonly lagebild: Lagebild | undefined }): React.JSX.Element {
  const [offen, setzeOffen] = useState(false);
  // Ohne offenen Einsatz steht hier ein Strich und nicht `0/0/0 // 0`: Eine
  // Null ist eine Aussage über die Lage, und ohne Akte gibt es keine.
  const staerke = lagebild === undefined ? "—" : staerkeText(lagebild.gesamtstaerke);
  const neben = staerkeNebenText(lagebild);
  return (
    <span className="kennzahl staerke" title={STAERKE_REGEL}>
      <span className="label">
        Ist-Stärke
        <button
          type="button"
          className="regelknopf"
          aria-expanded={offen}
          aria-controls="zaehlregel"
          onClick={() => {
            setzeOffen(!offen);
          }}
        >
          Regel
        </button>
      </span>
      <span className="wert">{staerke}</span>
      {neben !== "" && <span className="nebenwert">{neben}</span>}
      {offen && (
        <span id="zaehlregel" role="note" className="zaehlregel">
          {STAERKE_REGEL}
        </span>
      )}
    </span>
  );
}
