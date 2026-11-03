/**
 * Die Kopfzeile der Einheitentabelle: Titel, Anlegen und Suche.
 *
 * Was einer Auswahl gilt, steht seit Runde 6 („Entlastung", 3.5) nicht mehr
 * hier, sondern in der Auswahlleiste am Fuß der Karte (`Einheitenauswahl.tsx`).
 * Ist der Einsatz beendet oder archiviert, ist Anlegen gesperrt; der Grund
 * steht im Titel und als Hinweis über der Tabelle.
 */

import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";

export interface EinheitenkopfEigenschaften {
  readonly gesamtzahl: number;
  /** Beendet oder archiviert: nichts darf geschrieben werden. */
  readonly nurLesen: boolean;
  readonly suche: string;
  readonly aufSuche: (suche: string) => void;
  readonly aufMaske: (maske: Einheitenmaske) => void;
}

export function Einheitenkopf({
  gesamtzahl,
  nurLesen,
  suche,
  aufSuche,
  aufMaske,
}: EinheitenkopfEigenschaften): React.JSX.Element {
  /** Titel eines Schreibknopfes: der Grund der Sperre, sonst der übliche Text. */
  const titel = (normal?: string): string | undefined => (nurLesen ? TEXT_NUR_LESEN : normal);
  return (
    <div className="einheitenkopf">
      <h2>
        Einheiten ({String(gesamtzahl)})
      </h2>
      <button
        type="button"
        className="haupt"
        disabled={nurLesen}
        onClick={() => {
          aufMaske("anlegen");
        }}
        title={titel(`Einheit anlegen (${kuerzelText(kuerzel("anlegen") as never)})`)}
      >
        Aus Vorlage
      </button>
      <label className="suchfeld">
        Suche
        <input
          id="einheitensuche"
          value={suche}
          placeholder="Einheit, Organisation, Ort, Kennzeichen …"
          onChange={(e) => {
            aufSuche(e.target.value);
          }}
          title={`In die Suche springen (${kuerzelText(kuerzel("suchen") as never)})`}
        />
      </label>
    </div>
  );
}
