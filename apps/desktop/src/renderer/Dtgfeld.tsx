/**
 * Ein Zeitfeld des Nachrichtenvordrucks (KONZEPT-NACHRICHTEN.md §6).
 *
 * Zeiten werden eingegeben und gezeigt, wie der Vordruck sie verlangt: als
 * Datum-Zeit-Gruppe („171045nov26"). Strg+D schreibt „jetzt" hinein, wie
 * `Zeitfeld.tsx` überall sonst; gelesen wird mit `zeitAusEingabe`, das auch
 * die Funkzeit („1045", „171045") nimmt. Unter dem Feld steht, wie die
 * Anwendung die Eingabe verstanden hat — sonst bemerkt niemand einen Tag im
 * falschen Monat.
 */

import { datumZeitGruppe, zeitpunktText } from "@s1/domaene";

import { zeitAusEingabe } from "./nachrichtenformate.js";

export interface DtgfeldEigenschaften {
  readonly beschriftung: string;
  readonly wert: string;
  readonly aufAenderung: (wert: string) => void;
}

export function Dtgfeld({ beschriftung, wert, aufAenderung }: DtgfeldEigenschaften): React.JSX.Element {
  const gelesen = zeitAusEingabe(wert);
  return (
    <span className="dtgfeld">
      <label>
        {beschriftung}
        <input
          value={wert}
          className="mono"
          placeholder="171045nov26"
          title="Datum-Zeit-Gruppe; Strg+D setzt „jetzt“"
          onChange={(e) => {
            aufAenderung(e.target.value);
          }}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
              e.preventDefault();
              aufAenderung(datumZeitGruppe(new Date()));
            }
          }}
        />
      </label>
      <span className={gelesen === undefined && wert.trim() !== "" ? "feldfehler" : "nebenwert"}>
        {wert.trim() === "" ? "" : gelesen === undefined ? "nicht lesbar" : zeitpunktText(gelesen)}
      </span>
    </span>
  );
}
