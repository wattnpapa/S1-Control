/**
 * `@s1/ausgaben` — Ring 3: die Ausgabeprodukte als HTML.
 *
 * Hier entstehen Druck, Status-Matrix, Einheitenliste, Auswertung, der
 * HTML-Monitor und die Einsatzakte. Das PDF entsteht ausdruecklich nicht
 * hier, sondern in der Schale ueber `webContents.printToPDF` — deshalb darf
 * dieses Paket Electron nicht importieren, und deshalb liefert jede Vorlage
 * hier eine **Zeichenkette**.
 *
 * Das Paket ist auch ohne `node:` gehalten (`types: []` in der tsconfig). Das
 * ist strenger, als der Ring verlangt, und mit Absicht: Eine Vorlage, die
 * Dateien schreibt, ist eine Vorlage weniger, die sich ohne Dateisystem
 * pruefen laesst. Wer die Bytes ablegt, ist die Schale oder die
 * Kommandozeile.
 */

import { einsatzKennung } from "@s1/domaene";

/** Kopfzeile jeder Ausgabe: welcher Einsatz, welcher Stand, welche Kernfassung. */
export interface Ausgabekopf {
  readonly datum: string;
  readonly einsatzName: string;
  /** Frei formulierte Standangabe, etwa „Stand: 08.09.2026, 14:12“. */
  readonly stand: string;
  /**
   * Additiv (R2-ETB P3-2): die Programmfassung, die die Ausgabe erzeugt hat
   * (`S1_APP_VERSION`, im Worker `programmversion`). Sie ersetzt im Kopf die
   * Zeile „@bos/eeb-format 0.0.0“, die auf einem Beweisstück nichts bedeutete.
   */
  readonly programmversion?: string;
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

/** „S1-Control 2026.11.18“ — ohne bekannte Fassung nur der Name. */
export function programmzeile(programmversion: string | undefined): string {
  const fassung = programmversion?.trim() ?? "";
  return fassung === "" ? "S1-Control" : `S1-Control ${fassung}`;
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
    // R2-ETB P3-2: die Programmfassung statt der Fassung des geteilten Kerns.
    `  <p class="kern">${htmlMaskieren(programmzeile(kopf.programmversion))}</p>`,
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
export { anforderungenAlsHtml, tagebuchAlsHtml, type Tagebuchabschluss } from "./listen.js";
export { lagevortragAlsHtml } from "./lagevortrag.js";
export { papierVordruckAlsHtml } from "./papier.js";
export { bildschirmtauglich } from "./bildschirm.js";
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

// Die Einheitenliste — das Blatt „Stärke“ als Ausdruck: alle Bereiche mit
// Zwischensumme, darunter die Einheiten. Die Papier-Rückfallebene für
// Lagebesprechung und Rechnerausfall.
export { EINHEITENLISTE_STIL, einheitenlisteAlsHtml } from "./einheitenliste.js";
export {
  einheitenlistendaten,
  type Einheitenlistenbereich,
  type Einheitenlistendaten,
  type Einheitenlistenzeile,
} from "./einheitenliste-daten.js";
// Der Funkplan (KONZEPT-FUNKPLAN.md §7) — der Aushang am Platz der Sprechfunker.
export { FUNKPLAN_FUSSNOTE, FUNKPLAN_SPALTEN, FUNKPLAN_STIL, funkplanAlsHtml, type Funkplankopf } from "./funkplan.js";
export { VERSORGUNG_STIL, belegungAlsHtml, bestelllisteAlsHtml, kraftstofflisteAlsHtml, vorausschauAlsHtml } from "./versorgung.js";

export {
  datumZeitGruppe,
  druckbar,
  leererNachrichtenvordruckPdf,
  nachrichtAlsVordruckPdf,
  verteilerZuordnen,
  vordruckBlaetterAus,
  vordruckDatenAus,
  wegvermerkText,
  type Nachrichtendruck,
  type Nachrichtennachweis,
  type Nachrichtensichtung,
  type Nachrichtenverteiler,
  type Nachrichtenvermerk,
  type Nachrichtenvorschlag,
  type Verteilertexte,
  type Vordruckoptionen,
} from "./nachricht.js";

// Die Nachweisung (KONZEPT-NACHRICHTEN.md §7) und die Naht von der Projektionszeile zum Vordruck.
export { NACHWEISUNG_FUSSNOTE, nachweisungAlsHtml, nachweisungMarken, nummernfuss, type Nachweisungsdaten } from "./nachweisung.js";
export { entwurfsdruck, nachrichtendateiname, nachrichtendruckAus, type Nachrichtenentwurf } from "./nachrichtendruck.js";
// Additiv (R2-ETB P2-7): das Handzeichenverzeichnis der Einsatzakte.
export { HANDZEICHEN_FUSSNOTE, handzeichenverzeichnisAlsHtml } from "./handzeichenverzeichnis.js";
// Additiv (ETB P1-2, P1-3, P2-7): ETB-Nummer und Stempel der zurückgezogenen Nachricht.
export { RUECKZUG_WORT, etbVermerk, rueckzugText, zeichneRueckzugsstempel, type Nachrichtenrueckzug } from "./nachrichtstempel.js";
