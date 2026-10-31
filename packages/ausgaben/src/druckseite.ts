/**
 * Das gemeinsame Gerüst der einfachen Listenausgaben (Anforderungen,
 * Tagebuch, Papier-Vordruck).
 *
 * Eine Liste auf Papier braucht dreierlei, das die großen Blätter schon
 * haben und die kleinen oft vergessen: Seitenzahl („Seite 2 von 5“), Stand
 * mit Uhrzeit im Fuß jeder Seite und eine freie Spalte für handschriftliche
 * Notizen. Das Gerüst legt das einmal fest; die Vorlagen liefern nur die
 * Tabelle.
 *
 * Der Bildschirm kommt nicht zu kurz: `viewport`, ein waagerecht
 * scrollbarer Tabellenrahmen und umbrechende Zellen — die Seite läuft auf dem
 * Handy nicht aus dem Bild.
 */

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

export interface Druckseite {
  readonly titel: string;
  readonly kopf: Ausgabekopf;
  readonly inhalt: readonly string[];
  readonly querformat?: boolean;
}

/** Macht aus Text eine CSS-Zeichenkette (ohne Anführungszeichen, Umbrüche, Backslash). */
function cssText(text: string): string {
  return text.replace(/[\\"\r\n]/g, " ");
}

/** Der gemeinsame Stil: Seitenzahl im Fuß, Notizspalte, Bildschirmtauglichkeit. */
export function druckseitenstil(querformat: boolean, stand: string): string {
  return [
    `    @page { size: A4 ${querformat ? "landscape" : "portrait"}; margin: 12mm 10mm 16mm;`,
    `      @bottom-right { content: "Seite " counter(page) " von " counter(pages); font: 8pt system-ui, sans-serif; color: #444; }`,
    `      @bottom-left { content: "${cssText(stand)}"; font: 8pt system-ui, sans-serif; color: #444; } }`,
    "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
    "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
    "    h2 { font-size: 11pt; margin: 5mm 0 1.5mm; }",
    "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
    "    table.liste { border-collapse: collapse; width: 100%; }",
    "    table.liste th, table.liste td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; vertical-align: top; overflow-wrap: anywhere; }",
    "    table.liste thead { display: table-header-group; }",
    "    table.liste tr { break-inside: avoid; }",
    "    table.liste thead th { background: #eee; font-size: 9pt; text-align: left; }",
    "    td.notiz { width: 28%; min-height: 8mm; }",
    "    td.leer { height: 9mm; }",
    "    .hinweis { font-size: 9pt; color: #444; }",
    "    .tabellenrahmen { max-width: 100%; }",
    "    @media screen { .tabellenrahmen { overflow-x: auto; } body { margin: 8px; max-width: 100vw; } }",
  ].join("\n");
}

/** Setzt die Seite zusammen. */
export function druckseiteAlsHtml(seite: Druckseite): string {
  const querformat = seite.querformat ?? true;
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>${htmlMaskieren(seite.titel)} — ${htmlMaskieren(seite.kopf.einsatzName)}</title>`,
    "  <style>",
    druckseitenstil(querformat, seite.kopf.stand),
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(seite.kopf),
    ...seite.inhalt,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Ein Tabellenrahmen, damit breite Tabellen am Handy seitwärts scrollen statt die Seite zu sprengen. */
export function tabellenrahmen(tabelle: string): string {
  return `  <div class="tabellenrahmen">\n${tabelle}\n  </div>`;
}

/** Zeitangabe „TT.MM.JJJJ HH:MM“ in Ortszeit — ohne `Intl`, damit zwei Rechner gleich drucken. */
export function zeitText(iso: string | undefined): string {
  if (iso === undefined || iso === "") return "—";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  const z = (n: number): string => String(n).padStart(2, "0");
  return `${z(t.getDate())}.${z(t.getMonth() + 1)}.${String(t.getFullYear())} ${z(t.getHours())}:${z(t.getMinutes())}`;
}
