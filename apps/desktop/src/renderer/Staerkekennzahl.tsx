/**
 * Die Kopfzahl „Ist-Stärke“ mit sichtbarer Zählregel.
 *
 * Die Regel steht nicht nur als Tooltip da (auf Touch unlesbar): Ein Tipp auf
 * „Regel“ klappt eine kurze Erklärung auf. Sie schließt durch den Knopf
 * „Schließen“, Esc, einen Tipp daneben oder einen zweiten Tipp. Die
 * Nebenzahl nennt, was neben der Ist-Stärke steht und nicht darin: „+4
 * erwartet (angefordert/Anmarsch/Eingang)“. Gezählt wird nach
 * `kennzahlen.zaehlklasse` — dieselbe Regel wie Tabelle, Baum und Ausgaben.
 */

import { useEffect, useRef, useState } from "react";
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

/** Schließt die Erklärung bei Esc und bei einem Tipp außerhalb von `huelle`. */
function useSchliessenDraussen(offen: boolean, schliesse: () => void): React.RefObject<HTMLSpanElement | null> {
  const huelle = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!offen) return undefined;
    const aufTaste = (ereignis: KeyboardEvent): void => {
      if (ereignis.key === "Escape") schliesse();
    };
    const aufZeiger = (ereignis: Event): void => {
      if (!huelle.current?.contains(ereignis.target as Node | null)) schliesse();
    };
    document.addEventListener("keydown", aufTaste);
    document.addEventListener("pointerdown", aufZeiger);
    return () => {
      document.removeEventListener("keydown", aufTaste);
      document.removeEventListener("pointerdown", aufZeiger);
    };
  }, [offen, schliesse]);
  return huelle;
}

export function Staerkekennzahl({ lagebild }: { readonly lagebild: Lagebild | undefined }): React.JSX.Element {
  const [offen, setzeOffen] = useState(false);
  const huelle = useSchliessenDraussen(offen, () => {
    setzeOffen(false);
  });
  // Ohne offenen Einsatz steht hier ein Strich und nicht `0/0/0 // 0`: Eine
  // Null ist eine Aussage über die Lage, und ohne Akte gibt es keine.
  const staerke = lagebild === undefined ? "—" : staerkeText(lagebild.gesamtstaerke);
  const neben = staerkeNebenText(lagebild);
  return (
    <span ref={huelle} className="kennzahl staerke" title={STAERKE_REGEL}>
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
          <button
            type="button"
            className="regelschliessen"
            onClick={() => {
              setzeOffen(false);
            }}
          >
            Schließen
          </button>
        </span>
      )}
    </span>
  );
}
