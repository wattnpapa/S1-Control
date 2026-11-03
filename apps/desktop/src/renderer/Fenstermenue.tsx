/**
 * Das Fenstermenü „⋯" rechts im Kopfband (Entwurf „Entlastung", 3.1,
 * Option 6e).
 *
 * Hier steht, was zum **Fenster** gehört und selten gebraucht wird: Hilfe,
 * Erscheinungsbild, Stärke-Monitor, Diagnose, Abmelden, Einsatz schließen.
 * Bis Runde 6 standen Hilfeknopf, vier Themenknöpfe, Abmelden und der Weg zur
 * Einsatzauswahl in der prominentesten Zeile des Fensters; ein
 * Erscheinungsbild wird aber einmal je Gerät gewählt, der Monitor einmal je
 * Einsatz aufgezogen. Nichts fällt weg (Leitsatz 5): Jeder Eintrag ist hier
 * erreichbar, Strg+H bleibt Strg+H.
 *
 * **Ein reines Renderer-Element.** Electron hätte ein natives Menü, die
 * Web-Schale nicht; zwei Menüs mit zwei Bedienungen wären genau die Drift,
 * die der Entwurf vermeiden soll. Das Menü ist deshalb ein `<button
 * aria-haspopup="menu">` mit einer Liste `role="menu"`: Esc und ein Tipp
 * daneben schließen, Pfeiltasten wandern, auf dem Handy ist jeder Eintrag
 * mindestens 44 px hoch (`pointer: coarse` in index.html).
 *
 * **Abmelden bleibt ein Formular** (POST `abmeldung`) und kein Ruf: Die
 * Abmeldung ist ein Seitenwechsel, und das Formular geht auch, wenn der
 * Strom zum Dienst schon tot ist. Relativ, wie die Brücke es für `ruf`
 * erklärt.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { THEMEN, type Theme } from "../kontrakt/index.js";
import { Monitorauswahl, useMonitorstart } from "./Monitorwahl.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import { useDraussenSchliessen } from "./useDraussenSchliessen.js";

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
  /** Mit offenem Einsatz: Stärke-Monitor und „Einsatz schließen“. */
  zurueckZurAuswahl?: (() => void) | undefined;
  /** Nur mit offenem Einsatz in der Betriebsart Führungsstelle. */
  aufDiagnose?: (() => void) | undefined;
  /** Läuft die Web-Schale hinter der Anmeldung (ADR-006)? Dann steht „Abmelden“ da. */
  readonly angemeldet: boolean;
}

/** Pfeiltasten, Pos1 und Ende wandern zwischen den Einträgen; am Ende geht es oben weiter. */
function wandere(liste: HTMLElement, taste: string): boolean {
  const eintraege = Array.from(liste.querySelectorAll<HTMLElement>("[role^='menuitem']"));
  if (eintraege.length === 0) return false;
  const hier = eintraege.indexOf(document.activeElement as HTMLElement);
  const ziel: Record<string, number> = {
    ArrowDown: (hier + 1) % eintraege.length,
    ArrowUp: (hier - 1 + eintraege.length) % eintraege.length,
    Home: 0,
    End: eintraege.length - 1,
  };
  const stelle = ziel[taste];
  if (stelle === undefined) return false;
  eintraege[stelle]?.focus();
  return true;
}

export function Fenstermenue(eigenschaften: FenstermenueEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState(false);
  const [monitorwahl, setzeMonitorwahl] = useState(false);
  const knopf = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLDivElement>(null);
  const schliesse = useCallback(() => {
    setzeOffen(false);
  }, []);
  const huelle = useDraussenSchliessen<HTMLDivElement>(offen, schliesse);

  // Beim Öffnen steht der Fokus auf dem ersten Eintrag (WAI-ARIA, Menü-Knopf):
  // Wer mit der Tastatur kommt, kann sofort mit den Pfeilen wandern.
  useEffect(() => {
    if (offen) liste.current?.querySelector<HTMLElement>("[role^='menuitem']")?.focus();
  }, [offen]);

  /** Führt einen Eintrag aus und schließt das Menü. */
  const waehle = (tue: () => void) => () => {
    setzeOffen(false);
    tue();
  };

  return (
    <div ref={huelle} className="fenstermenue">
      <button
        ref={knopf}
        type="button"
        className="fenstermenueknopf"
        aria-haspopup="menu"
        aria-expanded={offen}
        aria-controls={offen ? "fenstermenue" : undefined}
        aria-label="Fenstermenü"
        title="Hilfe, Erscheinungsbild, Stärke-Monitor, Diagnose, Einsatz schließen"
        onClick={() => {
          setzeOffen(!offen);
        }}
      >
        ⋯
      </button>
      {offen && (
        <div
          ref={liste}
          id="fenstermenue"
          role="menu"
          aria-label="Fenstermenü"
          className="fenstermenueliste"
          onKeyDown={(ereignis) => {
            if (ereignis.key === "Escape") {
              setzeOffen(false);
              knopf.current?.focus();
              return;
            }
            if (liste.current !== null && wandere(liste.current, ereignis.key)) ereignis.preventDefault();
          }}
        >
          <Menueinhalt {...eigenschaften} waehle={waehle} aufMonitor={() => setzeMonitorwahl(true)} />
        </div>
      )}
      {monitorwahl && (
        <Monitorauswahl
          aufSchliessen={() => {
            setzeMonitorwahl(false);
          }}
        />
      )}
    </div>
  );
}

interface Menueinhaltseigenschaften extends FenstermenueEigenschaften {
  waehle(tue: () => void): () => void;
  /** Öffnet die Bildschirmwahl der Electron-Schale. */
  aufMonitor(): void;
}

function Menueinhalt({
  theme,
  waehleTheme,
  aufHilfe,
  zurueckZurAuswahl,
  aufDiagnose,
  angemeldet,
  waehle,
  aufMonitor,
}: Menueinhaltseigenschaften): React.JSX.Element {
  const monitor = useMonitorstart();
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

      {einsatzOffen && <hr />}
      {einsatzOffen && (
        <button
          type="button"
          role="menuitem"
          title={
            monitor.imBrowser
              ? "Öffnet den Stärke-Monitor in einem neuen Fenster; von dort auf das Anzeigegerät ziehen"
              : "Wählt den Bildschirm, auf dem der Stärke-Monitor aufgeht"
          }
          onClick={waehle(monitor.imBrowser ? monitor.oeffneImBrowser : aufMonitor)}
        >
          Stärke-Monitor öffnen …
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
