/**
 * Die Monitorwahl (M3.5).
 *
 * Zwei Knöpfe und eine Liste — mehr ist es nicht, und mehr soll es nicht
 * sein: Der Stärke-Monitor wird einmal zu Beginn eines Einsatzes aufgezogen
 * und danach nicht mehr angefasst.
 *
 * **Die Bildschirme werden erst beim Aufklappen geholt.** Ein Kabel wird
 * mitten im Einsatz umgesteckt; eine Liste, die beim Start geladen wurde,
 * zeigte dann einen Bildschirm, den es nicht mehr gibt. Ihre Kennungen
 * überleben ohnehin keinen Neustart und werden deshalb auch nicht gemerkt.
 *
 * **Im Browser gibt es keine Bildschirme und keinen Ruf an die Schale.** Der
 * Monitor ist dieselbe Seite mit dem Fragment `#monitor`; der Knopf öffnet
 * sie selbst in einem neuen Fenster oder Reiter — wie „Öffnen“ an einer
 * Ausgabedatei. Von dort zieht der Bediener sie auf das Anzeigegerät. Ein
 * zweiter Klick holt das offene Fenster nach vorn, statt ein drittes
 * aufzumachen — dasselbe, was die Electron-Schale mit ihrem Fenster tut.
 */

import { useState } from "react";

import { useLaden } from "./laden.js";

/** Die Adresse des Monitors, relativ: Die Schale kann unter einem Unterpfad liegen. */
const MONITOR_ADRESSE = "#monitor";
/** Ein benanntes Ziel: Der Browser nutzt das offene Fenster wieder, statt ein weiteres aufzumachen. */
const MONITOR_ZIEL = "s1control-monitor";

let monitorFenster: Window | undefined;

/** Öffnet den Monitor im Browser; `false`, wenn der Browser das Fenster blockiert hat. */
export function oeffneMonitorImBrowser(): boolean {
  if (monitorFenster !== undefined && !monitorFenster.closed) {
    monitorFenster.focus();
    return true;
  }
  const fenster = window.open(MONITOR_ADRESSE, MONITOR_ZIEL);
  if (fenster === null) return false;
  monitorFenster = fenster;
  return true;
}

function BrowserMonitorknopf(): React.JSX.Element {
  const melde = useLaden((zustand) => zustand.melde);
  return (
    <span className="monitorwahl">
      <button
        type="button"
        onClick={() => {
          if (!oeffneMonitorImBrowser()) {
            melde("warnung", "Der Browser hat das neue Fenster blockiert. Pop-ups für diese Seite erlauben.");
          }
        }}
        title="Öffnet den Stärke-Monitor in einem neuen Fenster; von dort auf das Anzeigegerät ziehen"
      >
        Stärke-Monitor
      </button>
    </span>
  );
}

export function Monitorwahl(): React.JSX.Element {
  const laden = useLaden();
  const imBrowser = laden.umgebung?.plattform === "web";
  const [offen, setzeOffen] = useState(false);

  if (imBrowser) return <BrowserMonitorknopf />;

  return (
    <span className="monitorwahl">
      <button
        type="button"
        onClick={() => {
          setzeOffen((bisher) => !bisher);
          if (!offen) void laden.ladeBildschirme();
        }}
      >
        Stärke-Monitor
      </button>

      {offen && (
        <span className="monitorwahlliste">
          <button
            type="button"
            onClick={() => {
              void laden.oeffneMonitor();
              setzeOffen(false);
            }}
            title="Ohne Wahl geht der Monitor auf dem zweiten Bildschirm auf"
          >
            Auf dem Zweitbildschirm öffnen
          </button>
          {(laden.bildschirme ?? []).map((bildschirm) => (
            <button
              key={bildschirm.id}
              type="button"
              onClick={() => {
                void laden.oeffneMonitor(bildschirm.id);
                setzeOffen(false);
              }}
            >
              {bildschirm.name} ({bildschirm.breite}×{bildschirm.hoehe}
              {bildschirm.primaer ? ", Hauptbildschirm" : ""})
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              void laden.schliesseMonitor();
              setzeOffen(false);
            }}
          >
            Schließen
          </button>
        </span>
      )}
    </span>
  );
}
