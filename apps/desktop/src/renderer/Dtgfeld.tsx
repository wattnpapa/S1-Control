/**
 * Ein Zeitfeld des Nachrichtenvordrucks (KONZEPT-NACHRICHTEN.md §6).
 *
 * Zeiten werden eingegeben und gezeigt, wie der Vordruck sie verlangt: als
 * Datum-Zeit-Gruppe („171045nov26"). Strg+D schreibt „jetzt" hinein, wie
 * `Zeitfeld.tsx` überall sonst; gelesen wird mit `zeitAusEingabe`, das auch
 * die Funkzeit („1045", „171045") nimmt. Unter dem Feld steht, wie die
 * Anwendung die Eingabe verstanden hat — sonst bemerkt niemand einen Tag im
 * falschen Monat.
 *
 * Beim Fokus ist der ganze Inhalt markiert (Audit Fernmelder P1-1): Die
 * getippte Funkzeit „1155" ersetzt die Vorbelegung „jetzt", statt sich an sie
 * zu hängen. Eine Zeit mehr als fünf Minuten in der Zukunft oder älter als
 * einen Tag bekommt einen Hinweis, keine Sperre (Fernmelder P2-2).
 */

import { datumZeitGruppe, zeitpunktText } from "@s1/domaene";

import { zeitAusEingabe, zeitHinweis } from "./nachrichtenformate.js";

export interface DtgfeldEigenschaften {
  readonly beschriftung: string;
  readonly wert: string;
  readonly aufAenderung: (wert: string) => void;
  /** Additiv: der Platz in der eigenen Tabulatorfolge der Maske (`Maske.tsx`, `springeTabfolge`). */
  readonly tabfolge?: number;
  /** Additiv: ein Hinweistext unter dem Feld, etwa „Uhrzeit, zu der die Gegenstelle quittiert hat". */
  readonly hilfe?: string;
}

export function Dtgfeld({ beschriftung, wert, aufAenderung, tabfolge, hilfe }: DtgfeldEigenschaften): React.JSX.Element {
  const gelesen = zeitAusEingabe(wert);
  const plausibel = zeitHinweis(gelesen);
  return (
    <span className="dtgfeld">
      <label>
        {beschriftung}
        <input
          value={wert}
          className="mono"
          placeholder="171045nov26"
          title={hilfe === undefined ? "Datum-Zeit-Gruppe; Strg+D setzt „jetzt“" : `${hilfe}; Strg+D setzt „jetzt“`}
          data-tabfolge={tabfolge}
          onFocus={(e) => e.currentTarget.select()}
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
      {plausibel !== undefined && (
        <span className="feldwarnung">
          {plausibel}
        </span>
      )}
    </span>
  );
}
