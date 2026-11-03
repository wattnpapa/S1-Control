/**
 * Die Kopfzeile der Einheitenkarte (Entwurf „Entlastung", 3.5, Optionen
 * 6b, 6e): „Einheiten" mit Zahl, der Hauptknopf „Einheit anlegen ▾", die
 * Suche und „Spalten ▾". Das ist alles über der Filterzeile.
 *
 * Was einer Auswahl gilt, steht in der Auswahlleiste am Fuß der Karte
 * (`Einheitenauswahl.tsx`). „Erfassungsbogen einlesen" stand bis Runde 6 in
 * der Werkzeugzeile der Lage und ist jetzt ein Weg des Anlegens: Ein Bogen
 * wird zu einer Einheit. Ist der Einsatz beendet oder archiviert, ist
 * Anlegen gesperrt; der Grund steht im Titel und als Hinweis über der
 * Tabelle.
 */

import { Klappmenue, Menueeintrag } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { Spaltenmenue } from "./Spaltenmenue.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";
import type { Spaltenwahl } from "./useSpaltenwahl.js";

export interface EinheitenkopfEigenschaften {
  /** „20" oder „6 in EA 1 Deich Nord". */
  readonly zahl: string;
  /** Beendet oder archiviert: nichts darf geschrieben werden. */
  readonly nurLesen: boolean;
  readonly suche: { readonly wert: string; readonly aufSuche: (suche: string) => void };
  readonly aufMaske: (maske: Einheitenmaske) => void;
  /** Öffnet den Scanner der Lage; fehlt er, fehlt der Eintrag. */
  readonly aufScanner?: (() => void) | undefined;
  readonly spalten: Spaltenwahl;
}

function kurz(name: string): string {
  return kuerzelText(kuerzel(name) as never);
}

export function Einheitenkopf({ zahl, nurLesen, suche, aufMaske, aufScanner, spalten }: EinheitenkopfEigenschaften): React.JSX.Element {
  return (
    <>
      <div className="einheitenkopf">
        <h2>
          Einheiten <small>{zahl}</small>
        </h2>
        <Anlegeknopf nurLesen={nurLesen} aufMaske={aufMaske} aufScanner={aufScanner} />
        <label className="suchfeld">
          Suche
          <input
            id="einheitensuche"
            value={suche.wert}
            placeholder="Einheit, Organisation, Ort, Kennzeichen …"
            onChange={(e) => {
              suche.aufSuche(e.target.value);
            }}
            title={`In die Suche springen (${kurz("suchen")})`}
          />
        </label>
        <Spaltenmenue wahl={spalten} />
      </div>
      {nurLesen && (
        <p className="sperrhinweis" role="status">
          {TEXT_NUR_LESEN}: Status ändern, Anlegen, Verschieben und Entfernen sind gesperrt.
        </p>
      )}
    </>
  );
}

type AnlegeknopfEigenschaften = Pick<EinheitenkopfEigenschaften, "nurLesen" | "aufMaske" | "aufScanner">;

/** Der Hauptknopf der Karte: aus Vorlage, ohne Vorlage oder aus dem Erfassungsbogen. */
function Anlegeknopf({ nurLesen, aufMaske, aufScanner }: AnlegeknopfEigenschaften): React.JSX.Element {
  return (
    <Klappmenue
      huelle="anlegemenue"
      knopf={{
        inhalt: (
          <>
            Einheit anlegen <span aria-hidden="true">▾</span>
          </>
        ),
        klasse: "haupt",
        gesperrt: nurLesen,
        titel: nurLesen
          ? TEXT_NUR_LESEN
          : `Einheit anlegen: aus Vorlage (${kurz("anlegen")}), ohne Vorlage oder aus dem Erfassungsbogen (${kurz("eeb")})`,
      }}
      menue={{ beschriftung: "Einheit anlegen", id: "anlegemenue" }}
      inhalt={(waehle) => (
        <>
          <Menueeintrag text="Aus Vorlage …" kurz={kurz("anlegen")} aufWahl={waehle(() => { aufMaske("anlegen"); })} />
          <Menueeintrag
            text="Ohne Vorlage"
            titel="Freie Zeile: Bezeichnung, Organisation, Ebene und Stärke selbst eintragen"
            aufWahl={waehle(() => { aufMaske("anlegenFrei"); })}
          />
          {aufScanner !== undefined && <hr />}
          {aufScanner !== undefined && (
            <Menueeintrag text="Erfassungsbogen einlesen …" kurz={kurz("eeb")} aufWahl={waehle(aufScanner)} />
          )}
        </>
      )}
    />
  );
}
