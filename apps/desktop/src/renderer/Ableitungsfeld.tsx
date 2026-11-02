/**
 * Ein Feld, das eine Ableitung zeigt und sie auf Wunsch überschreibt —
 * Funkrufname (K31) und Erreichbarkeit (K9) in der Maske „Funk und
 * Erreichbarkeit" (Option 5d).
 *
 * Gelesen steht der abgeleitete Wert mit seiner Quelle und dem Knopf
 * „Überschreiben …"; der öffnet ein Eingabefeld, vorbelegt mit dem
 * angezeigten Wert. Ein gesetzter Override steht gleich als Eingabe da.
 * „Ableitung verwenden" leert ihn: Leer heißt, der Wert folgt wieder Fahrzeug
 * beziehungsweise Führungskraft. Was geschrieben wird, entscheidet
 * `funkmaskenwerte.ts`.
 */

import { useState } from "react";

export interface AbleitungsfeldEigenschaften {
  readonly titel: string;
  /** Die Zeile unter dem Titel, etwa „Vorbelegung aus dem Fahrzeug". */
  readonly erklaerung: string;
  /** Der Wert, der heute gilt (mit Override der Override). */
  readonly angezeigt: string;
  /** Woher die Ableitung kommt: „aus dem Fahrzeug". */
  readonly quelle: string;
  /** Beim Öffnen der Maske war ein Override gesetzt. */
  readonly ueberschrieben: boolean;
  readonly wert: string;
  readonly aufWert: (wert: string) => void;
}

export function Ableitungsfeld(props: AbleitungsfeldEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState(props.ueberschrieben);
  const zurueck = props.ueberschrieben && !offen;
  return (
    <div className="ableitungsfeld">
      <span className="feldtitel">
        {props.titel} <small>{props.erklaerung}</small>
      </span>
      {offen ? (
        <span className="ableitungszeile">
          <input aria-label={props.titel} value={props.wert} placeholder={`leer = ${props.quelle}`} onChange={(e) => props.aufWert(e.target.value)} />
          <button
            type="button"
            onClick={() => {
              props.aufWert("");
              setzeOffen(false);
            }}
          >
            Ableitung verwenden
          </button>
        </span>
      ) : (
        <span className="ableitungszeile lesen">
          <output aria-label={props.titel}>{zurueck ? `wird wieder ${props.quelle} abgeleitet` : props.angezeigt === "" ? "—" : props.angezeigt}</output>
          {!zurueck && <small className="leise">{props.quelle}</small>}
          <button
            type="button"
            onClick={() => {
              props.aufWert(zurueck ? "" : props.angezeigt);
              setzeOffen(true);
            }}
          >
            Überschreiben …
          </button>
        </span>
      )}
    </div>
  );
}
