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
 *
 * Additiv (Fernmelder P2-3, P2-9): Im Nachtrag vom Papier steht im leeren Feld
 * „vom Blatt“ statt einer Beispielgruppe, und eine alte Zeit bekommt keinen
 * Hinweis — sie ist dort die Regel, nicht der Tippfehler.
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
  /** Additiv (Fernmelder P2-3): der Platzhalter im leeren Feld, im Nachtrag „vom Blatt“. */
  readonly platzhalter?: string | undefined;
  /** Additiv (Fernmelder P2-9): Nachtrag vom Papier — eine Zeit älter als ein Tag ist kein Hinweis wert. */
  readonly nachtrag?: boolean | undefined;
}

export function Dtgfeld({ beschriftung, wert, aufAenderung, tabfolge, hilfe, platzhalter, nachtrag = false }: DtgfeldEigenschaften): React.JSX.Element {
  const gelesen = zeitAusEingabe(wert);
  const hinweis = zeitHinweis(gelesen);
  // Im Nachtrag bleibt nur der Hinweis auf eine Zeit in der Zukunft: Papier ist alt, aber nie voraus.
  const plausibel = nachtrag && hinweis !== undefined && hinweis.includes("zurück") ? undefined : hinweis;
  return (
    <span className="dtgfeld">
      <label>
        {beschriftung}
        <input
          value={wert}
          className="mono"
          placeholder={platzhalter ?? "171045nov26"}
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
