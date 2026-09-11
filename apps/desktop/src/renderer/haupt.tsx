/**
 * Einstieg des Renderers.
 *
 * Er tut drei Dinge und hoert dann auf: die Bruecke einsetzen, React an den
 * Wurzelknoten haengen, fertig. Ausserhalb eines Browsers nicht ausfuehrbar
 * und deshalb von den Tests ausgenommen — was hier zu pruefen waere, prueft
 * `Arbeitsplatz.test.tsx` an der Komponente selbst.
 *
 * Welche Bruecke, entscheidet das Fenster: Hat das Preload `window.s1`
 * hinterlegt, laeuft der Renderer in Electron; sonst ist er von der
 * Web-Schale ausgeliefert worden (ADR-005) und spricht ueber `fetch` und
 * `EventSource` mit ihr. Der Rest des Renderers sieht den Unterschied nicht.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Arbeitsplatz } from "./Arbeitsplatz.js";
import { MonitorFenster } from "./MonitorFenster.js";
import { setzeBruecke } from "./bruecke.js";
import { webBruecke } from "./webBruecke.js";
import { BRUECKE } from "../kontrakt/index.js";

if ((globalThis as Record<string, unknown>)[BRUECKE] === undefined) {
  setzeBruecke(webBruecke());
}

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
