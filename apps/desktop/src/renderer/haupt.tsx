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

const wurzel = document.getElementById("wurzel");
if (wurzel !== null) {
  createRoot(wurzel).render(
    <StrictMode>
      <Arbeitsplatz />
    </StrictMode>,
  );
}
