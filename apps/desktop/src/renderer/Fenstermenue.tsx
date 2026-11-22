/**
 * Das Fenstermenü „⋯" rechts im Kopfband (Entwurf „Entlastung", 3.1,
 * Option 6e).
 *
 * Hier steht, was zum **Fenster** gehört und selten gebraucht wird: Hilfe,
 * Erscheinungsbild, Stelle, Diagnose, Abmelden, Einsatz schließen. Der
 * Lagemonitor hat ein eigenes Symbol im Kopfband (`Monitorknopf.tsx`).
 * Bis Runde 6 standen Hilfeknopf, vier Themenknöpfe, Abmelden und der Weg zur
 * Einsatzauswahl in der prominentesten Zeile des Fensters; ein
 * Erscheinungsbild wird aber einmal je Gerät gewählt, der Monitor einmal je
 * Einsatz aufgezogen. Nichts fällt weg (Leitsatz 5): Jeder Eintrag ist hier
 * erreichbar, Strg+H bleibt Strg+H.
 *
 * **Ein reines Renderer-Element** aus dem Baustein `Klappmenue.tsx`, den
 * auch die Lage nutzt: Esc und ein Tipp daneben schließen, Pfeiltasten
 * wandern, auf dem Handy ist jeder Eintrag mindestens 44 px hoch
 * (`pointer: coarse` in index.html).
 *
 * **Abmelden bleibt ein Formular** (POST `abmeldung`) und kein Ruf: Die
 * Abmeldung ist ein Seitenwechsel, und das Formular geht auch, wenn der
 * Strom zum Dienst schon tot ist. Relativ, wie die Brücke es für `ruf`
 * erklärt.
 */

import { THEMEN, type Theme } from "../kontrakt/index.js";
import { Klappmenue, type Waehle } from "./Klappmenue.js";
import { kuerzel, kuerzelText } from "./tastatur.js";

const BESCHRIFTUNG: Record<Theme, string> = {
  standard: "Standard",
  dunkel: "Dunkel",
  feld: "Feld",
  nacht: "Nacht",
};

export interface FenstermenueEigenschaften {
  readonly theme: Theme;
  waehleTheme(theme: Theme): void;
  aufHilfe(): void;
  /** Mit offenem Einsatz: „Einsatz schließen“. */
  zurueckZurAuswahl?: (() => void) | undefined;
  /** Nur mit offenem Einsatz in der Betriebsart Führungsstelle. */
  aufDiagnose?: (() => void) | undefined;
  /** Stelle und Handzeichen der Sitzung ändern (KONZEPT-NACHRICHTEN.md Entscheidung 3). */
  aufStelle?: (() => void) | undefined;
  /** Läuft die Web-Schale hinter der Anmeldung (ADR-006)? Dann steht „Abmelden“ da. */
  readonly angemeldet: boolean;
}

export function Fenstermenue(eigenschaften: FenstermenueEigenschaften): React.JSX.Element {
  return (
    <Klappmenue
      huelle="fenstermenue"
      knopf={{
        inhalt: "⋯",
        klasse: "fenstermenueknopf",
        beschriftung: "Fenstermenü",
        titel: "Hilfe, Erscheinungsbild, Diagnose, Einsatz schließen",
      }}
      menue={{ beschriftung: "Fenstermenü", id: "fenstermenue", klasse: "fenstermenueliste" }}
      inhalt={(waehle) => <Menueinhalt {...eigenschaften} waehle={waehle} />}
    />
  );
}

interface Menueinhaltseigenschaften extends FenstermenueEigenschaften {
  readonly waehle: Waehle;
}

function Menueinhalt({
  theme,
  waehleTheme,
  aufHilfe,
  zurueckZurAuswahl,
  aufDiagnose,
  aufStelle,
  angemeldet,
  waehle,
}: Menueinhaltseigenschaften): React.JSX.Element {
  const hilfekuerzel = kuerzelText(kuerzel("hilfe") as never);
  const einsatzOffen = zurueckZurAuswahl !== undefined;
  return (
    <>
      <button type="button" role="menuitem" aria-keyshortcuts="Control+H" onClick={waehle(aufHilfe)}>
        Hilfe und Tastenkarte
        <span className="kurz" aria-hidden="true">
          {hilfekuerzel}
        </span>
      </button>

      <div role="group" aria-label="Erscheinungsbild">
        <span className="titel" aria-hidden="true">
          Erscheinungsbild
        </span>
        {THEMEN.map((kennung) => (
          <button
            key={kennung}
            type="button"
            role="menuitemradio"
            aria-checked={kennung === theme}
            onClick={waehle(() => {
              waehleTheme(kennung);
            })}
          >
            {BESCHRIFTUNG[kennung]}
          </button>
        ))}
      </div>

      {(aufStelle !== undefined || aufDiagnose !== undefined) && <hr />}
      {aufStelle !== undefined && (
        <button type="button" role="menuitem" title="Welche Position dieser Arbeitsplatz im Stab hat, und das Handzeichen" onClick={waehle(aufStelle)}>
          Stelle und Handzeichen …
        </button>
      )}
      {aufDiagnose !== undefined && (
        <button type="button" role="menuitem" onClick={waehle(aufDiagnose)}>
          Diagnose
        </button>
      )}

      {(angemeldet || einsatzOffen) && <hr />}
      {angemeldet && (
        <form method="post" action="abmeldung" role="none">
          <button type="submit" role="menuitem" title="Den gemeinsamen Zugang in diesem Browser beenden">
            Abmelden
          </button>
        </form>
      )}
      {zurueckZurAuswahl !== undefined && (
        <button type="button" role="menuitem" onClick={waehle(zurueckZurAuswahl)}>
          Einsatz schließen
        </button>
      )}
    </>
  );
}
