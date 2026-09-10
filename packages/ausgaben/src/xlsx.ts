/**
 * Die Auswertung als XLSX (M4.2).
 *
 * Vorbild ist das Blatt „Auswertung“ der Excel (Bestandsaufnahme
 * `excel-domaenenmodell.md` §4.4): eine **flache, filterbare Tabelle** aller
 * Einheiten mit demselben Spaltenlayout wie das Blatt „Stärke“, plus einer
 * Spalte für den Bereich. Die Vorlage füllt sie per Makro; hier entsteht sie
 * aus dem Zustand.
 *
 * **Warum das die nützlichste Ausgabe für die Führungsstelle ist:** Sie ist
 * die einzige, die die Bereichszugehörigkeit als **Attribut** führt und nicht
 * als Zeilenposition. Erst damit lässt sich filtern, sortieren und
 * weiterrechnen — und genau das tut eine Führungsstelle nach dem Einsatz.
 *
 * **Warum ein eigener Schreiber.** Eine XLSX-Datei ist ein ZIP mit einer
 * Handvoll XML-Dateien darin. Was hier gebraucht wird, ist der kleinste
 * Ausschnitt: ein Blatt, Text und Zahlen, ein Autofilter, eine fixierte
 * Kopfzeile. Das sind fünf Dateien, und sie stehen unten vollständig. Eine
 * Tabellenbibliothek wäre eine Abhängigkeit mehr in einem Produkt, das ohne
 * Admin-Rechte auf Führungsstellen-Rechnern läuft.
 *
 * **Keine Formeln.** Die Vorlage rechnet in Zeile 3 mit `SUBTOTAL(9;…)`, damit
 * die Summen dem Filter folgen. Hier stehen **Werte**: Eine Formel, die eine
 * Zahl aus dem Zustand nachrechnet, ist eine zweite Wahrheit über dieselbe
 * Größe — und wenn sie abweicht, weiß niemand, welche gilt. Die Summenzeile
 * trägt deshalb die Summe über **alle** Zeilen, und das steht in ihrer
 * Beschriftung.
 */

import { projektion, type Spalte, type Zustand } from "@s1/domaene";

import { schreibeZip, textEintrag, type Zipoptionen } from "./zip.js";

/** Die Spalte, die das Blatt „Auswertung“ der Excel zusätzlich führt (§4.4). */
export const SPALTE_BEREICH = "Bereich";

/** Maskiert die fünf in XML bedeutsamen Zeichen. */
export function xmlMaskieren(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Entfernt Zeichen, die in einer XLSX-Zelle nicht stehen dürfen.
 *
 * Das Format erlaubt keine Steuerzeichen unterhalb von `0x20` außer
 * Tabulator, Zeilenumbruch und Wagenrücklauf. Ein Bediener bekommt sie
 * normalerweise nicht in ein Feld — aber ein Erfassungsbogen kann sie
 * mitbringen, und eine Datei, die Excel mit „nicht lesbarer Inhalt“ öffnet,
 * ist schlimmer als eine ohne dieses eine Zeichen.
 */
export function zellentext(text: string): string {
  // Die Regel steht als Bereichspruefung und nicht als regulaerer Ausdruck:
  // Ein Ausdruck mit Steuerzeichen darin ist eine haeufige Fehlerquelle — der
  // Lint verbietet ihn aus genau diesem Grund —, und die Absicht ist hier
  // ohnehin eine Zahlenbedingung und kein Muster.
  let sauber = "";
  for (const zeichen of text) {
    const punkt = zeichen.codePointAt(0) ?? 0;
    const erlaubt =
      punkt >= 0x20 || punkt === 0x09 /* Tabulator */ || punkt === 0x0a /* Zeilenumbruch */ || punkt === 0x0d; /* Wagenruecklauf */
    if (erlaubt) sauber += zeichen;
  }
  return sauber;
}

/** Eine Spalte der Ausgabe: Überschrift und ob sie eine Zahl trägt. */
interface Ausgabespalte {
  readonly kopf: string;
  readonly zahl: boolean;
}

/**
 * Der Spaltenname in A1-Schreibweise: 1 → `A`, 27 → `AA`.
 *
 * Die Vorlage geht bis `AM`; die Rechnung hier ist allgemein, weil eine
 * zusätzliche Feldgruppe sie sonst still überliefe.
 */
export function spaltenname(nummer: number): string {
  let rest = nummer;
  let name = "";
  while (rest > 0) {
    const stelle = (rest - 1) % 26;
    name = String.fromCharCode(65 + stelle) + name;
    rest = Math.floor((rest - stelle) / 26);
  }
  return name;
}

interface Zeilenwerte {
  readonly werte: readonly (string | number)[];
}

/**
 * Welche Spalten als Zahl geschrieben werden.
 *
 * `gesamt` ist in der Spaltentabelle als `berechnet` geführt, weil sie sich
 * nicht bearbeiten lässt (M3.2) — eine Zahl ist sie trotzdem, und in einer
 * Auswertung ist sie die Spalte, die am häufigsten summiert wird.
 */
function istZahlenspalte(spalte: Spalte): boolean {
  return spalte.art === "zahl" || spalte.schluessel === "gesamt";
}

/**
 * Die Zeilen der Auswertung — eine je Einheit, ohne Ausschnitt.
 *
 * **Ohne Ausschnitt, anders als die Tabelle in der Oberfläche** (M3.7): Eine
 * Auswertung, die nur die erste Seite enthielte, wäre keine. Bei 5.000
 * Einheiten ist das eine Datei von einigen hundert Kilobyte und ein Vorgang,
 * den jemand einmal anstößt — nicht einer, der bei jeder Änderung läuft.
 *
 * **Mit den stillgelegten Einheiten.** Entfernte und aufgegangene stehen mit
 * darin: §5.4.5 lässt sie im Zustand, und eine Auswertung, die sie
 * verschwiegen hätte, wäre als Nachweis nach dem Einsatz weniger wert.
 */
function zeilen(zustand: Zustand, spalten: readonly Spalte[]): readonly Zeilenwerte[] {
  const ausschnitt = projektion.einheitentabelle(zustand, { mitStillgelegten: true });
  return ausschnitt.zeilen.map((zeile) => {
    const abschnitt = zustand.abschnitte[zeile.abschnittId];
    const bereich = typeof abschnitt?.name.wert === "string" ? abschnitt.name.wert : zeile.abschnittId;
    const werte: (string | number)[] = [bereich];
    for (const spalte of spalten) {
      const text = zeile.zellen[spalte.schluessel]?.text ?? "";
      // Zahlen als Zahlen und nicht als Text: Eine Spalte mit Textzahlen
      // lässt sich in Excel nicht summieren, und genau dafür ist dieses
      // Blatt da.
      if (istZahlenspalte(spalte)) {
        const wert = Number.parseInt(text, 10);
        werte.push(Number.isNaN(wert) ? 0 : wert);
      } else {
        werte.push(zellentext(text));
      }
    }
    return { werte };
  });
}

export interface Auswertungsoptionen extends Zipoptionen {
  /**
   * Welche Spaltengruppen mitkommen; ohne Angabe **alle**.
   *
   * Die Vorlage zeigt in der Auswertung alles und blendet die
   * Ressourcenspalten per Knopf aus (§4.4). Eine Datei, die man weglegt,
   * sollte vollständig sein — filtern kann man in Excel, nachtragen nicht.
   */
  readonly gruppen?: readonly projektion.Spaltengruppe[];
  /** Der Stand, wie er in Zelle A1 steht. */
  readonly stand?: string;
}

/**
 * Baut die Auswertung als XLSX-Datei.
 *
 * Der Aufbau ist der kleinste, den das Format zulässt:
 *
 * ```
 * [Content_Types].xml         welche Teile welchen Typ haben
 * _rels/.rels                 der Verweis auf die Arbeitsmappe
 * xl/workbook.xml             eine Arbeitsmappe mit einem Blatt
 * xl/_rels/workbook.xml.rels  der Verweis auf das Blatt
 * xl/worksheets/sheet1.xml    die Zeilen
 * ```
 *
 * **Ohne `sharedStrings.xml`.** Das Format kennt eine Zeichenkettentabelle,
 * die Wiederholungen einspart; sie ist optional, und Zellen dürfen ihren Text
 * über `t="inlineStr"` direkt tragen. Bei einer Auswertung mit 150 Zeilen
 * spart die Tabelle wenige Kilobyte und kostet eine weitere Datei mit einer
 * eigenen Indexordnung, in der sich ein Fehler still versteckt.
 */
export function auswertungAlsXlsx(zustand: Zustand, optionen: Auswertungsoptionen = {}): Uint8Array {
  const gruppen = optionen.gruppen ?? projektion.SPALTENGRUPPEN;
  const spalten = projektion.spaltenDerGruppen(gruppen);
  const koepfe: Ausgabespalte[] = [
    { kopf: SPALTE_BEREICH, zahl: false },
    ...spalten.map((spalte) => ({ kopf: spalte.kopf, zahl: istZahlenspalte(spalte) })),
  ];
  const daten = zeilen(zustand, spalten);
  const einsatzName =
    typeof zustand.einsatz?.name.wert === "string" ? zustand.einsatz.name.wert : "(ohne Namen)";
  const stand = optionen.stand ?? "";

  return schreibeZip(
    [
      textEintrag("[Content_Types].xml", INHALTSTYPEN),
      textEintrag("_rels/.rels", WURZELVERWEISE),
      textEintrag("xl/workbook.xml", ARBEITSMAPPE),
      textEintrag("xl/_rels/workbook.xml.rels", MAPPENVERWEISE),
      textEintrag(
        "xl/worksheets/sheet1.xml",
        baueBlatt(koepfe, daten, `${einsatzName}${stand === "" ? "" : ` — ${stand}`}`),
      ),
    ],
    optionen,
  );
}

/**
 * Eine Zelle: Zahl oder eingebettete Zeichenkette.
 *
 * **Eine leere Zelle wird weggelassen.** Das Format erlaubt Lücken — jede
 * Zelle nennt ihren Bezug (`r="C7"`), die Position ergibt sich also nicht aus
 * der Reihenfolge. Ein `<c t="inlineStr"/>` ohne `<is>`-Kind wäre eine Zelle,
 * die einen Text ankündigt und keinen mitbringt: zulässig genug, dass zwei
 * fremde Leser sie annehmen (nachgemessen mit LibreOffice und openpyxl), aber
 * ohne Aussage — und bei 41 Zeilen mit 28 Spalten sind es einige Kilobyte
 * Ankündigung ohne Inhalt.
 */
function zelle(spalte: number, zeile: number, wert: string | number): string {
  const bezug = `${spaltenname(spalte)}${String(zeile)}`;
  if (typeof wert === "number") return `<c r="${bezug}"><v>${String(wert)}</v></c>`;
  if (wert === "") return "";
  return `<c r="${bezug}" t="inlineStr"><is><t xml:space="preserve">${xmlMaskieren(wert)}</t></is></c>`;
}

/** Die drei Kopfzeilen: Stand, Summen, Spaltennamen. */
const KOPFZEILEN = 3;

function baueBlatt(
  koepfe: readonly Ausgabespalte[],
  daten: readonly Zeilenwerte[],
  titel: string,
): string {
  const letzte = spaltenname(koepfe.length);
  const zeilenXml: string[] = [];

  // Zeile 1: der Stand. Die Vorlage führt ihn in `B1` (§4.4); hier steht er
  // in A1, weil dieses Blatt keine Hilfsspalte davor hat.
  zeilenXml.push(`<row r="1">${zelle(1, 1, titel)}</row>`);

  // Zeile 2: die Summenzeile. **Werte, keine Formeln** — siehe Dateikopf.
  const summen: (string | number)[] = ["Summe über alle Zeilen"];
  for (let spalte = 1; spalte < koepfe.length; spalte += 1) {
    if (!(koepfe[spalte] as Ausgabespalte).zahl) {
      summen.push("");
      continue;
    }
    summen.push(
      daten.reduce((summe, zeile) => {
        const wert = zeile.werte[spalte];
        return summe + (typeof wert === "number" ? wert : 0);
      }, 0),
    );
  }
  zeilenXml.push(
    `<row r="2">${summen.map((wert, stelle) => zelle(stelle + 1, 2, wert)).join("")}</row>`,
  );

  // Zeile 3: die Kopfzeile — sie trägt den Autofilter und bleibt beim
  // Scrollen stehen. Beides tut die Vorlage auch.
  zeilenXml.push(
    `<row r="3">${koepfe.map((kopf, stelle) => zelle(stelle + 1, 3, kopf.kopf)).join("")}</row>`,
  );

  for (const [stelle, zeile] of daten.entries()) {
    const nummer = stelle + KOPFZEILEN + 1;
    zeilenXml.push(
      `<row r="${String(nummer)}">${zeile.werte
        .map((wert, spalte) => zelle(spalte + 1, nummer, wert))
        .join("")}</row>`,
    );
  }

  const letzteZeile = daten.length + KOPFZEILEN;
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    // Die Kopfzeile bleibt stehen: Wer 150 Zeilen durchsieht, verliert sonst
    // nach der zwanzigsten die Spaltennamen.
    '<sheetViews><sheetView workbookViewId="0" tabSelected="1">',
    '<pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>',
    "</sheetView></sheetViews>",
    `<sheetData>${zeilenXml.join("")}</sheetData>`,
    `<autoFilter ref="A3:${letzte}${String(letzteZeile)}"/>`,
    "</worksheet>",
  ].join("");
}

const INHALTSTYPEN = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
  '<Default Extension="xml" ContentType="application/xml"/>',
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>',
  "</Types>",
].join("");

const WURZELVERWEISE = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>',
  "</Relationships>",
].join("");

const ARBEITSMAPPE = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
  '<sheets><sheet name="Auswertung" sheetId="1" r:id="rId1"/></sheets>',
  "</workbook>",
].join("");

const MAPPENVERWEISE = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
  "</Relationships>",
].join("");
