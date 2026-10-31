/**
 * Die Einheitenliste als HTML — der Ausdruck des Blatts „Stärke“.
 *
 * Die Zahlen und Zellen entstehen in `einheitenliste-daten.ts`; hier wird nur
 * gesetzt. Die Trennung ist dieselbe wie bei Druck und Status, und aus
 * demselben Grund: Wer die Seite anders setzt, soll die Zahlen nicht
 * mitändern können.
 *
 * Drei Festlegungen für Papier:
 *
 *  1. **Quer, klein, eine Tabelle.** Sechzehn Spalten passen hochkant nicht
 *     lesbar nebeneinander; die Excel druckt das Blatt ebenfalls quer.
 *  2. **Der Tabellenkopf wiederholt sich auf jeder Seite** (`thead`), und
 *     eine Zeile bricht nie über zwei Seiten. Auf Seite 3 einer Liste ohne
 *     Kopf rät man, welche Zahl Fü und welche He ist.
 *  3. **Eine Bereichskopfzeile bleibt bei ihren Einheiten.** Steht sie allein
 *     unten auf einer Seite, liest sich die nächste Seite, als gehörten ihre
 *     Einheiten zum vorigen Bereich.
 */

import { kennzahlen } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";
import type {
  Einheitenlistenbereich,
  Einheitenlistendaten,
  Einheitenlistenzeile,
} from "./einheitenliste-daten.js";

/** Die Spaltenzahl der Tabelle — Kopf, Bereichs- und Leerzeilen müssen sie teilen. */
const SPALTEN = 16;

/** Wie viele Spalten vor der Stärke stehen; die Bereichskopfzeile fasst sie zusammen. */
const VOR_DER_STAERKE = 11;

/** Mehrzeilige Zellen (Geräte, Aufträge) behalten ihre Umbrüche auf dem Papier. */
function mehrzeilig(text: string): string {
  return htmlMaskieren(text).replace(/\n/g, "<br />");
}

function zelle(inhalt: string | number, klasse = ""): string {
  const text = typeof inhalt === "number" ? String(inhalt) : mehrzeilig(inhalt);
  return klasse === "" ? `<td>${text}</td>` : `<td class="${klasse}">${text}</td>`;
}

function einheitAlsHtml(zeile: Einheitenlistenzeile): string {
  return [
    `      <tr class="einheit${zeile.klasse === "erwartet" ? " erwartet" : ""}">`,
    `        ${zelle(zeile.nr, "nr")}`,
    `        ${zelle(zeile.fuest)}`,
    `        ${zelle(zeile.einheit, "name")}`,
    `        ${zelle(zeile.organisation)}`,
    `        ${zelle(zeile.herkunft)}`,
    `        ${zelle(zeile.ebene)}`,
    `        ${zelle(zeile.erreichbarkeit)}`,
    `        ${zelle(zeile.auftraege)}`,
    `        ${zelle(zeile.geraete)}`,
    `        ${zelle(zeile.klasse === "erwartet" ? `${zeile.status} (erwartet)` : zeile.status)}`,
    `        ${zelle(zeile.schicht)}`,
    `        ${zelle(zeile.staerke.fuehrer, "zahl")}`,
    `        ${zelle(zeile.staerke.unterfuehrer, "zahl")}`,
    `        ${zelle(zeile.staerke.mannschaft, "zahl")}`,
    `        ${zelle(zeile.gesamt, "zahl gesamt")}`,
    `        ${zelle(zeile.eingetroffen, "zeit")}`,
    "      </tr>",
  ].join("\n");
}

function anzahlText(anzahl: number): string {
  return anzahl === 1 ? "1 Einheit" : `${String(anzahl)} Einheiten`;
}

/**
 * Die Kopfzeile eines Bereichs mit seiner Zwischensumme.
 *
 * Ein Bereich, der nicht in die Gesamtstärke zählt (Angefordert / Anmarsch),
 * sagt es in seiner Kopfzeile — sonst addiert jemand am Tisch seine Zahl zur
 * Lagekarte hinzu.
 */
function bereichskopf(bereich: Einheitenlistenbereich): string {
  const hinweis = [
    bereich.zaehlt ? "" : " · zählt nicht in die Ist-Stärke",
    bereich.erwartet > 0 ? ` · ${kennzahlen.erwartetKurz(bereich.erwartet)}` : "",
  ].join("");
  const titel = `${htmlMaskieren(bereich.name)} <span class="typ">${htmlMaskieren(bereich.typ)} · ${anzahlText(bereich.zeilen.length)}${hinweis}</span>`;
  return [
    `      <tr class="bereich tiefe-${String(Math.min(bereich.tiefe, 3))}">`,
    `        <th scope="rowgroup" colspan="${String(VOR_DER_STAERKE)}">${titel}</th>`,
    `        ${zelle(bereich.staerke.fuehrer, "zahl")}`,
    `        ${zelle(bereich.staerke.unterfuehrer, "zahl")}`,
    `        ${zelle(bereich.staerke.mannschaft, "zahl")}`,
    `        ${zelle(bereich.gesamt, "zahl gesamt")}`,
    "        <td></td>",
    "      </tr>",
  ].join("\n");
}

function bereichAlsHtml(bereich: Einheitenlistenbereich): string {
  const zeilen =
    bereich.zeilen.length === 0
      ? [`      <tr class="leer"><td colspan="${String(SPALTEN)}">keine Einheiten</td></tr>`]
      : bereich.zeilen.map(einheitAlsHtml);
  return ["    <tbody>", bereichskopf(bereich), ...zeilen, "    </tbody>"].join("\n");
}

function staerkeText(staerke: { fuehrer: number; unterfuehrer: number; mannschaft: number }, gesamt: number): string {
  return `${String(staerke.fuehrer)} / ${String(staerke.unterfuehrer)} / ${String(staerke.mannschaft)} = ${String(gesamt)}`;
}

/**
 * Die Summen unter der Liste — dieselbe Zählregel wie Kopfband, Druck und Status.
 *
 * Die Liste führt die erwarteten Kräfte (angefordert, Anmarsch, Eingang) mit
 * auf, damit am Tisch nichts fehlt. Die Ist-Stärke steht deshalb getrennt von
 * „Alle aufgeführten Einheiten“: Wer beide Zahlen nebeneinander liest, soll
 * nicht die größere für die Stärke halten.
 */
function summenAlsHtml(daten: Einheitenlistendaten): string {
  const zeilen = [
    ["Ist-Stärke (vor Ort, wie Kopfband und Druck)", staerkeText(daten.ist, daten.istGesamt)],
    ["Erwartet (angefordert/Anmarsch/Eingang)", staerkeText(daten.erwartet, daten.erwartetGesamt)],
    ["Alle erfassten Einheiten (Ist + erwartet, nicht die Ist-Stärke)", staerkeText(daten.alle, daten.alleGesamt)],
    // Damit die Zahlen aufgehen: Was in keiner der drei Zeilen steht, steht hier.
    ...(daten.beendet > 0
      ? [["Beendet/Rückmarsch (nicht in den Zeilen darüber)", `${String(daten.beendet)} Einheit(en)`]]
      : []),
  ];
  return [
    '  <table class="summen">',
    "    <tbody>",
    ...zeilen.map(
      ([titel, wert]) =>
        `      <tr><th scope="row">${htmlMaskieren(titel ?? "")}</th><td class="zahl">${htmlMaskieren(wert ?? "")}</td></tr>`,
    ),
    "    </tbody>",
    "  </table>",
    `  <p class="fussnote">${htmlMaskieren(fussnote(daten))}</p>`,
  ].join("\n");
}

function fussnote(daten: Einheitenlistendaten): string {
  const beendet =
    daten.beendet === 0
      ? ""
      : ` ${anzahlText(daten.beendet)} im Bereich „Einsatz beendet“ ${daten.beendet === 1 ? "steht" : "stehen"} nicht in dieser Liste.`;
  return `${anzahlText(daten.einheiten)} in ${String(daten.bereiche.length)} Bereichen.${beendet}`;
}

const KOPFZEILE = [
  "Nr.",
  "FüSt.",
  "Einheit",
  "Organisation",
  "Herkunft",
  "Ebene",
  "Führer / Erreichbarkeit",
  "Aufträge",
  "Geräte / Fahrzeuge",
  "Status",
  "Schicht",
  "Fü",
  "UFü",
  "He",
  "Gesamt",
  "Eingetroffen",
];

/**
 * Setzt die Einheitenliste als HTML.
 *
 * Eine eigenständige Seite mit eingebettetem Stil, wie Druck und Status: Sie
 * wird über `printToPDF` gedruckt und als Datei auf den Share gelegt, und
 * beides verträgt keinen Verweis auf eine äußere Datei.
 */
export function einheitenlisteAlsHtml(daten: Einheitenlistendaten, kopf: Ausgabekopf): string {
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>Einheitenliste — ${htmlMaskieren(daten.einsatzName)}</title>`,
    "  <style>",
    EINHEITENLISTE_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <p class="fuest">${htmlMaskieren(daten.fuestName)}</p>`,
    '  <table class="einheitenliste">',
    "    <thead>",
    "      <tr>",
    ...KOPFZEILE.map((titel) => `        <th scope="col">${htmlMaskieren(titel)}</th>`),
    "      </tr>",
    "    </thead>",
    ...daten.bereiche.map(bereichAlsHtml),
    "  </table>",
    summenAlsHtml(daten),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/**
 * Der Stil des Ausdrucks.
 *
 * Kleiner als beim Druck, weil sechzehn statt vierzehn Spalten und Freitext
 * darin stehen. Unter 7 pt wird es am Tisch unter Kunstlicht unleserlich;
 * deshalb bricht lieber eine Zelle um, als dass die Schrift schrumpft.
 */
export const EINHEITENLISTE_STIL = [
  "    @page { size: A4 landscape; margin: 10mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 7.5pt; margin: 0; }",
  "    h1 { font-size: 13pt; margin: 0 0 1.5mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    .fuest { margin: 0 0 3mm; font-size: 9pt; }",
  "    table.einheitenliste { border-collapse: collapse; width: 100%; }",
  "    table.einheitenliste th, table.einheitenliste td { border: 0.3mm solid #999; padding: 0.6mm 1mm; vertical-align: top; text-align: left; }",
  "    table.einheitenliste thead th { background: #eee; font-size: 7.5pt; }",
  // Der Kopf wiederholt sich auf jeder Seite; eine Zeile bricht nie.
  "    thead { display: table-header-group; }",
  "    tr { break-inside: avoid; page-break-inside: avoid; }",
  "    tr.bereich { break-after: avoid; page-break-after: avoid; }",
  "    tr.bereich th, tr.bereich td { background: #e3e3e3; font-weight: 700; font-size: 8.5pt; }",
  "    tr.bereich .typ { font-weight: 400; font-size: 7.5pt; color: #444; margin-left: 2mm; }",
  "    tr.bereich.tiefe-1 th { padding-left: 5mm; }",
  "    tr.bereich.tiefe-2 th { padding-left: 9mm; }",
  "    tr.bereich.tiefe-3 th { padding-left: 13mm; }",
  "    tr.leer td { color: #666; font-style: italic; }",
  "    td.zahl { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }",
  "    td.gesamt { font-weight: 700; }",
  "    td.nr { text-align: right; color: #666; }",
  "    td.name { font-weight: 600; }",
  "    td.zeit { white-space: nowrap; }",
  "    table.summen { border-collapse: collapse; margin: 3mm 0 0; break-inside: avoid; }",
  "    table.summen th, table.summen td { border: 0.3mm solid #999; padding: 0.8mm 2mm; font-size: 9pt; }",
  '    table.summen th[scope="row"] { text-align: left; font-weight: 400; }',
  "    table.summen td { font-weight: 700; }",
  "    .fussnote { font-size: 8pt; color: #444; margin: 2mm 0 0; }",
].join("\n");
