/**
 * Hover-Leiste und Punkte des Monitors (S4.1, KONZEPT-S4.md §4).
 *
 * Die Leiste erscheint bei Mausbewegung oben mit den Ansichten als Reiter und
 * verschwindet nach drei Sekunden ohne Bewegung: Auf einem Monitor an der
 * Wand ist die Maus meist nicht da; die Leiste ist für den Moment, in dem
 * jemand mit dem Laptop danebensteht.
 *
 * Die Punkte rechts unten nennen die Ansichten, die aktive gefüllt; bei
 * eingeschaltetem Wechsel ist die nächste umrandet hervorgehoben — wer
 * hinsieht, weiß, was kommt.
 */

import { MONITOR_ANSICHTEN } from "../kontrakt/index.js";
import { ANSICHT_TITEL, naechsteAnsicht, type Monitorsteuerung } from "./monitorSteuerung.js";

export function Monitorleiste({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element | null {
  if (!steuerung.leiste) return null;
  return (
    <nav className="monitorleiste" aria-label="Monitoransichten">
      {MONITOR_ANSICHTEN.map((ansicht) => (
        <button
          key={ansicht}
          type="button"
          aria-pressed={steuerung.ansicht === ansicht}
          onClick={() => {
            steuerung.waehle(ansicht);
          }}
        >
          {ANSICHT_TITEL[ansicht]}
        </button>
      ))}
      <span className="monitorleistefrei" />
      <button type="button" aria-pressed={steuerung.wechsel} onClick={steuerung.schalteWechsel}>
        Wechsel: {steuerung.wechsel ? (steuerung.gehalten ? "gehalten" : "an") : "aus"}
      </button>
      <button
        type="button"
        aria-label="Menü"
        onClick={(ereignis) => {
          steuerung.oeffneMenue(ereignis.clientX, ereignis.clientY + 12);
        }}
      >
        ⋮
      </button>
    </nav>
  );
}

export function Monitorpunkte({ steuerung }: { readonly steuerung: Monitorsteuerung }): React.JSX.Element {
  const naechste = steuerung.wechsel ? naechsteAnsicht(steuerung.ansicht) : undefined;
  return (
    <ol className="monitorpunkte" aria-label="Ansichten">
      {MONITOR_ANSICHTEN.map((ansicht) => (
        <li
          key={ansicht}
          title={ANSICHT_TITEL[ansicht]}
          className={ansicht === steuerung.ansicht ? "aktiv" : ansicht === naechste ? "naechste" : undefined}
          aria-current={ansicht === steuerung.ansicht ? "true" : undefined}
        />
      ))}
    </ol>
  );
}
