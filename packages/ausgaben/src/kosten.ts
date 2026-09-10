/**
 * Die Kostenübersicht (M5.2).
 *
 * Vorbild sind die Spalten AN bis AW des Blattes „Stärke“
 * (`excel-domaenenmodell.md` §2). Das Blatt beantwortet die Frage, die nach
 * dem Einsatz kommt und nicht während seiner: **was hat das gekostet**. Es ist
 * deshalb der einzige Ausdruck, der nicht an die Wand gehört, sondern in die
 * Abrechnung.
 *
 * **Die Parameter stehen einmal oben und nicht in jeder Zeile.** Die Vorlage
 * reicht `Kosten pro Satz PSA`, `VDA pro Tag`, `Unterkunft/Verpflegung` und
 * `Geplante Einsatztage` aus dem Blattkopf in jede Zeile durch — mit Formeln
 * wie `AQ = $AQ$3`. Das ist in einer Tabelle die einzige Möglichkeit, die
 * Zahl in einer Zeilenformel zu benutzen; hier wäre es dieselbe Zahl vierzig
 * Mal untereinander.
 *
 * **Was fehlt, steht im Blatt.** Angeforderte und archivierte Kräfte gehen
 * nach ZDM §2.4 nicht in die Kosten ein. Eine Kostensumme, die stillschweigend
 * weniger Kräfte zählt als das Lagebild, ist eine Zahl, der später niemand
 * glaubt — die Zeile darunter nennt deshalb, wie viele Einheiten
 * herausgefallen sind.
 */

import { projektion, type Zustand } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

/**
 * Formatiert einen Betrag in Euro.
 *
 * Ohne `Intl`: Dieses Paket läuft mit `types: []` und ohne DOM, und
 * `Intl.NumberFormat` ist zwar in jeder Zielumgebung vorhanden, aber sein
 * Ergebnis hängt an den Gebietsdaten der Umgebung. Zwei Rechner druckten dann
 * dieselbe Zahl verschieden, und ein Goldfile wäre nicht mehr stabil.
 */
export function euro(betrag: number): string {
  const gerundet = Math.round(betrag * 100);
  const vorzeichen = gerundet < 0 ? "−" : "";
  const absolut = Math.abs(gerundet);
  const ganze = Math.floor(absolut / 100);
  const cent = absolut % 100;
  const gruppiert = String(ganze).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${vorzeichen}${gruppiert},${String(cent).padStart(2, "0")} €`;
}

function zahl(wert: number): string {
  return `<td class="zahl">${String(wert)}</td>`;
}

function geld(wert: number): string {
  return `<td class="zahl">${htmlMaskieren(euro(wert))}</td>`;
}

/** Baut die Kostenübersicht als HTML. */
export function kostenAlsHtml(zustand: Zustand, kopf: Ausgabekopf): string {
  const blatt = projektion.kostenblatt(zustand);
  const p = blatt.parameter;
  const fuestName =
    typeof zustand.einsatz?.fuestName.wert === "string" ? zustand.einsatz.fuestName.wert : "";

  const zeilen = blatt.zeilen.map((zeile) =>
    [
      "      <tr>",
      `        <th scope="row">${htmlMaskieren(zeile.bezeichnung)}</th>`,
      `        <td>${htmlMaskieren(zeile.abschnittName)}</td>`,
      `        <td>${htmlMaskieren(zeile.organisation)}</td>`,
      `        ${zahl(zeile.koepfe)}`,
      `        ${zahl(zeile.psaSaetzeProTag)}`,
      `        ${geld(zeile.psaProTag)}`,
      `        ${geld(zeile.vdaUkProTag)}`,
      `        ${zahl(zeile.personentage)}`,
      `        ${geld(zeile.gesamt)}`,
      "      </tr>",
    ].join("\n"),
  );

  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>Kosten — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    KOSTEN_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <p class="fuest">${htmlMaskieren(fuestName)}</p>`,
    "  <h2>Kostenparameter</h2>",
    '  <table class="parameter">',
    "    <tbody>",
    `      <tr><th scope="row">Kosten pro Satz PSA</th><td class="zahl">${htmlMaskieren(euro(p.psaKostenProSatz))}</td></tr>`,
    `      <tr><th scope="row">VDA pro Tag und Kraft</th><td class="zahl">${htmlMaskieren(euro(p.vdaProTag))}</td></tr>`,
    `      <tr><th scope="row">Unterkunft und Verpflegung pro Tag und Kraft</th><td class="zahl">${htmlMaskieren(euro(p.ukVerpflegungProTag))}</td></tr>`,
    `      <tr><th scope="row">Geplante Einsatztage</th><td class="zahl">${String(p.geplanteEinsatztage)}</td></tr>`,
    "    </tbody>",
    "  </table>",
    "  <h2>Kosten je Einheit</h2>",
    '  <table class="kosten">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col">Einheit</th><th scope="col">Bereich</th><th scope="col">Org.</th>',
    '        <th scope="col">Kräfte</th><th scope="col">PSA-Sätze / Tag</th>',
    '        <th scope="col">PSA / Tag</th><th scope="col">VDA + UK / Tag</th>',
    '        <th scope="col">Personentage</th><th scope="col">Gesamt</th>',
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    ...zeilen,
    '      <tr class="summenzeile">',
    '        <th scope="row" colspan="3">Summe</th>',
    `        ${zahl(blatt.summe.koepfe)}`,
    "        <td></td>",
    `        ${geld(blatt.summe.psaProTag)}`,
    `        ${geld(blatt.summe.vdaUkProTag)}`,
    `        ${zahl(blatt.summe.personentage)}`,
    `        ${geld(blatt.summe.gesamt)}`,
    "      </tr>",
    "    </tbody>",
    "  </table>",
    `  <p class="hinweis">${htmlMaskieren(KOSTEN_FUSSNOTE(blatt.ausgenommen))}</p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Die Fußnote: Was aus der Rechnung fällt, und warum. */
export function KOSTEN_FUSSNOTE(ausgenommen: number): string {
  const teil =
    ausgenommen === 0
      ? "Keine Einheit fällt aus der Rechnung."
      : `${String(ausgenommen)} Einheit(en) fallen aus der Rechnung: angeforderte und archivierte Kräfte zählen nach dem Zieldatenmodell §2.4 nicht mit.`;
  return `${teil} Gesamt ist bei einer Einheit ohne Kräfte null — die Vorlage erzwingt das über IFERROR, weil sie an dieser Stelle durch die Gesamtstärke teilt.`;
}

export const KOSTEN_STIL = [
  "    @page { size: A4 landscape; margin: 10mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    h2 { font-size: 11pt; margin: 5mm 0 1.5mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    .fuest { margin: 0 0 4mm; }",
  "    table.parameter, table.kosten { border-collapse: collapse; }",
  "    table.kosten { width: 100%; }",
  "    table.parameter th, table.parameter td, table.kosten th, table.kosten td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; }",
  "    table.kosten thead th { background: #eee; font-size: 9pt; }",
  '    th[scope="row"] { text-align: left; font-weight: 400; }',
  "    td.zahl { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }",
  "    tr.summenzeile th, tr.summenzeile td { font-weight: 700; background: #e8e8e8; }",
  "    .hinweis { font-size: 8pt; color: #444; margin-top: 4mm; }",
].join("\n");
