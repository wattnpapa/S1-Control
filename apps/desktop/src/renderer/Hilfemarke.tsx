/**
 * Die Hilfemarke an einer Ansicht (M8.1).
 *
 * Ein Fragezeichen neben der Überschrift, das aufklappt, was diese Ansicht
 * tut, was man zuerst tut und was einen sonst überrascht. Der Text kommt aus
 * `ANSICHTEN` in Ring 2 — derselben Liste, die das Hilfefenster zeigt und das
 * Handbuch druckt.
 *
 * **Aufklappbar und nicht dauerhaft.** Ein Hilfetext, der immer dasteht, ist
 * nach dem zweiten Einsatz Beiwerk, durch das hindurchgesehen wird — und er
 * kostet die Zeilen, die im Einsatz die Lage zeigen sollen.
 *
 * **Keine eigene Zustandshaltung im Store.** Ob eine Hilfe offen ist, geht
 * niemanden außerhalb dieser Komponente etwas an, und schon gar nicht den
 * Worker.
 */

import { useState } from "react";

import { ansichtshilfe, kuerzel, kuerzelText, type Ansichtskennung } from "@s1/domaene";

export interface HilfemarkeEigenschaften {
  readonly kennung: Ansichtskennung;
}

export function Hilfemarke({ kennung }: HilfemarkeEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState(false);
  const hilfe = ansichtshilfe(kennung);

  return (
    <span className="hilfemarke">
      <button
        type="button"
        aria-expanded={offen}
        aria-label={`Hilfe zu ${hilfe.titel}`}
        title={hilfe.wozu}
        onClick={() => {
          setzeOffen((bisher) => !bisher);
        }}
      >
        ?
      </button>
      {offen && (
        <div className="hilfeblase" role="note">
          <p>{hilfe.wozu}</p>
          <p>
            <em>Zuerst:</em> {hilfe.zuerst}
          </p>
          <p>
            <em>Gut zu wissen:</em> {hilfe.ueberraschung}
          </p>
          {hilfe.kuerzel.length > 0 && (
            <p className="hinweistext">
              {hilfe.kuerzel
                .map((name) => {
                  const eintrag = kuerzel(name);
                  return eintrag === undefined ? name : kuerzelText(eintrag);
                })
                .join(" · ")}
            </p>
          )}
        </div>
      )}
    </span>
  );
}
