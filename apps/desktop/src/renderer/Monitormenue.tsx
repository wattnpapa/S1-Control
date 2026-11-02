/**
 * Das Kontextmenü des Monitors (S4.1, KONZEPT-S4.md §4).
 *
 * Ein eigenes Element im Monitorfenster und **kein Electron-Menü**: Der
 * Monitor läuft auch als Browsertab in der Web-Schale, und dort gäbe es das
 * Menü aus dem Main nicht. Ein Menü, das in beiden Hüllen gleich aussieht,
 * ist auch in beiden gleich zu prüfen (jsdom).
 *
 * Darin: die sechs Ansichten mit Haken an der aktiven und ihrer Taste, der
 * Schalter „Ansichten wechseln alle 20 s", „Vollbild" und „Monitor
 * schließen". Ein Klick daneben oder Esc schließt es.
 */

import { MONITOR_ANSICHTEN } from "../kontrakt/index.js";
import { ANSICHT_TITEL, type Monitorsteuerung } from "./monitorSteuerung.js";

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
        // 420 px: so hoch wird das Menü mit sechs Ansichten im Feldbild (größere
        // Knöpfe); weiter unten geöffnet, rutscht es hoch statt aus dem Fenster.
        style={{ left: `${String(Math.min(ort.x, window.innerWidth - 280))}px`, top: `${String(Math.max(0, Math.min(ort.y, window.innerHeight - 420)))}px` }}
        onClick={(ereignis) => {
          ereignis.stopPropagation();
        }}
      >
        <p className="monitormenuetitel">Ansicht</p>
        {MONITOR_ANSICHTEN.map((ansicht, i) => (
          <button
            key={ansicht}
            type="button"
            role="menuitemradio"
            aria-checked={steuerung.ansicht === ansicht}
            onClick={() => {
              steuerung.waehle(ansicht);
            }}
          >
            <span className="haken" aria-hidden="true">{steuerung.ansicht === ansicht ? "✓" : ""}</span>
            {ANSICHT_TITEL[ansicht]}
            <kbd>{i + 1}</kbd>
          </button>
        ))}
        <hr />
        <button type="button" role="menuitemcheckbox" aria-checked={steuerung.wechsel} onClick={steuerung.schalteWechsel}>
          <span className="haken" aria-hidden="true">{steuerung.wechsel ? "✓" : ""}</span>
          Ansichten wechseln alle 20 s<kbd>R</kbd>
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
        <hr />
        <button type="button" role="menuitem" onClick={steuerung.schliesseMonitor}>
          <span className="haken" aria-hidden="true" />
          Monitor schließen
        </button>
      </div>
    </div>
  );
}
