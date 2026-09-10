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
      textEintrag("xl/workbook.xml", arbeitsmappe("Auswertung")),
      textEintrag("xl/_rels/workbook.xml.rels", MAPPENVERWEISE),
      textEintrag(
        "xl/worksheets/sheet1.xml",
        baueBlatt(koepfe, daten, `${einsatzName}${stand === "" ? "" : ` — ${stand}`}`),
      ),
    ],
    optionen,
  );
}

// ---------------------------------------------------------------------------
// Der Oldenburger Block (M4.2, zweite Ausgabevariante)
// ---------------------------------------------------------------------------

/**
 * Die Spalten des Blatts „Stärke" in **ihrer** Reihenfolge, B bis AM.
 *
 * **Wozu eine zweite Spaltenordnung.** Die Auswertung oben ist unsere Ausgabe:
 * die Spalten in der Ordnung, in der sie in der Oberfläche stehen, den Bereich
 * als eigene Spalte. Der Oldenburger Block ist etwas anderes — er ist der
 * Block, den eine Führungsstelle in ihre gewohnte Excel **einfügt**. Dafür
 * muss die Spaltenfolge Zeichen für Zeichen die des Blatts „Stärke" sein
 * (`excel-domaenenmodell.md` §2, Spalten B..AW), einschließlich der Spalten,
 * die S1-Control nicht führt, und einschließlich der beiden versteckten
 * Reservespalten X und Y. Eine Spalte zu wenig, und alles dahinter landet um
 * eins verschoben in der Vorlage.
 *
 * Dieselbe Zuordnung benutzt die Erfassungsbogen-App für ihren Export
 * (`excel-vba-workflows.md` §11.7); dort bleiben die Spalten leer, die der
 * Führungsstelle gehören. Hier ist es umgekehrt: Die Führungsstelle füllt sie,
 * und leer bleiben die, die im Zielmodell (noch) nicht vorkommen — Ablösung,
 * Anforderungs-ID und die Zusagen (Spalten N bis S), Stufe 2 nach
 * Entscheidung 1.
 *
 * `AN..AW` fehlen: Die Kostenübersicht ist in der Vorlage durchweg Formel und
 * rechnet sich nach dem Einfügen selbst aus. Sie mit Werten zu überschreiben,
 * nähme der Vorlage ihre Rechnung.
 */
const OLDENBURG_SPALTEN: readonly {
  readonly excel: string;
  readonly kopf: string;
  readonly quelle: string;
}[] = [
  { excel: "B", kopf: "FüSt.", quelle: "fuestKennung" },
  { excel: "C", kopf: "Bezeichnung", quelle: "bezeichnung" },
  { excel: "D", kopf: "Organisation", quelle: "organisation" },
  { excel: "E", kopf: "Herkunft", quelle: "herkunft" },
  // F bis I sind **eine** Angabe der Excel in vier Spalten: Die Bezeichnung
  // steht in der Spalte der Ebene, die anderen drei bleiben leer. Im
  // Zielmodell ist das ein Feld (`ebene`, ZDM §2.8) — die Aufteilung ist eine
  // Eigenheit der Vorlage und wird hier nur für sie wiederhergestellt.
  { excel: "F", kopf: "Zug", quelle: "ebene:ZUG" },
  { excel: "G", kopf: "Trupp o. Staffel", quelle: "ebene:TRUPP" },
  { excel: "H", kopf: "Gruppe", quelle: "ebene:GRUPPE" },
  { excel: "I", kopf: "Person", quelle: "ebene:PERSON" },
  { excel: "J", kopf: "Geräte / Fahrzeuge", quelle: "geraete" },
  { excel: "K", kopf: "Aufträge", quelle: "auftraege" },
  { excel: "L", kopf: "Erreichbarkeit", quelle: "erreichbarkeit" },
  { excel: "M", kopf: "Verfügbar bis", quelle: "verfuegbarBis" },
  { excel: "N", kopf: "Ablösung angefordert", quelle: "" },
  { excel: "O", kopf: "Anforderungs-ID", quelle: "" },
  { excel: "P", kopf: "Zugesagt für", quelle: "" },
  { excel: "Q", kopf: "Zugesagt von (Org.)", quelle: "" },
  { excel: "R", kopf: "Vorgesehene Einheit", quelle: "" },
  { excel: "S", kopf: "Vorgesehener Auftrag", quelle: "" },
  { excel: "T", kopf: "eingetr. / zugew.", quelle: "eingetroffenAm" },
  { excel: "U", kopf: "Einsatzende", quelle: "einsatzendeAm" },
  { excel: "V", kopf: "Rückführung", quelle: "rueckfuehrungAm" },
  { excel: "W", kopf: "Bemerkungen", quelle: "bemerkung" },
  { excel: "X", kopf: "Reserve 1", quelle: "" },
  { excel: "Y", kopf: "Reserve 2", quelle: "" },
  { excel: "Z", kopf: "Status", quelle: "status" },
  { excel: "AA", kopf: "Schicht", quelle: "schicht" },
  { excel: "AB", kopf: "ID Einheiten-erfassungsbogen", quelle: "einheitSchluessel" },
  { excel: "AC", kopf: "Weibl.", quelle: "zahl:weiblich" },
  { excel: "AD", kopf: "Div.", quelle: "zahl:divers" },
  { excel: "AE", kopf: "Veget.", quelle: "zahl:vegetarisch" },
  { excel: "AF", kopf: "Vegan.", quelle: "zahl:vegan" },
  { excel: "AG", kopf: "ÜN (m)", quelle: "zahl:uebernachtungM" },
  { excel: "AH", kopf: "ÜN (w)", quelle: "zahl:uebernachtungW" },
  { excel: "AI", kopf: "ÜN (d)", quelle: "zahl:uebernachtungD" },
  { excel: "AJ", kopf: "Fü", quelle: "staerke:fuehrer" },
  { excel: "AK", kopf: "Ufü", quelle: "staerke:unterfuehrer" },
  { excel: "AL", kopf: "He", quelle: "staerke:mannschaft" },
  { excel: "AM", kopf: "Gesamt", quelle: "gesamt" },
];

/**
 * Welche Ebene in welche der vier Spalten F..I gehört.
 *
 * Die Vorlage kennt vier Schubladen, das Zielmodell zehn Ebenen (ZDM §2.8).
 * Die Zuordnung ist damit eine Vergröberung und keine Umbenennung: Alles
 * oberhalb des Zuges steht in „Zug", weil die Vorlage für einen Verband keine
 * eigene Spalte hat und eine Bereitschaft dort besser aufgehoben ist als
 * nirgends. `UNBESTIMMT` bekommt keine der vier Spalten — eine Einheit ohne
 * Ebene in eine Ebenenspalte zu schreiben, wäre eine Behauptung.
 */
const EBENENSPALTE: Readonly<Record<string, string>> = {
  GROSSVERBAND: "ZUG",
  ABTEILUNG: "ZUG",
  BEREITSCHAFT: "ZUG",
  ZUG: "ZUG",
  ZUGTRUPP: "TRUPP",
  TRUPP: "TRUPP",
  STAFFEL: "TRUPP",
  GRUPPE: "GRUPPE",
  PERSON: "PERSON",
};

/** Der Wert einer Oldenburg-Spalte für eine Einheitenzeile. */
function oldenburgWert(
  zeile: projektion.Tabellenzeile,
  quelle: string,
): string | number {
  if (quelle === "") return "";
  // Die Gesamtstärke ist in der Vorlage `=SUM(AJn:ALn)`; hier steht der Wert.
  // Als **Zahl**, sonst rechnet die eingefügte Zeile nicht mit (§4.4).
  if (quelle === "gesamt") return zeile.gesamt;
  const [art, teil] = quelle.split(":");
  if (teil === undefined) return zellentext(zeile.zellen[art as string]?.text ?? "");
  if (art === "ebene") {
    const ebene = zeile.zellen["ebene"]?.text ?? "";
    return EBENENSPALTE[ebene] === teil ? zellentext(zeile.anzeige) : "";
  }
  if (art === "staerke") {
    return zeile.staerke[teil as keyof projektion.Tabellenzeile["staerke"]];
  }
  // `zahl:` — die Logistikspalten. Sie stehen im Zustand als Zahl und in der
  // Zelle als Text; die Vorlage summiert sie, also müssen sie Zahl bleiben.
  const wert = Number.parseInt(zeile.zellen[teil]?.text ?? "", 10);
  return Number.isNaN(wert) ? 0 : wert;
}

export interface Oldenburgoptionen extends Zipoptionen {
  /** Der Stand, wie er über dem Block steht. */
  readonly stand?: string;
}

/**
 * Baut den Oldenburger Block als XLSX — die Exportvariante aus M4.2.
 *
 * **Was das ist und was es nicht ist.** Es ist der Übergabeweg für eine
 * Führungsstelle, die weiter mit ihrer Excel arbeitet: Spalten B bis AM in
 * der Ordnung der Vorlage, je Abschnitt eine Überschriftenzeile mit dem
 * Namen in Spalte B — genau so führt das Blatt „Stärke" seine Einsatzstellen
 * (`excel-domaenenmodell.md` §2, Spalte B) —, darunter die Einheiten in der
 * Reihenfolge des Abschnittsbaums. Der Block lässt sich in die Vorlage
 * einfügen, ohne dass eine Spalte verrutscht.
 *
 * Es ist **kein** Ersatz für die Vorlage und kein Rückweg: Wer den Block
 * einfügt, führt die Lage ab da in der Excel weiter. Ein Reimport von dort
 * gibt es nicht, und er ist auch nicht vorgesehen — die Ereignisse sind die
 * Aufzeichnung (KONZEPT-EREIGNISSE.md §1), nicht der Zellinhalt.
 *
 * **Keine Summenzeile, kein Autofilter, keine fixierte Kopfzeile.** Alles
 * drei bringt die Vorlage selbst mit; ein zweiter Autofilter im eingefügten
 * Block wäre einer zu viel.
 */
export function oldenburgAlsXlsx(zustand: Zustand, optionen: Oldenburgoptionen = {}): Uint8Array {
  const zeilenXml: string[] = [];
  let nummer = 1;

  const kopf = optionen.stand ?? "";
  if (kopf !== "") {
    zeilenXml.push(`<row r="${String(nummer)}">${zelle(1, nummer, zellentext(kopf))}</row>`);
    nummer += 1;
  }
  zeilenXml.push(
    `<row r="${String(nummer)}">${OLDENBURG_SPALTEN.map((spalte, stelle) =>
      zelle(stelle + 1, nummer, spalte.kopf),
    ).join("")}</row>`,
  );
  nummer += 1;

  // Die Reihenfolge ist die des Abschnittsbaums und nicht die der Einheiten:
  // Der Block soll so aussehen wie das Blatt, in das er eingefügt wird, und
  // dort steht die Lage nach Einsatzstellen sortiert (§5.3).
  for (const knoten of projektion.baumZeilen(projektion.abschnittsbaum(zustand))) {
    const einheiten = projektion.einheitentabelle(zustand, { abschnittId: knoten.id }).zeilen;
    // Ein Abschnitt ohne Einheiten bekommt keine Zeile: Dieselbe Regel wendet
    // das Druckblatt an (K7), und ein eingefügter Block soll die Vorlage nicht
    // mit leeren Überschriften auffüllen.
    if (einheiten.length === 0) continue;
    zeilenXml.push(`<row r="${String(nummer)}">${zelle(1, nummer, zellentext(knoten.name))}</row>`);
    nummer += 1;
    for (const einheit of einheiten) {
      zeilenXml.push(
        `<row r="${String(nummer)}">${OLDENBURG_SPALTEN.map((spalte, stelle) =>
          zelle(stelle + 1, nummer, oldenburgWert(einheit, spalte.quelle)),
        ).join("")}</row>`,
      );
      nummer += 1;
    }
  }

  const blatt = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    `<sheetData>${zeilenXml.join("")}</sheetData>`,
    "</worksheet>",
  ].join("");

  return schreibeZip(
    [
      textEintrag("[Content_Types].xml", INHALTSTYPEN),
      textEintrag("_rels/.rels", WURZELVERWEISE),
      textEintrag("xl/workbook.xml", arbeitsmappe("Stärke")),
      textEintrag("xl/_rels/workbook.xml.rels", MAPPENVERWEISE),
      textEintrag("xl/worksheets/sheet1.xml", blatt),
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

/**
 * Die Arbeitsmappe mit ihrem einen Blatt.
 *
 * Der Blattname geht hinein, weil es zwei Ausgaben gibt: die Auswertung und
 * den Oldenburger Block. Wer die zweite Datei oeffnet, soll am Reiter sehen,
 * was er vor sich hat.
 */
function arbeitsmappe(blattname: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    `<sheets><sheet name="${xmlMaskieren(blattname)}" sheetId="1" r:id="rId1"/></sheets>`,
    "</workbook>",
  ].join("");
}

const MAPPENVERWEISE = [
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>',
  "</Relationships>",
].join("");
