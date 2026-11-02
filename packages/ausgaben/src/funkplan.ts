/**
 * Der Funkplan als Ausgabe (KONZEPT-FUNKPLAN.md §7, Option 5e) — A4 hoch für
 * den Platz der Sprechfunker und den Rechnerausfall.
 *
 * Je geltende Rufgruppe eine Kopfzeile mit Betriebsart, Name, Zweck, Gateway
 * und abhörendem Platz, darunter die Teilnehmer mit Bereich, Funkrufname,
 * Erreichbarkeit und Hinweis, dann eine leere Zeile; am Ende „Ohne
 * Rufgruppe" und zwei leere Zeilen. **Die leeren Zeilen sind Absicht:** Der
 * Ausdruck hängt am Platz und wird mit Stift weitergeführt, wenn der Rechner
 * steht; nachgetragen wird später im Rechner.
 *
 * Die Rechnung steht in Ring 2 (`projektion.funkplan`); hier entsteht nur
 * die Seite. Aufgelöste Gruppen stehen nicht auf dem Papier — über sie wird
 * nicht mehr gerufen.
 *
 * Der Hinweis (F2) ist der Funkhinweis, dahinter „Bereich ≠ Gruppe" und die
 * weiteren Gruppen als „auch: …" (`projektion.hinweisspalte`). Mithörer
 * stehen nicht als eigene Zeilen unter ihren weiteren Gruppen: Auf dem Papier
 * steht jede Einheit einmal, dort, wo sie gerufen wird.
 *
 * „Letzter Kontakt" (F3) steht als „1431 Funkprobe", über der Schwelle mit
 * „über 60 min" in Worten — das Papier hat kein Bernstein —, und ein „kein
 * Kontakt" ohne späteren Kontakt dahinter. Gerechnet ist er zur Zeit der
 * Ausgabe; auf dem Blatt wird er mit Stift weitergeführt wie alles andere.
 */

import { projektion, type Funkplan, type Funkteilnehmer, type Rufgruppenkarte } from "@s1/domaene";

import { htmlMaskieren, type Ausgabekopf } from "./index.js";

/** Der Kopf des Funkplans: was die Ausgabe sonst trägt, dazu Führungsstelle und Akteur (§7). */
export interface Funkplankopf extends Ausgabekopf {
  readonly fuestName?: string;
  readonly uebergeordneteFuestName?: string;
  /** Wer die Ausgabe erstellt hat, etwa „Meier (FmZ)". */
  readonly erstelltVon?: string;
}

/** Der Satz im Fuß jeder Seite. */
export const FUNKPLAN_FUSSNOTE =
  "Änderungen handschriftlich nachtragen und im Rechner übernehmen. Funkprotokoll: eigener Vordruck.";

/** Die Spalten des Funkplans — Ausgabe und leerer Vordruck teilen sie. */
export const FUNKPLAN_SPALTEN: readonly { readonly kopf: string; readonly breite?: string }[] = [
  { kopf: "Einheit", breite: "24%" },
  { kopf: "Bereich", breite: "10%" },
  { kopf: "Funkrufname", breite: "18%" },
  { kopf: "Erreichbarkeit", breite: "19%" },
  { kopf: "Hinweis" },
  { kopf: "Letzter Kontakt", breite: "12%" },
];

export const FUNKPLAN_STIL = [
  "    @page { size: A4 portrait; margin: 12mm 10mm 14mm;",
  '      @bottom-right { content: "Blatt " counter(page) " von " counter(pages); font: 8pt system-ui, sans-serif; color: #444; } }',
  "    body { font-family: system-ui, sans-serif; font-size: 9.5pt; margin: 0; }",
  "    h1 { font-size: 15pt; margin: 0; }",
  "    .dkopf { display: flex; justify-content: space-between; gap: 8mm; border-bottom: 0.5mm solid #000; padding-bottom: 2mm; margin-bottom: 3mm; }",
  "    .dkopf dl { display: grid; grid-template-columns: auto auto; gap: 0 3mm; margin: 0; font-size: 8.5pt; }",
  "    .dkopf dt { color: #444; } .dkopf dd { margin: 0; font-weight: 600; }",
  "    table.funkplan { border-collapse: collapse; width: 100%; }",
  "    table.funkplan th, table.funkplan td { border: 0.3mm solid #888; padding: 0.8mm 1.5mm; text-align: left; vertical-align: top; }",
  "    table.funkplan thead th { background: #eee; font-size: 8.5pt; }",
  "    table.funkplan tr { break-inside: avoid; }",
  "    tr.rg td { background: #e4e4e4; font-weight: 700; break-after: avoid; }",
  "    tr.rg small { font-weight: 400; margin-left: 2mm; }",
  "    tr.leer td { height: 7mm; }",
  "    .fussz { display: flex; justify-content: space-between; gap: 6mm; font-size: 8pt; color: #444; margin-top: 3mm; }",
].join("\n");

function funkplankopfAlsHtml(kopf: Funkplankopf): string {
  const zeile = [
    kopf.einsatzName,
    kopf.fuestName === undefined ? undefined : `Führungsstelle ${kopf.fuestName}`,
    kopf.uebergeordneteFuestName === undefined ? undefined : `übergeordnet: ${kopf.uebergeordneteFuestName}`,
  ].filter((teil): teil is string => teil !== undefined && teil !== "");
  return [
    '<header class="dkopf">',
    `  <div><h1>Funkplan</h1><div>${zeile.map(htmlMaskieren).join(" · ")}</div></div>`,
    "  <dl>",
    `    <dt>Stand</dt><dd>${htmlMaskieren(kopf.stand)}</dd>`,
    ...(kopf.erstelltVon === undefined ? [] : [`    <dt>Erstellt</dt><dd>${htmlMaskieren(kopf.erstelltVon)}</dd>`]),
    "  </dl>",
    "</header>",
  ].join("\n");
}

const LEERE_ZEILE = `      <tr class="leer">${"<td></td>".repeat(FUNKPLAN_SPALTEN.length)}</tr>`;

function gruppenzeile(titel: string, zusatz: readonly (string | undefined)[]): string {
  const klein = zusatz.filter((teil): teil is string => teil !== undefined && teil !== "");
  const small = klein.length === 0 ? "" : ` <small>${klein.map(htmlMaskieren).join(" · ")}</small>`;
  return `      <tr class="rg"><td colspan="${String(FUNKPLAN_SPALTEN.length)}">${htmlMaskieren(titel)}${small}</td></tr>`;
}

/** „1250 Funkprobe · über 60 min · kein Kontakt 1305" — die Spalte „Letzter Kontakt" in Worten. */
export function kontaktspalte(t: Funkteilnehmer, schwelleMinuten: number): string {
  const kontakt = t.letzterKontakt;
  const kein = t.keinKontaktGemeldet;
  return [
    kontakt === undefined ? "" : projektion.kontaktText(kontakt),
    kontakt?.ueberSchwelle === true ? `über ${String(schwelleMinuten)} min` : "",
    kein === undefined ? "" : `kein Kontakt ${projektion.uhrzeitKurz(kein.zeitpunkt)}`,
  ]
    .filter((teil) => teil !== "")
    .join(" · ");
}

function teilnehmerzeile(t: Funkteilnehmer, schwelleMinuten: number): string {
  const zellen = [t.einheit, t.bereich, t.funkrufname, t.erreichbarkeit, projektion.hinweisspalte(t), kontaktspalte(t, schwelleMinuten)];
  return `      <tr>${zellen.map((z) => `<td>${htmlMaskieren(z)}</td>`).join("")}</tr>`;
}

function rufgruppeAlsHtml(r: Rufgruppenkarte, schwelleMinuten: number): string[] {
  const titel = `${projektion.betriebsartWort(r.betriebsart)} · ${r.name}`;
  const zusatz = [r.zweck, r.gateway === undefined ? undefined : `Gateway ${r.gateway}`, r.hoert === undefined ? undefined : `hört ${r.hoert}`];
  return [gruppenzeile(titel, zusatz), ...r.teilnehmer.map((t) => teilnehmerzeile(t, schwelleMinuten)), LEERE_ZEILE];
}

/** Der Funkplan als druckbare A4-Seite; `dateiname` erscheint rechts im Fuß. */
export function funkplanAlsHtml(plan: Funkplan, kopf: Funkplankopf, dateiname?: string): string {
  const geltend = plan.rufgruppen.filter((r) => !r.aufgeloest);
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `  <title>Funkplan — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    FUNKPLAN_STIL,
    "  </style>",
    "</head>",
    "<body>",
    funkplankopfAlsHtml(kopf),
    '  <table class="funkplan">',
    `    <thead><tr>${FUNKPLAN_SPALTEN.map((s) => `<th scope="col"${s.breite === undefined ? "" : ` style="width:${s.breite}"`}>${htmlMaskieren(s.kopf)}</th>`).join("")}</tr></thead>`,
    "    <tbody>",
    ...geltend.flatMap((r) => rufgruppeAlsHtml(r, plan.schwelleMinuten)),
    gruppenzeile("Ohne Rufgruppe", ["mit Ankunft zuordnen"]),
    ...plan.ohneRufgruppe.map((t) => teilnehmerzeile(t, plan.schwelleMinuten)),
    LEERE_ZEILE,
    LEERE_ZEILE,
    "    </tbody>",
    "  </table>",
    `  <p class="fussz"><span>${htmlMaskieren(FUNKPLAN_FUSSNOTE)}</span>${dateiname === undefined ? "" : `<span>S1-Control · ${htmlMaskieren(dateiname)}</span>`}</p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
