/**
 * Die Kopfzeile der Einheitentabelle: Titel, Schreibknöpfe und Suche.
 *
 * Ist der Einsatz beendet oder archiviert, sind alle Schreibknöpfe gesperrt;
 * der Grund steht im Titel jedes Knopfes und als Hinweis über der Tabelle.
 */

import { Hilfemarke } from "./Hilfemarke.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";

export interface EinheitenkopfEigenschaften {
  readonly gesamtzahl: number;
  readonly markiert: number;
  /** Beendet oder archiviert: nichts darf geschrieben werden. */
  readonly nurLesen: boolean;
  readonly suche: string;
  readonly aufSuche: (suche: string) => void;
  readonly aufMaske: (maske: Einheitenmaske) => void;
}

export function Einheitenkopf({
  gesamtzahl,
  markiert,
  nurLesen,
  suche,
  aufSuche,
  aufMaske,
}: EinheitenkopfEigenschaften): React.JSX.Element {
  /** Titel eines Schreibknopfes: der Grund der Sperre, sonst der übliche Text. */
  const titel = (normal?: string): string | undefined => (nurLesen ? TEXT_NUR_LESEN : normal);
  const knopf = (maske: Einheitenmaske, text: string, gesperrt: boolean, hinweis?: string): React.JSX.Element => (
    <button
      type="button"
      className={maske === "entfernen" ? "entfernen" : undefined}
      disabled={nurLesen || gesperrt}
      title={titel(hinweis)}
      onClick={() => {
        aufMaske(maske);
      }}
    >
      {text}
    </button>
  );
  return (
    <div className="einheitenkopf">
      <h2>
        Einheiten ({String(gesamtzahl)}) <Hilfemarke kennung="einheiten" />
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
      {/* Die Schritte, die auf einer Auswahl arbeiten, stehen zusammen und
          durch einen Strich von Anlegen getrennt: Sie sind gesperrt, solange
          nichts markiert ist, und das soll man sehen, ohne zu lesen. */}
      <span className="trenner" aria-hidden="true" />
      {knopf("verschieben", `Verschieben (${String(markiert)})`, markiert === 0)}
      {knopf("aufteilen", "Aufteilen", markiert !== 1)}
      {knopf("zusammenfuehren", "Zusammenführen", markiert < 2)}
      {knopf(
        "kopieren",
        "Kopieren",
        markiert !== 1,
        `Markierte Zeile als neue, angeforderte Einheit kopieren (${kuerzelText(kuerzel("kopieren") as never)})`,
      )}
      {knopf("entfernen", "Entfernen", markiert !== 1)}
      {knopf("abloesung", "Ablösung anfordern", markiert !== 1)}
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
