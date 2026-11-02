/**
 * Die Ausgaben der Versorgung (S4, KONZEPT-S4.md §5) — Seiten für Papier.
 *
 * Belegungsliste (S4.2): je Unterkunft die Einheiten mit Köpfen, für den
 * Zettel an der Hallentür. Die Rechnung steht in Ring 2
 * (`projektion.belegung`); hier entsteht nur die Seite.
 */

import type { Belegung, Unterkunftskarte } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

export const VERSORGUNG_STIL = [
  "    @page { size: A4; margin: 12mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    h2 { font-size: 12pt; margin: 6mm 0 1.5mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    table { border-collapse: collapse; width: 100%; }",
  "    th, td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; text-align: left; }",
  "    thead th { background: #eee; font-size: 9pt; }",
  "    td.zahl, th.zahl { text-align: right; font-variant-numeric: tabular-nums; }",
  "    tr.summenzeile th, tr.summenzeile td { font-weight: 700; background: #e8e8e8; }",
  "    .unterkunft { break-inside: avoid; }",
  "    .marke { font-weight: 700; }",
  "    .hinweis { font-size: 8pt; color: #444; margin-top: 4mm; }",
].join("\n");

export function seite(titel: string, kopf: Ausgabekopf, inhalt: readonly string[]): string {
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>${htmlMaskieren(titel)} — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    VERSORGUNG_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <h2>${htmlMaskieren(titel)}</h2>`,
    ...inhalt,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export const zahlzelle = (wert: number): string => `<td class="zahl">${String(wert)}</td>`;

function unterkunftAlsHtml(u: Unterkunftskarte): string[] {
  const zustand = u.ueberbelegt ? ' · <span class="marke">⚠ überbelegt</span>' : u.frei === 0 ? ' · <span class="marke">voll</span>' : "";
  return [
    '  <section class="unterkunft">',
    `    <h2>${htmlMaskieren(u.name)}${u.ort === undefined ? "" : ` · ${htmlMaskieren(u.ort)}`}</h2>`,
    `    <p>Kapazität ${String(u.kapazitaet)} · belegt ${String(u.belegt.gesamt)} · frei ${String(Math.max(0, u.frei))}${zustand}</p>`,
    "    <table>",
    '      <thead><tr><th scope="col">Einheit</th><th scope="col">Bereich</th><th scope="col" class="zahl">m</th><th scope="col" class="zahl">w</th><th scope="col" class="zahl">d</th><th scope="col" class="zahl">Köpfe</th></tr></thead>',
    "      <tbody>",
    ...(u.einheiten.length === 0 ? ['        <tr><td colspan="6">keine Einheit</td></tr>'] : []),
    ...u.einheiten.map(
      (e) =>
        `        <tr><th scope="row">${htmlMaskieren(e.einheit)}</th><td>${htmlMaskieren(e.bereich)}</td>${zahlzelle(e.m)}${zahlzelle(e.w)}${zahlzelle(e.d)}${zahlzelle(e.m + e.w + e.d)}</tr>`,
    ),
    `        <tr class="summenzeile"><th scope="row" colspan="2">Summe</th>${zahlzelle(u.belegt.m)}${zahlzelle(u.belegt.w)}${zahlzelle(u.belegt.d)}${zahlzelle(u.belegt.gesamt)}</tr>`,
    "      </tbody>",
    "    </table>",
    "  </section>",
  ];
}

/** Die Belegungsliste: je geltende Unterkunft die Einheiten mit Köpfen. */
export function belegungAlsHtml(belegung: Belegung, kopf: Ausgabekopf): string {
  const geltend = belegung.unterkuenfte.filter((u) => !u.aufgeloest);
  return seite("Belegungsliste", kopf, [
    `  <p>${String(geltend.length)} Unterkünfte · Kapazität ${String(belegung.kapazitaet)} · belegt ${String(belegung.belegt)} · frei ${String(belegung.frei)} · ohne Unterkunft ${String(belegung.ohneZuweisung.koepfe)} (${String(belegung.ohneZuweisung.einheiten)} Einheiten)</p>`,
    ...(geltend.length === 0 ? ["  <p>Keine Unterkunft angelegt.</p>"] : geltend.flatMap(unterkunftAlsHtml)),
    '  <p class="hinweis">Belegung: Übernachtungsbedarf der Einheit (K6); ohne gemeldeten Bedarf zählt eine zugewiesene Einheit mit ihren Köpfen. Eine Zuweisung über die Kapazität wird gezeigt, nicht verweigert.</p>',
  ]);
}
