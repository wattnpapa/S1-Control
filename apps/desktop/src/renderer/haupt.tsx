/**
 * Einstieg des Renderers.
 *
 * Er tut drei Dinge und hoert dann auf: die Bruecke aus `window` einsetzen,
 * React an den Wurzelknoten haengen, fertig. Ausserhalb eines Browsers nicht
 * ausfuehrbar und deshalb von den Tests ausgenommen — was hier zu pruefen
 * waere, prueft `Arbeitsplatz.test.tsx` an der Komponente selbst.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Arbeitsplatz } from "./Arbeitsplatz.js";
import { MonitorFenster } from "./MonitorFenster.js";

/**
 * Welches Fenster ist das hier?
 *
 * Der Staerke-Monitor (M3.5) ist ein zweites `BrowserWindow` auf **dieselbe**
 * Seite, geladen mit dem Fragment `#monitor`. Ein eigener Einstiegspunkt
 * waere ein zweites Buendel fuer dieselben zwanzig Zeilen — und ein zweiter
 * Ort, an dem die Bruecke eingesetzt wird.
 */
const istMonitor = globalThis.location.hash === "#monitor";

const wurzel = document.getElementById("wurzel");
if (wurzel !== null) {
  createRoot(wurzel).render(
    <StrictMode>{istMonitor ? <MonitorFenster /> : <Arbeitsplatz />}</StrictMode>,
  );
}
