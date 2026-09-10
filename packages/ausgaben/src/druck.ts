/**
 * Der Druck — „Stärke auf der Lagekarte“ (M4.1).
 *
 * Vorbild ist das Blatt „Druck“ der Excel (Bestandsaufnahme
 * `excel-domaenenmodell.md` §4.1). Es ist der Ausdruck, den die
 * Führungsstelle an die Lagekarte hängt, und er beantwortet genau eine Frage:
 * **Welche Kräfte stehen wo?**
 *
 * Die Vorlage macht dabei fünf Festlegungen, die hier alle wiederkehren, weil
 * ohne sie der Ausdruck ein anderer wäre:
 *
 *  1. **Eine Zeile je Bereich**, nicht je Einheit. Der Druck ist eine
 *     Übersicht; die Einheiten stehen im Blatt „Stärke“.
 *  2. **Ohne die angeforderten Kräfte.** Die Vorlage sagt es in ihrer Fußnote
 *     selbst: „(ohne Kräfte aus dem Bereich ‚Angefordert / Anmarsch‘)“. Wer
 *     angefordert ist, ist noch nicht da, und eine Lagekarte, die ihn
 *     mitzählt, überzeichnet die eigene Lage.
 *  3. **Leere Zeilen werden ausgeblendet.** In der Excel tut das
 *     `Worksheet_Activate`; hier tut es K7 (`imDruckSichtbar`). Ein Ausdruck
 *     mit zwölf leeren Einsatzorten ist eine Seite Papier weniger Übersicht.
 *  4. **Eine Plausibilitätsspalte je Zeile.** In der Excel `=IF(E+G+I-K=0,
 *     "o.k.","Fehler")`, weil dort Summanden und Summe getrennt gepflegt
 *     sind. Hier kann sie nicht fehlschlagen (K8) — sie steht trotzdem da,
 *     weil der Bediener sie kennt und ihr Fehlen als Auslassung läse.
 *  5. **Ein Organisationsfilter.** „Davon Stärke: THW“ ist die zweite Frage
 *     jeder Lagebesprechung; die Vorlage hat dafür ein Auswahlfeld.
 *
 * **Daten und Darstellung sind getrennt.** {@link druckdaten} rechnet,
 * {@link druckAlsHtml} setzt. Der HTML-Monitor aus M4.3 ist derselbe Druck in
 * einer anderen Hülle, und die Zahlen sollen dort dieselben sein — nicht
 * dieselben noch einmal gerechnet.
 */

import { kennzahlen, projektion, type Staerke, type Zustand } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

/** Eine Zeile des Druckblatts — ein Bereich. */
export interface Druckzeile {
  readonly abschnittId: string;
  readonly name: string;
  readonly typ: string;
  /** Die Einrückung im Baum; die Excel kennt sie nicht, unser Modell schon. */
  readonly tiefe: number;
  readonly staerke: Staerke;
  readonly gesamt: number;
  /** Die Stärke der Einheiten dieses Bereichs, die der Filterorganisation angehören. */
  readonly davon: Staerke;
  readonly davonGesamt: number;
  /** K8: `Fü + UFü + He − Gesamt = 0`. */
  readonly plausibel: boolean;
}

export interface Druckdaten {
  readonly einsatzName: string;
  readonly fuestName: string;
  /** Die Organisation des Filters — „Davon Stärke: <Org>“. */
  readonly organisation: string;
  readonly zeilen: readonly Druckzeile[];
  readonly gesamt: Staerke;
  readonly gesamtSumme: number;
  readonly davonGesamt: Staerke;
  readonly davonGesamtSumme: number;
  /** Die Kräfte, die **nicht** im Druck stehen — die angeforderten (§4.1). */
  readonly angefordert: Staerke;
  readonly angefordertSumme: number;
  readonly plausibel: boolean;
}

export interface Druckoptionen {
  /** Vorbelegung „THW“, wie im Auswahlfeld der Vorlage (`Druck!S4`). */
  readonly organisation?: string;
}

function summe(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

function plus(a: Staerke, b: Staerke): Staerke {
  return {
    fuehrer: a.fuehrer + b.fuehrer,
    unterfuehrer: a.unterfuehrer + b.unterfuehrer,
    mannschaft: a.mannschaft + b.mannschaft,
  };
}

const NULL: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function text(wert: unknown, ersatz = ""): string {
  return typeof wert === "string" && wert !== "" ? wert : ersatz;
}

/**
 * Rechnet die Zahlen des Druckblatts.
 *
 * **Je Zeile die eigene Stärke, nicht die des Teilbaums.** Unser Modell kennt
 * Unterabschnitte, die Excel nicht. Summierte man je Zeile den Teilbaum, stünde
 * die Stärke eines Unterabschnitts zweimal da — einmal bei ihm, einmal beim
 * Elternteil —, und die Gesamtzeile wäre die Summe der Zeilen nicht mehr. Die
 * Einrückung zeigt die Zugehörigkeit; addiert wird jede Zeile genau einmal.
 */
export function druckdaten(zustand: Zustand, optionen: Druckoptionen = {}): Druckdaten {
  const organisation = optionen.organisation ?? "THW";
  const baum = projektion.baumZeilen(projektion.abschnittsbaum(zustand));

  const zeilen: Druckzeile[] = [];
  for (const knoten of baum) {
    if (!kennzahlen.imDruckSichtbar(zustand, knoten.id)) continue;
    const einheiten = kennzahlen.einheitenImAbschnitt(zustand, knoten.id);
    const staerke = einheiten.reduce<Staerke>((s, e) => plus(s, e.wirksameStaerke), NULL);
    const davon = einheiten
      .filter((e) => text(e.organisation.wert) === organisation)
      .reduce<Staerke>((s, e) => plus(s, e.wirksameStaerke), NULL);
    zeilen.push({
      abschnittId: knoten.id,
      name: knoten.name,
      typ: knoten.typ,
      tiefe: knoten.tiefe,
      staerke,
      gesamt: summe(staerke),
      davon,
      davonGesamt: summe(davon),
      // K8: In dieser Umsetzung kann sie nicht fehlschlagen, weil Summe und
      // Summanden aus denselben drei Rollen kommen. Sie steht trotzdem da.
      plausibel: true,
    });
  }

  const gesamt = zeilen.reduce<Staerke>((s, z) => plus(s, z.staerke), NULL);
  const davonGesamt = zeilen.reduce<Staerke>((s, z) => plus(s, z.davon), NULL);
  const angefordert = kennzahlen.einsatzGesamtstaerke(zustand).angefordert;

  return {
    einsatzName: text(zustand.einsatz?.name.wert, "(ohne Namen)"),
    fuestName: text(zustand.einsatz?.fuestName.wert),
    organisation,
    zeilen,
    gesamt,
    gesamtSumme: summe(gesamt),
    davonGesamt,
    davonGesamtSumme: summe(davonGesamt),
    angefordert,
    angefordertSumme: summe(angefordert),
    plausibel: kennzahlen.druckPlausibel(zustand),
  };
}

/** Die Fußnote der Vorlage, wörtlich (`Druck!E35`). */
export const DRUCK_FUSSNOTE = "(ohne Kräfte aus dem Bereich „Angefordert / Anmarsch“)";

function zelle(inhalt: string | number, klasse = ""): string {
  const text = typeof inhalt === "number" ? String(inhalt) : htmlMaskieren(inhalt);
  return klasse === "" ? `<td>${text}</td>` : `<td class="${klasse}">${text}</td>`;
}

/**
 * Setzt den Druck als HTML.
 *
 * Eine eigenständige Seite mit eingebettetem Stil und ohne jede äußere Datei:
 * Sie wird über `webContents.printToPDF` gedruckt (M4.1) und als Datei auf den
 * Share gelegt (M4.3). Beides verträgt kein `<link rel="stylesheet">` — im
 * ersten Fall gäbe es dafür keinen Server, im zweiten läge die Datei allein
 * in einem Ordner, den jemand über das Netz öffnet.
 */
export function druckAlsHtml(daten: Druckdaten, kopf: Ausgabekopf): string {
  const zeilen = daten.zeilen
    .map((zeile, nummer) =>
      [
        "        <tr>",
        `          ${zelle(nummer + 1, "nr")}`,
        `          ${zelle(zeile.name, `bereich tiefe-${String(zeile.tiefe)}`)}`,
        `          ${zelle(zeile.staerke.fuehrer, "zahl")}`,
        '          <td class="trenner">/</td>',
        `          ${zelle(zeile.staerke.unterfuehrer, "zahl")}`,
        '          <td class="trenner">/</td>',
        `          ${zelle(zeile.staerke.mannschaft, "zahl")}`,
        '          <td class="trenner">=</td>',
        `          ${zelle(zeile.gesamt, "zahl gesamt")}`,
        `          ${zelle(zeile.plausibel ? "o.k." : "Fehler", zeile.plausibel ? "probe ok" : "probe fehler")}`,
        `          ${zelle(zeile.davon.fuehrer, "zahl davon")}`,
        `          ${zelle(zeile.davon.unterfuehrer, "zahl davon")}`,
        `          ${zelle(zeile.davon.mannschaft, "zahl davon")}`,
        `          ${zelle(zeile.davonGesamt, "zahl davon gesamt")}`,
        "        </tr>",
      ].join("\n"),
    )
    .join("\n");

  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>Stärke — ${htmlMaskieren(daten.einsatzName)}</title>`,
    "  <style>",
    DRUCK_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <p class="fuest">${htmlMaskieren(daten.fuestName)}</p>`,
    '  <table class="druck">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col">Nr.</th>',
    '        <th scope="col">Einsatzstelle</th>',
    '        <th scope="col" colspan="5">Fü / UFü / He</th>',
    '        <th scope="col">Gesamt</th>',
    '        <th scope="col">Probe</th>',
    `        <th scope="col" colspan="4">Davon Stärke: ${htmlMaskieren(daten.organisation)}</th>`,
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    "      <tr class=\"summenzeile\">",
    '        <td class="nr"></td>',
    "        <td>Gesamt</td>",
    `        ${zelle(daten.gesamt.fuehrer, "zahl")}`,
    '        <td class="trenner">/</td>',
    `        ${zelle(daten.gesamt.unterfuehrer, "zahl")}`,
    '        <td class="trenner">/</td>',
    `        ${zelle(daten.gesamt.mannschaft, "zahl")}`,
    '        <td class="trenner">=</td>',
    `        ${zelle(daten.gesamtSumme, "zahl gesamt")}`,
    `        ${zelle(daten.plausibel ? "o.k." : "Fehler", daten.plausibel ? "probe ok" : "probe fehler")}`,
    `        ${zelle(daten.davonGesamt.fuehrer, "zahl davon")}`,
    `        ${zelle(daten.davonGesamt.unterfuehrer, "zahl davon")}`,
    `        ${zelle(daten.davonGesamt.mannschaft, "zahl davon")}`,
    `        ${zelle(daten.davonGesamtSumme, "zahl davon gesamt")}`,
    "      </tr>",
    zeilen,
    "    </tbody>",
    "  </table>",
    `  <p class="fussnote">${htmlMaskieren(DRUCK_FUSSNOTE)}</p>`,
    `  <p class="angefordert">Angefordert / Anmarsch: ${String(daten.angefordert.fuehrer)}/${String(daten.angefordert.unterfuehrer)}/${String(daten.angefordert.mannschaft)} = ${String(daten.angefordertSumme)}</p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/**
 * Der Stil des Ausdrucks.
 *
 * Er steht als Zeichenkette und nicht in einer `.css`: Dieses Paket liefert
 * eine Seite, die ohne jede weitere Datei druckbar ist. Die Wahl der
 * Schriftgrößen folgt dem, was auf ein A4-Blatt quer passt — die Vorlage
 * druckt ebenfalls quer.
 */
export const DRUCK_STIL = [
  "    @page { size: A4 landscape; margin: 12mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    .fuest { margin: 0 0 4mm; font-size: 10pt; }",
  "    table.druck { border-collapse: collapse; width: 100%; }",
  "    table.druck th, table.druck td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; }",
  "    table.druck th { background: #eee; font-size: 9pt; }",
  // Zahlen in Tabellenziffern und rechtsbuendig: Wer Staerken vergleicht,
  // liest Spalten und keine Woerter.
  "    td.zahl { text-align: right; font-variant-numeric: tabular-nums; width: 8mm; }",
  "    td.gesamt { font-weight: 600; }",
  "    td.trenner { text-align: center; width: 3mm; color: #666; }",
  "    td.nr { text-align: right; width: 8mm; color: #666; }",
  "    td.davon { background: #f6f6f6; }",
  "    tr.summenzeile td { font-weight: 700; background: #e8e8e8; }",
  // Die Einrueckung zeigt Unterabschnitte. Die Excel kennt sie nicht; unser
  // Modell schon, und ohne sie stuende ein UA neben seinem EA statt darunter.
  "    td.tiefe-1 { padding-left: 6mm; }",
  "    td.tiefe-2 { padding-left: 11mm; }",
  "    td.tiefe-3 { padding-left: 16mm; }",
  "    .probe.ok { color: #157a3c; }",
  "    .probe.fehler { color: #b91c1c; font-weight: 700; }",
  "    .fussnote, .angefordert { font-size: 9pt; color: #444; margin: 2mm 0 0; }",
].join("\n");
