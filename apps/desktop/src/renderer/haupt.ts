// Einstieg des Renderers. Haengt die Anzeige in den Wurzelknoten; ausserhalb
// eines Browsers nicht ausfuehrbar und daher von den Tests ausgenommen.
import { anzeigen } from "./anzeige.js";

const wurzel = document.getElementById("wurzel");
if (wurzel !== null) {
  anzeigen(wurzel, new Date().toISOString().slice(0, 10));
}
