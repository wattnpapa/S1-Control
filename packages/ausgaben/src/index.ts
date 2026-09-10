/**
 * `@s1/ausgaben` — Ring 3: die Ausgabeprodukte als HTML.
 *
 * Hier entstehen Druck, Status-Matrix, Auswertung, der HTML-Monitor und die
 * Einsatzakte. Das PDF entsteht ausdruecklich nicht hier, sondern in der
 * Schale ueber `webContents.printToPDF` — deshalb darf dieses Paket Electron
 * nicht importieren, und deshalb liefert jede Vorlage hier eine
 * **Zeichenkette**.
 *
 * Das Paket ist auch ohne `node:` gehalten (`types: []` in der tsconfig). Das
 * ist strenger, als der Ring verlangt, und mit Absicht: Eine Vorlage, die
 * Dateien schreibt, ist eine Vorlage weniger, die sich ohne Dateisystem
 * pruefen laesst. Wer die Bytes ablegt, ist die Schale oder die
 * Kommandozeile.
 */

import { kernVersion } from "@bos/eeb-format";
import { einsatzKennung } from "@s1/domaene";

/** Kopfzeile jeder Ausgabe: welcher Einsatz, welcher Stand, welche Kernfassung. */
export interface Ausgabekopf {
  readonly datum: string;
  readonly einsatzName: string;
  /** Frei formulierte Standangabe, etwa „Stand: 08.09.2026, 14:12“. */
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
    `  <p class="kern">@bos/eeb-format ${htmlMaskieren(kernVersion())}</p>`,
    "</header>",
  ].join("\n");
}

export { dosZeit, liesZip, schreibeZip, textEintrag, type Zipeintrag, type Zipoptionen } from "./zip.js";
export {
  DRUCK_FUSSNOTE,
  DRUCK_STIL,
  druckAlsHtml,
  druckdaten,
  type Druckdaten,
  type Druckoptionen,
  type Druckzeile,
} from "./druck.js";
export {
  STATUS_STIL,
  meldungSchicht,
  meldungStatus,
  statusAlsHtml,
  statusdaten,
  type Organisationszeile,
  type Statusdaten,
  type Verteilungszeile,
} from "./status.js";
export {
  SPALTE_BEREICH,
  auswertungAlsXlsx,
  logFreiAlsXlsx,
  oldenburgAlsXlsx,
  spaltenname,
  xmlMaskieren,
  zellentext,
  type Auswertungsoptionen,
  type Oldenburgoptionen,
} from "./xlsx.js";
export { KOSTEN_FUSSNOTE, KOSTEN_STIL, euro, kostenAlsHtml } from "./kosten.js";
export { LOG_FUSSNOTE, LOG_STIL, logAlsHtml, type Logausgabeoptionen } from "./log.js";
export {
  MONITOR_DATEINAME,
  MONITOR_STIL,
  RELOAD_SEKUNDEN,
  monitorAlsHtml,
  type Monitoroptionen,
} from "./monitor.js";

// Die Störfallkarte (M7.3) — dieselben sechs Fälle wie die Diagnoseansicht,
// gesetzt für Papier.
export {
  MARKE_AKUELI_ANFANG,
  MARKE_AKUELI_ENDE,
  MARKE_ANFANG,
  MARKE_ANSICHTEN_ANFANG,
  MARKE_ANSICHTEN_ENDE,
  MARKE_ENDE,
  MARKE_TASTEN_ANFANG,
  MARKE_TASTEN_ENDE,
  akueliMarkdown,
  ansichtenMarkdown,
  mitHandbuchabschnitten,
  mitStoerfallmatrix,
  stoerfallmatrixMarkdown,
  tastenkarteMarkdown,
  zwischenMarken,
} from "./kurzanleitung.js";

// Die Führungsharke (M8.3) — das Blatt „FüOrg“ der Excel, gezeichnet aus
// Abschnittsbaum und Dienstposten.
export { FUEORG_STIL, harke, harkeAlsHtml, staerkeText, type Harke, type Harkenknoten } from "./fueorg.js";
