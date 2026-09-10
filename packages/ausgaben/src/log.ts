/**
 * Das Blatt „Log“ — Logistik Details (M5.1).
 *
 * Vorbild ist `excel-domaenenmodell.md` §4.3. Es ist das Blatt, das die
 * Verpflegung und die Unterbringung plant, und es beantwortet eine Frage, die
 * die Einheitenliste nicht beantwortet: **wie viele wo**. Deshalb steht darin
 * eine Zeile je Bereich und nicht je Einheit — wer 40 Essen an den Deich
 * fährt, interessiert sich nicht dafür, aus welchen vier Gruppen sie kommen.
 *
 * **Die Rechnung steht in Ring 2.** `projektion.logistikblatt` baut die
 * Zeilen; hier entsteht nur die Seite. Das ist dieselbe Trennung wie bei
 * Druck und Status aus M4.1, und sie hat denselben Grund: Käme eine Zahl aus
 * dieser Datei, gäbe es sie zweimal, sobald jemand dieselbe Zahl auch auf dem
 * Bildschirm sehen will.
 *
 * **Warum die Formel im Blatt steht.** Die Vorlage widerspricht sich bei
 * „männlich“: Das Blatt „Status“ rechnet `Gesamt − Weibl.`, dieses hier
 * `H − J − K` (§4.2 gegen §4.3). Gebaut ist die Lesart dieses Blattes (K5),
 * und der Ausdruck nennt sie in seiner Fußzeile. Eine Führungsstelle, die
 * zwei Blätter nebeneinander legt und zwei verschiedene Zahlen sieht, soll
 * nicht raten müssen, welche wie gerechnet ist.
 */

import { projektion, type Zustand } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

/** Die Fußnote, die die Rechnung hinter Spalte „Männl.“ nennt. */
export const LOG_FUSSNOTE = `Männl. ist abgeleitet: ${projektion.LOG_MAENNLICH}. Das Blatt „Status“ der Vorlage rechnet an dieser Stelle abweichend ohne die diversen Kräfte; die Abweichung ist bekannt und noch nicht entschieden.`;

/** Die Kopfzeilen der Schichtspalten, in der Reihenfolge des Blattes. */
const SCHICHT_KOPF: Readonly<Record<string, string>> = {
  FRUEH: "Früh",
  SPAET: "Spät",
  TAG: "Tag",
  NACHT: "Nacht",
};

function zahl(wert: number): string {
  return `<td class="zahl">${String(wert)}</td>`;
}

function zeileAlsHtml(zeile: projektion.Logistikzeile, klasse = ""): string {
  return [
    `      <tr${klasse === "" ? "" : ` class="${klasse}"`}>`,
    `        <th scope="row">${htmlMaskieren(zeile.name)}</th>`,
    ...projektion.LOG_SCHICHTEN.map((schicht) => `        ${zahl(zeile.jeSchicht[schicht] ?? 0)}`),
    `        ${zahl(zeile.gesamt)}`,
    `        ${zahl(zeile.maennlich)}`,
    `        ${zahl(zeile.weiblich)}`,
    `        ${zahl(zeile.divers)}`,
    `        ${zahl(zeile.vegetarisch)}`,
    `        ${zahl(zeile.vegan)}`,
    `        ${zahl(zeile.uebernachtung.m)}`,
    `        ${zahl(zeile.uebernachtung.w)}`,
    `        ${zahl(zeile.uebernachtung.d)}`,
    "      </tr>",
  ].join("\n");
}

export interface Logausgabeoptionen {
  /** Bereiche ohne Kräfte mitführen; die Vorlage blendet sie aus (§4.3). */
  readonly mitLeeren?: boolean;
}

/**
 * Baut das Blatt als HTML.
 *
 * Querformat wie der Druck: Vierzehn Spalten passen auf A4 hoch nicht mehr
 * lesbar nebeneinander, und ein Logistikblatt wird an die Wand geheftet und
 * nicht abgeheftet.
 */
export function logAlsHtml(
  zustand: Zustand,
  kopf: Ausgabekopf,
  optionen: Logausgabeoptionen = {},
): string {
  const blatt = projektion.logistikblatt(
    zustand,
    optionen.mitLeeren === true ? { mitLeeren: true } : {},
  );
  const fuestName =
    typeof zustand.einsatz?.fuestName.wert === "string" ? zustand.einsatz.fuestName.wert : "";

  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>Logistik — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    LOG_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <p class="fuest">${htmlMaskieren(fuestName)}</p>`,
    "  <h2>Logistik Details</h2>",
    '  <table class="log">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col" rowspan="2">Bereich</th>',
    `        <th scope="col" colspan="${String(projektion.LOG_SCHICHTEN.length)}">Schichtbetrieb</th>`,
    '        <th scope="col" rowspan="2">Summe</th>',
    '        <th scope="col" colspan="5">Einsatzkräfte</th>',
    '        <th scope="col" colspan="3">Unterbringung</th>',
    "      </tr>",
    "      <tr>",
    ...projektion.LOG_SCHICHTEN.map(
      (schicht) => `        <th scope="col">${SCHICHT_KOPF[schicht] ?? schicht}</th>`,
    ),
    '        <th scope="col">Männl.</th><th scope="col">Weibl.</th><th scope="col">Div.</th>',
    '        <th scope="col">Veget.</th><th scope="col">Vegan.</th>',
    '        <th scope="col">ÜN (m)</th><th scope="col">ÜN (w)</th><th scope="col">ÜN (d)</th>',
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    ...blatt.zeilen.map((zeile) => zeileAlsHtml(zeile)),
    zeileAlsHtml(blatt.gesamt, "summenzeile"),
    "    </tbody>",
    "  </table>",
    // Die getrennte Zeile 38 der Vorlage. Sie steht **unter** der Summe und
    // nicht in ihr: Angeforderte Kräfte sind noch nicht da, und wer für sie
    // mitkocht, hat am Abend zu viel Essen (§4.3, Z. 36 und 38).
    '  <h2 class="getrennt">Kräfte aus dem Bereich „Angefordert / Anmarsch“</h2>',
    '  <table class="log">',
    "    <tbody>",
    zeileAlsHtml(blatt.angefordert),
    "    </tbody>",
    "  </table>",
    `  <p class="hinweis">${htmlMaskieren(LOG_FUSSNOTE)}</p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export const LOG_STIL = [
  "    @page { size: A4 landscape; margin: 10mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    h2 { font-size: 11pt; margin: 5mm 0 1.5mm; }",
  "    h2.getrennt { margin-top: 7mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    .fuest { margin: 0 0 4mm; }",
  "    table.log { border-collapse: collapse; width: 100%; }",
  "    table.log th, table.log td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; }",
  "    table.log thead th { background: #eee; font-size: 9pt; }",
  '    table.log th[scope="row"] { text-align: left; font-weight: 400; }',
  "    td.zahl { text-align: right; font-variant-numeric: tabular-nums; }",
  "    tr.summenzeile th, tr.summenzeile td { font-weight: 700; background: #e8e8e8; }",
  "    .hinweis { font-size: 8pt; color: #444; margin-top: 4mm; }",
].join("\n");
