/**
 * Die Monitorwahl (M3.5).
 *
 * Ein Menüeintrag und eine Liste — mehr ist es nicht, und mehr soll es nicht
 * sein: Der Stärke-Monitor wird einmal zu Beginn eines Einsatzes aufgezogen
 * und danach nicht mehr angefasst. Deshalb steht er seit Runde 6
 * („Entlastung", 3.3) im Fenstermenü „⋯" und nicht mehr als Knopf in der
 * Werkzeugzeile der Lage; diese Datei liefert, was der Eintrag braucht.
 *
 * **Die Bildschirme werden erst beim Aufklappen geholt.** Ein Kabel wird
 * mitten im Einsatz umgesteckt; eine Liste, die beim Start geladen wurde,
 * zeigte dann einen Bildschirm, den es nicht mehr gibt. Ihre Kennungen
 * überleben ohnehin keinen Neustart und werden deshalb auch nicht gemerkt.
 *
 * **Im Browser gibt es keine Bildschirme und keinen Ruf an die Schale.** Der
 * Monitor ist dieselbe Seite mit dem Fragment `#monitor`; der Eintrag öffnet
 * sie selbst in einem neuen Fenster oder Reiter — wie „Öffnen“ an einer
 * Ausgabedatei. Von dort zieht der Bediener sie auf das Anzeigegerät. Ein
 * zweiter Klick holt das offene Fenster nach vorn, statt ein drittes
 * aufzumachen — dasselbe, was die Electron-Schale mit ihrem Fenster tut.
 */

import { useEffect } from "react";

import { useLaden } from "./laden.js";
import { useDraussenSchliessen } from "./useDraussenSchliessen.js";

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

export interface Monitorstart {
  /** Im Browser gibt es keine Bildschirmwahl — der Monitor geht direkt auf. */
  readonly imBrowser: boolean;
  /** Öffnet ihn im Browser und meldet ein blockiertes Fenster als Hinweis. */
  oeffneImBrowser(): void;
}

/** Wie der Stärke-Monitor in dieser Schale aufgeht — für jeden Knopf und Menüeintrag dazu. */
export function useMonitorstart(): Monitorstart {
  const imBrowser = useLaden((zustand) => zustand.umgebung?.plattform === "web");
  const melde = useLaden((zustand) => zustand.melde);
  return {
    imBrowser,
    oeffneImBrowser: () => {
      if (!oeffneMonitorImBrowser()) {
        melde("warnung", "Der Browser hat das neue Fenster blockiert. Pop-ups für diese Seite erlauben.");
      }
    },
  };
}

/**
 * Die Bildschirmwahl der Electron-Schale: Zweitbildschirm, ein bestimmter
 * Bildschirm oder den Monitor schließen. Esc und ein Tipp daneben schließen
 * die Wahl, ohne etwas zu tun.
 */
export function Monitorauswahl({ aufSchliessen }: { readonly aufSchliessen: () => void }): React.JSX.Element {
  const laden = useLaden();
  const ladeBildschirme = laden.ladeBildschirme;
  const huelle = useDraussenSchliessen<HTMLDivElement>(true, aufSchliessen);
  useEffect(() => {
    void ladeBildschirme();
  }, [ladeBildschirme]);

  return (
    <div ref={huelle} role="dialog" aria-label="Stärke-Monitor öffnen" className="monitorauswahl">
      <p className="titel">Stärke-Monitor auf …</p>
      <button
        type="button"
        onClick={() => {
          void laden.oeffneMonitor();
          aufSchliessen();
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
            aufSchliessen();
          }}
        >
          {bildschirm.name} ({bildschirm.breite}×{bildschirm.hoehe}
          {bildschirm.primaer ? ", Hauptbildschirm" : ""})
        </button>
      ))}
      <hr />
      <button
        type="button"
        onClick={() => {
          void laden.schliesseMonitor();
          aufSchliessen();
        }}
      >
        Monitor schließen
      </button>
      <button type="button" onClick={aufSchliessen}>
        Abbrechen
      </button>
    </div>
  );
}
