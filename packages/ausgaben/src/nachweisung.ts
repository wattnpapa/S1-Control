/**
 * Die Nachweisung als Ausgabe (KONZEPT-NACHRICHTEN.md §7): A4 hoch, eine Zeile
 * je Nachricht in der Ordnung, in der der Aufrufer sie übergibt (nach Nummer).
 *
 * Das ist die Liste der Fernmeldezentrale, soweit der Vordruck sie führt
 * (Feld 5 des Vordrucks 1103.1). Sie hängt am Platz und wird auf Papier
 * weitergeführt, wenn der Rechner steht — deshalb stehen die Zeiten so, wie
 * der Vordruck sie schreibt: Uhrzeit vierstellig, die Zeit der Abfassung und
 * der Aufnahme als Datum-Zeit-Gruppe.
 *
 * Die Rechnung steht in Ring 2 (`projektion.nachrichtenausschnitt`); hier
 * entsteht nur die Seite. Zurückgezogene Nachrichten bleiben stehen und
 * tragen die Marke: Ihre Nummer ist auf Papier vergeben.
 */

import { datumZeitGruppe, projektion, type Nachrichtenzeile } from "@s1/domaene";

import { druckseiteAlsHtml, tabellenrahmen } from "./druckseite.js";
import { htmlMaskieren, type Ausgabekopf } from "./index.js";

export interface Nachweisungsdaten {
  readonly kopf: Ausgabekopf;
  readonly fuestName: string;
  /** Wer die Ausgabe erstellt hat, etwa „Meier (FmZ)". */
  readonly akteur: string;
  readonly zeilen: readonly Nachrichtenzeile[];
}

/** Der Satz unter der Tabelle. */
export const NACHWEISUNG_FUSSNOTE = "Nachweisung nach Vordruck 1103.1, Feld 5";

const SPALTEN: readonly { readonly kopf: string; readonly breite: string }[] = [
  { kopf: "Nr.", breite: "5%" },
  { kopf: "E/A", breite: "4%" },
  { kopf: "Vorrang", breite: "6%" },
  { kopf: "Aufnahme", breite: "9%" },
  { kopf: "Annahme", breite: "7%" },
  { kopf: "Beförderung", breite: "7%" },
  { kopf: "Abfassung", breite: "9%" },
  { kopf: "Absender", breite: "11%" },
  { kopf: "Anschrift", breite: "11%" },
  { kopf: "Betreff", breite: "14%" },
  { kopf: "Sichtung", breite: "7%" },
  { kopf: "Marke", breite: "10%" },
];

const VORRANG: Readonly<Record<string, string>> = { SOFORT: "Sofort", BLITZ: "Blitz" };

/** Uhrzeit vierstellig in Berliner Zeit, „1045"; leer bei ungültigem Zeitpunkt. */
function uhrzeit(iso: string): string {
  return datumZeitGruppe(iso).slice(2, 6);
}

/** „1045 KL" — Uhrzeit und Handzeichen eines Vermerks, leer ohne Vermerk. */
function vermerkText(vermerk: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined): string {
  if (vermerk === undefined) return "";
  return [uhrzeit(vermerk.zeitpunkt), vermerk.handzeichen].filter((t) => t !== "").join(" ");
}

/**
 * Die Marken einer Zeile: doppelte Nummer, Gesprächsnotiz, zurückgezogen und
 * — additiv, 2026-11-17 — der Weg aus dem Übermittlungsvorschlag des LdF mit
 * seinem Handzeichen.
 */
export function nachweisungMarken(zeile: Nachrichtenzeile): readonly string[] {
  const weg = zeile.vorschlag;
  return [
    ...(zeile.nummerDoppelt ? ["Nr. doppelt"] : []),
    ...(weg === undefined ? [] : [`Weg ${projektion.mittelWort(weg.mittel)} (LdF ${weg.handzeichen})`]),
    ...(zeile.gespraechsnotiz ? ["GN"] : []),
    // Additiv (SGL P0-1, LdF P1-2): hinter der FmZ, aber ohne Nummer.
    ...(projektion.standDerZeile(zeile).ohneNummer ? ["ohne Nummer"] : []),
    ...(zeile.zurueckgezogen ? ["zurückgezogen"] : []),
  ];
}

/**
 * Die zweite Zeile je Nachricht (Sichter-Audit): Verteiler mit Kopiefarbe
 * und die Vermerke der Sichtung, wie sie auf dem Vordruck in Feld 19 und 20
 * stehen. Ohne Sichtung und Vermerke entfällt sie.
 */
function zweiteZeile(zeile: Nachrichtenzeile): string | undefined {
  const verteiler = zeile.verteiler.map((m) => `${projektion.stellenWort(m.stelle)} (${projektion.kopieWort(m.kopie)})`).join(", ");
  const teile = [
    zeile.sichtung === undefined ? "" : `Sichtung ${vermerkText(zeile.sichtung)}${verteiler === "" ? "" : ` · Verteiler: ${verteiler}`}`,
    zeile.vermerke === undefined ? "" : `Vermerke: ${zeile.vermerke}`,
  ].filter((t) => t !== "");
  if (teile.length === 0) return undefined;
  return `      <tr class="unterzeile"><td></td><td colspan="${String(SPALTEN.length - 1)}">${htmlMaskieren(teile.join(" · "))}</td></tr>`;
}

/**
 * Der Fuß der Folge (LdF P2-2, ETB P2-2): „Nummern 1 bis 4; fehlende Nummern:
 * 3 · ohne Nummer: 2 · zurückgezogen: 1" — oder „lückenlos".
 */
export function nummernfuss(zeilen: readonly Nachrichtenzeile[]): string {
  const nummern = zeilen.flatMap((z) => (z.nummer === undefined ? [] : [z.nummer]));
  const ohne = zeilen.filter((z) => z.nummer === undefined && !z.zurueckgezogen).length;
  const zurueck = zeilen.filter((z) => z.zurueckgezogen).length;
  const folge = nummern.length === 0 ? "Noch keine Nummer vergeben" : `Nummern 1 bis ${String(Math.max(...nummern))}`;
  const luecken = projektion.nummernluecken(zeilen);
  const lueckentext = luecken.length === 0 ? "lückenlos" : `Fehlende Nummern: ${projektion.nummernlueckenText(luecken)}`;
  return `${folge}; ${lueckentext} · ohne Nummer: ${String(ohne)} · zurückgezogen: ${String(zurueck)}`;
}

function zeileAlsHtml(zeile: Nachrichtenzeile): string {
  const zellen = [
    zeile.nummer === undefined ? "" : String(zeile.nummer),
    zeile.richtungKurz,
    VORRANG[zeile.vorrang ?? ""] ?? "",
    zeile.aufnahme === undefined ? "" : datumZeitGruppe(zeile.aufnahme.zeitpunkt),
    vermerkText(zeile.annahme),
    vermerkText(zeile.befoerderung),
    zeile.abfassungszeit === undefined ? "" : datumZeitGruppe(zeile.abfassungszeit),
    zeile.absender,
    zeile.anschrift,
    zeile.betreff,
    vermerkText(zeile.sichtung),
    nachweisungMarken(zeile).join(", "),
  ];
  const unter = zweiteZeile(zeile);
  return [`      <tr>${zellen.map((z) => `<td>${htmlMaskieren(z)}</td>`).join("")}</tr>`, ...(unter === undefined ? [] : [unter])].join("\n");
}

/** Die Nachweisung als druckbare A4-Seite. */
export function nachweisungAlsHtml(daten: Nachweisungsdaten): string {
  const kopfzeile = [
    '  <h2>Nachweisung</h2>',
    `  <p class="hinweis">Führungsstelle ${htmlMaskieren(daten.fuestName)} · ${String(daten.zeilen.length)} Nachrichten</p>`,
  ];
  const tabelle = [
    '  <table class="liste" style="font-size:7.5pt">',
    `    <thead><tr>${SPALTEN.map((s) => `<th scope="col" style="width:${s.breite}">${htmlMaskieren(s.kopf)}</th>`).join("")}</tr></thead>`,
    "    <tbody>",
    ...daten.zeilen.map(zeileAlsHtml),
    "    </tbody>",
    "  </table>",
  ].join("\n");
  return druckseiteAlsHtml({
    titel: "Nachweisung",
    kopf: daten.kopf,
    querformat: false,
    inhalt: [
      ...kopfzeile,
      tabellenrahmen(tabelle),
      `  <p class="hinweis"><strong>${htmlMaskieren(nummernfuss(daten.zeilen))}</strong></p>`,
      `  <p class="hinweis">Erstellt ${htmlMaskieren(daten.kopf.stand)} · ${htmlMaskieren(daten.akteur)}</p>`,
      `  <p class="hinweis">${htmlMaskieren(NACHWEISUNG_FUSSNOTE)}</p>`,
    ],
  });
}
