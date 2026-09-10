/**
 * Das Kopfband (Entwurf „Oberfläche", Option 2a).
 *
 * Es trägt vier Zeilen und in ihnen genau das, was ohne Suchen sichtbar sein
 * muss: den Weg zurück zur Einsatzauswahl, das Wortbild, **Stärke und
 * taktische Zeit** in Zahlen, die man aus zwei Metern liest, und darunter in
 * einer Zeile, ob der Stand aktuell und der Share erreichbar ist.
 *
 * Die Stärke steht hier und **nicht** zusätzlich im Stärkeband: Das Band
 * gliedert sie auf (Führer, Unterführer, Mannschaft), das Kopfband nennt sie
 * als eine Zahl. Zwei Orte für dieselbe Aussage wären ein Widerspruch, sobald
 * einer von beiden hinterherhinkt.
 */

import { THEMEN, type Lagebild, type Theme } from "../kontrakt/index.js";
import { staerkeText, taktischeZeit } from "./formate.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import { alter } from "./Statuszeile.js";

const BESCHRIFTUNG: Record<Theme, string> = {
  standard: "Standard",
  dunkel: "Dunkel",
  feld: "Feld",
  nacht: "Nacht",
};

export interface KopfbandEigenschaften {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
  readonly theme: Theme;
  waehleTheme(theme: Theme): void;
  /** Die Tastenkarte — sie gehört zum Fenster und nicht zu einer Ansicht. */
  aufHilfe(): void;
  /** Der Weg zurück — fehlt er, ist kein Einsatz offen und die Zeile entfällt. */
  zurueckZurAuswahl?: (() => void) | undefined;
}

export function Kopfband({
  lagebild,
  jetzt,
  theme,
  waehleTheme,
  aufHilfe,
  zurueckZurAuswahl,
}: KopfbandEigenschaften): React.JSX.Element {
  // Ohne offenen Einsatz steht hier ein Strich und nicht `0/0/0 // 0`: Eine
  // Null ist eine Aussage über die Lage, und ohne Akte gibt es keine.
  const staerke = lagebild === undefined ? "—" : staerkeText(lagebild.gesamtstaerke);

  return (
    <header className="kopfband">
      {zurueckZurAuswahl !== undefined && (
        <div className="weg">
          <button type="button" className="alsLink" onClick={zurueckZurAuswahl}>
            ‹ Einsatzauswahl
          </button>
        </div>
      )}

      <div className="zeile">
        <span className="marke" aria-hidden="true">
          THW
        </span>
        <h1>S1-Control</h1>

        <span className="kennzahl">
          <span className="label">Stärke</span>
          <span className="wert">{staerke}</span>
        </span>
        <span className="kennzahl">
          <span className="label">Zeit</span>
          <span className="wert">{taktischeZeit(jetzt)}</span>
        </span>

        <button
          type="button"
          className="hilfeknopf"
          onClick={aufHilfe}
          title={`Tastenkarte und Abkürzungen (${kuerzelText(kuerzel("hilfe") as never)})`}
        >
          Hilfe
        </button>

        <div className="themenschalter" role="group" aria-label="Erscheinungsbild">
          {THEMEN.map((kennung) => (
            <button
              key={kennung}
              type="button"
              aria-pressed={kennung === theme}
              onClick={() => waehleTheme(kennung)}
            >
              {BESCHRIFTUNG[kennung]}
            </button>
          ))}
        </div>
      </div>

      <Zustandszeile lagebild={lagebild} jetzt={jetzt} />
    </header>
  );
}

/** Die eine Zeile, die sagt, ob dem Bild zu trauen ist. */
function Zustandszeile({
  lagebild,
  jetzt,
}: {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
}): React.JSX.Element {
  if (lagebild === undefined) {
    return <div className="zustandszeile gestoert">Kein Einsatz geöffnet</div>;
  }
  const wache = lagebild.peers.filter((peer) => !peer.veraltet).length;
  const stand =
    lagebild.standWanduhr === "" ? "keine Ereignisse" : alter(lagebild.standWanduhr, jetzt);

  return (
    <div className={`zustandszeile${lagebild.shareErreichbar ? "" : " gestoert"}`}>
      {lagebild.shareErreichbar ? "✓ " : "⚠ "}
      {lagebild.einsatzName} · Stand {stand} ·{" "}
      {lagebild.shareErreichbar ? "Share erreichbar" : "Share nicht erreichbar"}
      {wache > 0 ? ` — ${String(wache)} weitere Arbeitsplätze` : " — allein am Einsatz"}
    </div>
  );
}
