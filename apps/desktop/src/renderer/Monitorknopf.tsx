/**
 * Der Knopf „Lagemonitor" im Kopfband, links neben dem Fenstermenü „⋯".
 *
 * Bis hierher stand der Monitor als „Stärke-Monitor öffnen …" im
 * Fenstermenü. Der Name passt nicht mehr: Das Zweitfenster zeigt neben der
 * Stärke Verpflegung, die nächsten 24 Stunden, Unterbringung, Schichten,
 * Funkplan und die Stärketafeln. Und weil er der einzige Weg auf die Wand
 * ist, steht er als Symbol im Band, wo man ihn findet, ohne ein Menü
 * aufzuklappen.
 *
 * In Electron klappt darunter die Bildschirmwahl auf, im Browser geht der
 * Monitor direkt in einem neuen Fenster auf (`Monitorwahl.tsx`).
 */

import { useState } from "react";

import { Monitorauswahl, useMonitorstart } from "./Monitorwahl.js";

/** Ein Bildschirm auf dem Fuß, darin drei Balken: eine Anzeige mit mehreren Werten. */
function Monitorsymbol(): React.JSX.Element {
  return (
    <svg className="symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="2.5" y="3.5" width="19" height="13" rx="1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 20.5h6M12 16.5v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 13.5v-3M12 13.5v-6M17 13.5v-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Monitorknopf(): React.JSX.Element {
  const monitor = useMonitorstart();
  const [offen, setzeOffen] = useState(false);
  return (
    <span className="monitorknopfhuelle">
      <button
        type="button"
        className="monitorknopf"
        aria-label="Lagemonitor öffnen"
        aria-haspopup={monitor.imBrowser ? undefined : "dialog"}
        aria-expanded={monitor.imBrowser ? undefined : offen}
        title={
          monitor.imBrowser
            ? "Lagemonitor in einem neuen Fenster öffnen; von dort auf das Anzeigegerät ziehen"
            : "Lagemonitor: wählen, auf welchem Bildschirm er aufgeht"
        }
        // Die Bildschirmwahl schließt bei jedem Tipp daneben; ohne diese
        // Zeile schlösse der Tipp auf den Knopf sie und der Klick öffnete sie gleich wieder.
        onPointerDown={(ereignis) => {
          ereignis.stopPropagation();
        }}
        onClick={() => {
          if (monitor.imBrowser) monitor.oeffneImBrowser();
          else setzeOffen((war) => !war);
        }}
      >
        <Monitorsymbol />
      </button>
      {offen && (
        <Monitorauswahl
          aufSchliessen={() => {
            setzeOffen(false);
          }}
        />
      )}
    </span>
  );
}
