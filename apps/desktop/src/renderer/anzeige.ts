/**
 * Renderer-Logik von S1-Control v2 — Ring 4, DOM-Seite.
 *
 * Bewusst ohne React: das Arbeitspaket M-0.3 verlangt ein leeres Fenster,
 * kein Oberflaechengeruest. Der Zustand-Store und React 19 kommen mit M2.2.
 * Was hier steht, ist der Nachweis, dass der Renderer unter jsdom testbar ist
 * und den Fachkern erreicht.
 */

import { einsatzKennung } from "@s1/domaene";

/** Beschriftung des leeren Fensters. */
export function begruessung(datum: string): string {
  return `S1-Control v2 — Geruest (${einsatzKennung(datum, "Kein Einsatz geoeffnet").slug})`;
}

/** Haengt die Beschriftung in den Wurzelknoten. */
export function anzeigen(wurzel: HTMLElement, datum: string): void {
  const absatz = wurzel.ownerDocument.createElement("p");
  absatz.textContent = begruessung(datum);
  wurzel.replaceChildren(absatz);
}
