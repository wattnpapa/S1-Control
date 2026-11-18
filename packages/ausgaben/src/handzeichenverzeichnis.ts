/**
 * Das Handzeichenverzeichnis als Seite (Audits Nachrichten Runde 2,
 * R2-ETB P2-7): die kleine Liste, die der Einsatzakte beiliegt und ein
 * Handzeichen der Nachweisung und des Tagebuchs auf Arbeitsplatz und Stelle
 * zurückführt. Die Rechnung steht in Ring 2 (`projektion.handzeichenverzeichnis`).
 */

import { projektion, zeitpunktText, type Handzeicheneintrag } from "@s1/domaene";

import { druckseiteAlsHtml, tabellenrahmen } from "./druckseite.js";
import { htmlMaskieren, type Ausgabekopf } from "./index.js";

/** Der Satz unter der Tabelle: woher die Angaben stammen. */
export const HANDZEICHEN_FUSSNOTE =
  "Aus den Ereignissen des Einsatzes: Handzeichen der Vermerke, Stelle der Sitzung und Anzeigename des Arbeitsplatzes. Mehrere Namen bei einem Handzeichen heißen: an mehreren Arbeitsplätzen oder von mehreren Personen geführt.";

function zeileAlsHtml(e: Handzeicheneintrag): string {
  const zellen = [
    e.handzeichen,
    e.namen.join(", "),
    e.stellen.map(projektion.stellenWort).join(", "),
    zeitpunktText(e.erster),
    zeitpunktText(e.letzter),
    String(e.anzahl),
  ];
  return `      <tr>${zellen.map((z) => `<td>${htmlMaskieren(z)}</td>`).join("")}</tr>`;
}

/** Das Verzeichnis als druckbare A4-Seite. */
export function handzeichenverzeichnisAlsHtml(kopf: Ausgabekopf, eintraege: readonly Handzeicheneintrag[]): string {
  const spalten = ["Hz.", "Arbeitsplatz", "Stelle", "Erster Eintrag", "Letzter Eintrag", "Einträge"];
  const tabelle = [
    '  <table class="liste">',
    `    <thead><tr>${spalten.map((s) => `<th scope="col">${htmlMaskieren(s)}</th>`).join("")}</tr></thead>`,
    "    <tbody>",
    ...eintraege.map(zeileAlsHtml),
    "    </tbody>",
    "  </table>",
  ].join("\n");
  return druckseiteAlsHtml({
    titel: "Handzeichenverzeichnis",
    kopf,
    schlankerKopf: true,
    inhalt: [
      "  <h2>Handzeichenverzeichnis</h2>",
      eintraege.length === 0 ? '  <p class="hinweis">Noch kein Eintrag mit Handzeichen.</p>' : tabellenrahmen(tabelle),
      `  <p class="hinweis">${htmlMaskieren(HANDZEICHEN_FUSSNOTE)}</p>`,
    ],
  });
}
