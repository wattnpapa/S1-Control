/**
 * Das Namensfeld der Rufgruppe mit Vorschlägen aus dem Standard-Fleetmapping
 * (`fleetmapping/`): Tippen filtert, die Liste bleibt kurz.
 *
 * **Abweichende Namen bleiben möglich.** Der getippte Text gilt immer; ein
 * Vorschlag wird nur übernommen, wenn man ihn anklickt oder mit Pfeil auf/ab
 * markiert und Enter drückt. Ohne markierten Vorschlag fällt Enter zur Maske
 * durch und bestätigt den Text wie getippt. Steht der Text nicht im
 * Fleetmapping, sagt ein Hinweis, dass es eine eigene Rufgruppe ist.
 */

import { useState } from "react";

import { fleetmapEintrag, ordnertext, sucheRufgruppen, type Fleetmapeintrag } from "./fleetmapping/index.js";

export interface RufgruppenvorschlagEigenschaften {
  readonly wert: string;
  readonly aufAenderung: (name: string) => void;
  /** Ein Vorschlag wurde gewählt (Klick oder Pfeil und Enter). */
  readonly aufWahl: (eintrag: Fleetmapeintrag) => void;
}

const LISTEN_ID = "rufgruppenvorschlaege";

function zeilenmerkmal(eintrag: Fleetmapeintrag): string {
  const teile = [ordnertext(eintrag)];
  if (eintrag.kurzwahl !== undefined) teile.push(`Kurzwahl ${String(eintrag.kurzwahl)}`);
  if (eintrag.laender.length < 5) teile.push(`nur LV ${eintrag.laender.join(", ")}`);
  return teile.join(" · ");
}

export function Rufgruppenvorschlag({ wert, aufAenderung, aufWahl }: RufgruppenvorschlagEigenschaften): React.JSX.Element {
  // -1: nichts markiert, Enter bestätigt die Maske mit dem getippten Text.
  const [markiert, setzeMarkiert] = useState(-1);
  const [zu, setzeZu] = useState(false);
  const treffer = sucheRufgruppen(wert);
  const offen = !zu && treffer.length > 0;
  const marke = Math.min(markiert, treffer.length - 1);
  const gewaehlt = marke >= 0 ? treffer[marke] : undefined;

  function waehle(eintrag: Fleetmapeintrag): void {
    aufWahl(eintrag);
    setzeMarkiert(-1);
    setzeZu(true);
  }

  function aufTaste(ereignis: React.KeyboardEvent<HTMLInputElement>): void {
    if (ereignis.key === "Escape" && offen) {
      // Erst die Liste schließen; ein zweites Esc verwirft die Maske.
      ereignis.preventDefault();
      ereignis.stopPropagation();
      setzeZu(true);
      return;
    }
    if (ereignis.key === "ArrowDown" || ereignis.key === "ArrowUp") {
      ereignis.preventDefault();
      setzeZu(false);
      const schritt = ereignis.key === "ArrowDown" ? 1 : -1;
      setzeMarkiert(Math.min(Math.max(marke + schritt, -1), treffer.length - 1));
      return;
    }
    if (ereignis.key === "Enter" && offen && gewaehlt !== undefined) {
      ereignis.preventDefault();
      waehle(gewaehlt);
    }
  }

  const bekannt = fleetmapEintrag(wert) !== undefined;
  return (
    <div className="vorlagenwahl">
      <label>
        Name
        <input
          value={wert}
          role="combobox"
          aria-expanded={offen}
          aria-controls={LISTEN_ID}
          aria-autocomplete="list"
          aria-activedescendant={gewaehlt === undefined ? undefined : `rufgruppe-${gewaehlt.name}`}
          autoComplete="off"
          placeholder="z. B. T_LVNW-1 oder frei eintragen"
          onChange={(e) => {
            aufAenderung(e.target.value);
            setzeMarkiert(-1);
            setzeZu(false);
          }}
          onKeyDown={aufTaste}
        />
      </label>
      {offen && (
        <ul id={LISTEN_ID} className="vorlagenliste" role="listbox" aria-label="Rufgruppen aus dem Fleetmapping">
          {treffer.map((eintrag, index) => (
            <li
              key={eintrag.name}
              id={`rufgruppe-${eintrag.name}`}
              role="option"
              aria-selected={eintrag.name === wert.trim()}
              data-markiert={index === marke ? "ja" : undefined}
              onMouseDown={(e) => {
                // Der Fokus bleibt im Feld, damit Enter danach bestätigt.
                e.preventDefault();
              }}
              onClick={() => {
                waehle(eintrag);
              }}
            >
              <strong>{eintrag.name}</strong>
              <span className="vorlagenmerkmal">{zeilenmerkmal(eintrag)}</span>
            </li>
          ))}
        </ul>
      )}
      {wert.trim() !== "" && !bekannt && (
        <p className="hinweistext">Nicht im Fleetmapping: wird als eigene Rufgruppe mit diesem Namen angelegt.</p>
      )}
    </div>
  );
}
