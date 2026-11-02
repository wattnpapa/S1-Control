/**
 * Der Papier-Vordruck: leere Formulare für den Betrieb ohne Rechner.
 *
 * Fällt der Rechner, das Netz oder der Akku aus, arbeitet die Führungsstelle
 * auf Papier weiter — und überträgt später. Dafür braucht es Vordrucke, die
 * schon vorher im Schrank liegen: **Meldeblock**, **Einheitenliste**,
 * **Funkprotokoll** und **Funkplan (leer)**, je eine A4-Seite hoch, mit Einsatzkopf, leeren Zeilen
 * und Platz für Datum und Uhrzeit. Bewusst ohne Einsatzdaten: Die Seite soll
 * sich auch ausdrucken lassen, wenn es keinen Einsatz mehr gibt, und sie
 * soll mehrfach kopierbar sein.
 *
 * Die Spalten der Einheitenliste entsprechen den Pflichtfeldern der
 * Erfassung (Name, Organisation, Stärke Fü/UFü/He, Abschnitt, Status), damit
 * das spätere Übertragen Zeile für Zeile geht. Der leere Funkplan trägt die
 * Spalten der Ausgabe „Funkplan" (`funkplan.ts`), für den Fall, dass vor dem
 * Einsatz noch nichts erfasst ist (KONZEPT-FUNKPLAN.md §7).
 */

import { FUNKPLAN_FUSSNOTE, FUNKPLAN_SPALTEN } from "./funkplan.js";
import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

const VORDRUCK_STIL = [
  "    @page { size: A4 portrait; margin: 12mm 10mm 14mm;",
  '      @bottom-right { content: "Seite " counter(page) " von " counter(pages); font: 8pt system-ui, sans-serif; color: #444; } }',
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    h2 { font-size: 13pt; margin: 0 0 3mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    section.vordruck { break-after: page; }",
  "    section.vordruck:last-of-type { break-after: auto; }",
  "    .feld { display: inline-block; border-bottom: 0.3mm solid #000; min-width: 40mm; height: 7mm; margin-right: 4mm; }",
  "    .zeile { margin: 0 0 3mm; }",
  "    table.vordruck { border-collapse: collapse; width: 100%; }",
  "    table.vordruck th, table.vordruck td { border: 0.3mm solid #666; padding: 0 1.5mm; }",
  "    table.vordruck th { background: #eee; font-size: 8pt; text-align: left; height: 7mm; }",
  "    table.vordruck td { height: 10mm; }",
  "    table.vordruck tr.rg td { height: 8mm; background: #f2f2f2; font-size: 8.5pt; }",
  "    .block { border: 0.3mm solid #666; min-height: 70mm; padding: 2mm; margin-bottom: 3mm; }",
  "    .hinweis { font-size: 8pt; color: #444; }",
  "    .tabellenrahmen { max-width: 100%; }",
  "    @media screen { .tabellenrahmen { overflow-x: auto; } body { margin: 8px; max-width: 100vw; } }",
].join("\n");

function leereZeilen(spalten: number, anzahl: number): string {
  const zeile = `      <tr>${"<td></td>".repeat(spalten)}</tr>`;
  return Array.from({ length: anzahl }, () => zeile).join("\n");
}

function tabelle(titel: readonly string[], zeilen: number): string {
  return [
    '  <div class="tabellenrahmen">',
    '  <table class="vordruck">',
    `    <thead><tr>${titel.map((t) => `<th scope="col">${htmlMaskieren(t)}</th>`).join("")}</tr></thead>`,
    "    <tbody>",
    leereZeilen(titel.length, zeilen),
    "    </tbody>",
    "  </table>",
    "  </div>",
  ].join("\n");
}

function feld(beschriftung: string): string {
  return `<span>${htmlMaskieren(beschriftung)} <span class="feld"></span></span>`;
}

function meldeblock(): string {
  return [
    '<section class="vordruck" aria-label="Meldeblock">',
    "  <h2>Papier-Vordruck: Meldeblock</h2>",
    `  <p class="zeile">${feld("Datum")} ${feld("Uhrzeit")}</p>`,
    `  <p class="zeile">${feld("Von")} ${feld("An")}</p>`,
    `  <p class="zeile">Weg: ☐ Funk &nbsp; ☐ Telefon &nbsp; ☐ Melder &nbsp; ☐ Mündlich &nbsp; ${feld("Funkrufname")}</p>`,
    '  <p class="zeile">Dringlichkeit: ☐ normal &nbsp; ☐ dringend &nbsp; ☐ Blitz</p>',
    '  <div class="block"><strong>Meldung</strong></div>',
    '  <div class="block" style="min-height:40mm"><strong>Maßnahme / Antwort</strong></div>',
    `  <p class="zeile">${feld("Aufgenommen von")} ${feld("Quittiert (Uhrzeit)")}</p>`,
    `  <p class="zeile">☐ im Rechner nachgetragen &nbsp; ${feld("Nachgetragen von / Uhrzeit")}</p>`,
    "</section>",
  ].join("\n");
}

function einheitenliste(): string {
  return [
    '<section class="vordruck" aria-label="Einheitenliste">',
    "  <h2>Papier-Vordruck: Einheitenliste</h2>",
    `  <p class="zeile">${feld("Stand: Datum")} ${feld("Uhrzeit")} ${feld("Geführt von")}</p>`,
    tabelle(
      ["Einheit", "Org.", "Fü", "UFü", "He", "Gesamt", "Abschnitt", "Status", "Funkruf / Kontakt", "Eintreffen"],
      16,
    ),
    '  <p class="hinweis">Status: Angefordert, Anmarsch, Einsatzbereit, Einsatz, Ruhe, Nicht einsatzbereit, Rückmarsch. Ist-Stärke = Fü/UFü/He der Kräfte vor Ort.</p>',
    "</section>",
  ].join("\n");
}

function funkprotokoll(): string {
  return [
    '<section class="vordruck" aria-label="Funkprotokoll">',
    "  <h2>Papier-Vordruck: Funkprotokoll</h2>",
    `  <p class="zeile">${feld("Datum")} ${feld("Funkkreis / Kanal")} ${feld("Funker")}</p>`,
    tabelle(["Uhrzeit", "Von", "An", "Inhalt der Meldung", "Quittiert", "Nachgetragen"], 18),
    "</section>",
  ].join("\n");
}

/** Eine Kopfzeile je Rufgruppe zum Ausfüllen, darunter leere Teilnehmerzeilen. */
function funkplanGruppe(kopfzeile: string, zeilen: number): string {
  return [
    `      <tr class="rg"><td colspan="${String(FUNKPLAN_SPALTEN.length)}">${kopfzeile}</td></tr>`,
    leereZeilen(FUNKPLAN_SPALTEN.length, zeilen),
  ].join("\n");
}

function funkplanLeer(): string {
  const rufgruppe = "☐ TMO &nbsp; ☐ DMO &nbsp; ☐ Analog &nbsp; Rufgruppe / Kanal ____________ &nbsp; Zweck ____________ &nbsp; hört ____________";
  return [
    '<section class="vordruck" aria-label="Funkplan (leer)">',
    "  <h2>Papier-Vordruck: Funkplan (leer)</h2>",
    `  <p class="zeile">${feld("Stand: Datum")} ${feld("Uhrzeit")} ${feld("Geführt von")}</p>`,
    '  <div class="tabellenrahmen">',
    '  <table class="vordruck">',
    `    <thead><tr>${FUNKPLAN_SPALTEN.map((s) => `<th scope="col">${htmlMaskieren(s.kopf)}</th>`).join("")}</tr></thead>`,
    "    <tbody>",
    funkplanGruppe(rufgruppe, 5),
    funkplanGruppe(rufgruppe, 5),
    funkplanGruppe(rufgruppe, 5),
    funkplanGruppe("Ohne Rufgruppe — mit Ankunft zuordnen", 3),
    "    </tbody>",
    "  </table>",
    "  </div>",
    `  <p class="hinweis">${htmlMaskieren(FUNKPLAN_FUSSNOTE)}</p>`,
    "</section>",
  ].join("\n");
}

/** Die vier Vordrucke als eine druckbare A4-Datei, je Vordruck eine Seite. */
export function papierVordruckAlsHtml(kopf: Ausgabekopf): string {
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>Papier-Vordruck — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    VORDRUCK_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    '  <p class="hinweis">Leere Vordrucke für den Betrieb ohne Rechner: Meldeblock, Einheitenliste, Funkprotokoll, Funkplan. Später im Rechner nachtragen und den Vordruck abheften.</p>',
    meldeblock(),
    einheitenliste(),
    funkprotokoll(),
    funkplanLeer(),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
