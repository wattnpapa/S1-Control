/**
 * Die weiteren Rufgruppen einer Einheit als Chips (Option 5d): je Gruppe ein
 * Chip mit Entfernen, dahinter „+ Rufgruppe" als Auswahl der geltenden
 * Gruppen, die noch nicht dabei sind.
 *
 * Eine aufgelöste oder unbekannte Gruppe bleibt als Chip stehen, gekennzeichnet,
 * damit niemand eine Liste übernimmt, deren Inhalt er nicht sieht; sie lässt
 * sich entfernen, aber nicht neu wählen. Geschrieben wird die ganze Liste
 * (`weitereRufgruppenDerEinheit`).
 */

import type { Rufgruppenkarte, WeitereRufgruppe } from "@s1/domaene";

import { wahltext } from "./Rufgruppenzelle.js";

export interface RufgruppenchipsEigenschaften {
  readonly gewaehlt: readonly string[];
  /** Die Gruppen des Plans; zur Wahl stehen die geltenden. */
  readonly rufgruppen: readonly Rufgruppenkarte[];
  /** Die Namen der Liste, wie sie beim Öffnen war — für Gruppen, die der Plan nicht mehr führt. */
  readonly bekannt: readonly WeitereRufgruppe[];
  /** Die Hauptrufgruppe steht nicht zur Wahl. */
  readonly hauptgruppe: string;
  readonly aufWahl: (liste: readonly string[]) => void;
}

function chiptext(id: string, rufgruppen: readonly Rufgruppenkarte[], bekannt: readonly WeitereRufgruppe[]): string {
  const karte = rufgruppen.find((r) => r.rufgruppeId === id);
  if (karte !== undefined) return karte.aufgeloest ? `${karte.name} (aufgelöst)` : karte.name;
  const frueher = bekannt.find((w) => w.rufgruppeId === id);
  return frueher === undefined ? `${id} (unbekannt)` : `${frueher.name}${frueher.aufgeloest ? " (aufgelöst)" : ""}`;
}

export function Rufgruppenchips(props: RufgruppenchipsEigenschaften): React.JSX.Element {
  const { gewaehlt, rufgruppen } = props;
  const frei = rufgruppen.filter((r) => !r.aufgeloest && r.rufgruppeId !== props.hauptgruppe && !gewaehlt.includes(r.rufgruppeId));
  return (
    <div className="rufgruppenchips">
      <span className="feldtitel">
        Weitere Rufgruppen <small>hört mit, ist dort ansprechbar</small>
      </span>
      <ul className="chips" aria-label="Weitere Rufgruppen">
        {gewaehlt.map((id) => {
          const text = chiptext(id, rufgruppen, props.bekannt);
          return (
            <li key={id} className="chip">
              <span className="mono">{text}</span>
              <button type="button" className="chipweg" aria-label={`${text} entfernen`} title="Entfernen" onClick={() => props.aufWahl(gewaehlt.filter((g) => g !== id))}>
                ×
              </button>
            </li>
          );
        })}
        {gewaehlt.length === 0 && <li className="leise">keine</li>}
      </ul>
      {frei.length > 0 && (
        <select aria-label="Weitere Rufgruppe hinzufügen" className="chipwahl" value="" onChange={(e) => {
            if (e.target.value !== "") props.aufWahl([...gewaehlt, e.target.value]);
          }}>
          <option value="">+ Rufgruppe …</option>
          {frei.map((r) => (
            <option key={r.rufgruppeId} value={r.rufgruppeId}>
              {wahltext(r)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
