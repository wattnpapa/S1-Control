/**
 * `@s1/ausgaben` — Ring 3: die Ausgabeprodukte als HTML.
 *
 * Hier entstehen ab M4 Druck, Status-Matrix, Logistik, FueOrg, Auswertung und
 * der HTML-Monitor. Das PDF entsteht ausdruecklich nicht hier, sondern in der
 * Schale ueber `webContents.printToPDF` — deshalb darf dieses Paket Electron
 * nicht importieren.
 */

import { kernVersion } from "@bos/kern";
import { einsatzKennung } from "@s1/domaene";

/** Kopfzeile jeder Ausgabe: welcher Einsatz, welcher Stand, welche Kernfassung. */
export interface Ausgabekopf {
  readonly datum: string;
  readonly einsatzName: string;
  /** Frei formulierte Standangabe, etwa „Stand: 08.09.2026, 14:12". */
  readonly stand: string;
}

/** Maskiert die fuenf in HTML bedeutsamen Zeichen. */
export function htmlMaskieren(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Rendert den Seitenkopf einer Ausgabe.
 *
 * Platzhalter mit echtem Nutzen: er belegt, dass dieses Paket sowohl den
 * Fachkern als auch den geteilten Kern erreicht, und legt die Maskierung fest,
 * bevor die erste richtige Vorlage entsteht.
 */
export function kopfAlsHtml(kopf: Ausgabekopf): string {
  const kennung = einsatzKennung(kopf.datum, kopf.einsatzName);
  return [
    '<header class="ausgabe-kopf">',
    `  <h1>${htmlMaskieren(kopf.einsatzName)}</h1>`,
    `  <p class="kennung">${htmlMaskieren(kennung.ordner)}</p>`,
    `  <p class="stand">${htmlMaskieren(kopf.stand)}</p>`,
    `  <p class="kern">@bos/kern ${htmlMaskieren(kernVersion())}</p>`,
    "</header>",
  ].join("\n");
}
