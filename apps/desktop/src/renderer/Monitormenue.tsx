/**
 * Das Kontextmenü des Monitors (S4.1, KONZEPT-S4.md §4).
 *
 * Ein eigenes Element im Monitorfenster und **kein Electron-Menü**: Der
 * Monitor läuft auch als Browsertab in der Web-Schale, und dort gäbe es das
 * Menü aus dem Main nicht. Ein Menü, das in beiden Hüllen gleich aussieht,
 * ist auch in beiden gleich zu prüfen (jsdom).
 *
 * Darin: die Ansichten nach Sachgebiet mit Haken an der aktiven und ihrer
 * Taste (1–9, 0; weitere über Pfeil links/rechts), die Wahl des Wechsels (aus, alle, je Sachgebiet),
 * „Vollbild" und „Monitor schließen". Ein Klick daneben oder Esc schließt es.
 */

import { ANSICHT_TITEL, type Monitorsteuerung } from "./monitorSteuerung.js";
import { GRUPPE_TITEL, ansichtenDerGruppe, belegteGruppen, tasteDerAnsicht, wechselmodi, type Wechselmodus } from "./monitorWechsel.js";

/** So hoch wird das Menü im Feldbild (größere Knöpfe); weiter unten geöffnet, rutscht es hoch. */
const MENUEHOEHE = 900;

function moduseintrag(modus: Wechselmodus): string {
  if (modus === "aus") return "Kein Wechsel";
  if (modus === "alle") return "Alle Ansichten";
  return `Nur ${GRUPPE_TITEL[modus]}`;
}

function Haken({ an }: { readonly an: boolean }): React.JSX.Element {
  return (
    <span className="haken" aria-hidden="true">
      {an ? "✓" : ""}
    </span>
  );
}

function Ansichtswahl({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element {
  return (
    <div role="group" aria-label="Ansicht">
      {belegteGruppen(steuerung.besucher).map((gruppe) => (
        <div key={gruppe} role="group" aria-label={GRUPPE_TITEL[gruppe]}>
          <p className="monitormenuetitel">{GRUPPE_TITEL[gruppe]}</p>
          {ansichtenDerGruppe(gruppe, steuerung.besucher).map((ansicht) => (
            <button
              key={ansicht}
              type="button"
              role="menuitemradio"
              aria-checked={steuerung.ansicht === ansicht}
              onClick={() => {
                steuerung.waehle(ansicht);
              }}
            >
              <Haken an={steuerung.ansicht === ansicht} />
              {ANSICHT_TITEL[ansicht]}
              {tasteDerAnsicht(ansicht) !== undefined && <kbd>{tasteDerAnsicht(ansicht)}</kbd>}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function Wechselwahl({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element {
  return (
    <div role="group" aria-label="Wechsel">
      <p className="monitormenuetitel">Ansichten wechseln alle 20 s</p>
      {wechselmodi(steuerung.besucher).map((modus) => (
        <button
          key={modus}
          type="button"
          role="menuitemradio"
          aria-checked={steuerung.modus === modus}
          onClick={() => {
            steuerung.setzeModus(modus);
          }}
        >
          <Haken an={steuerung.modus === modus} />
          {moduseintrag(modus)}
          {modus === "alle" && <kbd>R</kbd>}
        </button>
      ))}
    </div>
  );
}

export function Monitormenue({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element | null {
  const ort = steuerung.menue;
  if (ort === undefined) return null;
  return (
    <div
      className="monitormenuegrund"
      onClick={steuerung.schliesseMenue}
      onContextMenu={(ereignis) => {
        ereignis.preventDefault();
        steuerung.schliesseMenue();
      }}
    >
      <div
        className="monitormenue"
        role="menu"
        aria-label="Monitor"
        style={{ left: `${String(Math.min(ort.x, window.innerWidth - 280))}px`, top: `${String(Math.max(0, Math.min(ort.y, window.innerHeight - MENUEHOEHE)))}px` }}
        onClick={(ereignis) => {
          ereignis.stopPropagation();
        }}
      >
        <Ansichtswahl steuerung={steuerung} />
        <hr />
        <Wechselwahl steuerung={steuerung} />
        <hr />
        <button type="button" role="menuitemcheckbox" aria-checked={steuerung.besucher} onClick={steuerung.schalteBesucher}>
          <Haken an={steuerung.besucher} />
          Besucheransicht · nur Kräftezahlen<kbd>B</kbd>
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            steuerung.schliesseMenue();
            steuerung.schalteVollbild();
          }}
        >
          <span className="haken" aria-hidden="true" />
          Vollbild<kbd>F11</kbd>
        </button>
        <button type="button" role="menuitem" onClick={steuerung.schliesseMonitor}>
          <span className="haken" aria-hidden="true" />
          Monitor schließen
        </button>
      </div>
    </div>
  );
}
