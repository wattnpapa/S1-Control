/**
 * Der Nachrichtenvordruck als PDF (Konzept Nachrichten, Abschnitte 7 und 8).
 *
 * Der Adapter legt zwischen eine Nachricht und die Bibliothek
 * `bos-nachrichtenvordruck`. Er nimmt eine **eigene, flache Eingabe** entgegen
 * (`Nachrichtendruck`: nur Zeichenketten, Wahrheitswerte und ISO-Zeitpunkte),
 * nicht den Zustand und nicht die Projektion aus `@s1/domaene`. Wer die
 * Projektion baut, bildet sie auf diese Eingabe ab; so bleibt der Adapter
 * unabhaengig davon, wie die Projektion einmal heisst.
 *
 * Ring 3 ohne `node:` und ohne DOM: jsPDF braucht fuer reine Text- und
 * Vektorausgabe weder das eine noch das andere. Die Bytes legt die Schale ab.
 *
 * Was die Bibliothek nicht exportiert und deshalb hier steht: der Zeichenfilter
 * fuer Windows-1252 (`druckbar`; folgt `web/src/spalten.ts` der Bibliothek).
 * Die Datum-Zeit-Gruppe kommt aus `@s1/domaene`.
 */

import { datumZeitGruppe, projektion } from "@s1/domaene";
import { jsPDF } from "jspdf";
import {
  VordruckDaten,
  nachrichtenvordruckInhaltTeilen,
  zeichneNachrichtenvordruck,
  type NachrichtenvordruckAnkreuzfeld,
  type Uebermittlungsweg,
  type VordruckVermerk,
} from "bos-nachrichtenvordruck";

import { zeichneRueckzugsstempel, zusatzUebernehmen, type Nachrichtenrueckzug } from "./nachrichtstempel.js";

/** Ein Vermerk im Kopf des Vordrucks: wer, wann, mit welchem Mittel. */
export interface Nachrichtenvermerk {
  readonly mittel?: string;
  readonly zeitpunkt: string;
  readonly handzeichen: string;
}

/** Der Übermittlungsvorschlag des LdF (additiv, 2026-11-17): Weg, Fernmelder, Gegenstelle. */
export interface Nachrichtenvorschlag extends Nachrichtenvermerk {
  readonly fernmelder: string;
  readonly gegenstelle?: string;
}

/** Die Nummer, die die Funkmeldezentrale vergibt. */
export interface Nachrichtennachweis {
  readonly nummer: string;
  readonly zeitpunkt: string;
  readonly handzeichen: string;
}

/** Ein Eintrag des Verteilers: eine Stelle, mit oder ohne Kopie. */
export interface Nachrichtenverteiler {
  readonly stelle: string;
  readonly kopie: boolean;
}

/** Die Sichtung durch den Sichter (S2 o. ae.). */
export interface Nachrichtensichtung {
  readonly zeitpunkt: string;
  readonly handzeichen: string;
  readonly verteiler: readonly Nachrichtenverteiler[];
  readonly vermerke: string;
}

/**
 * Alles, was der Vordruck von einer Nachricht braucht.
 *
 * Zeitpunkte sind ISO-8601; die Zuordnung rechnet sie nach Europe/Berlin.
 */
export interface Nachrichtendruck {
  readonly richtung: "EINGANG" | "AUSGANG";
  readonly art: string;
  readonly vorrang: string;
  readonly gespraechsnotiz: boolean;
  readonly uebermittlungswunsch: string;
  readonly anschrift: string;
  readonly rufnummer: string;
  readonly betreff: string;
  readonly inhalt: string;
  readonly absender: string;
  readonly abfassungszeit: string;
  readonly zeichen: string;
  readonly funktion: string;
  readonly gegenstelle: string;
  readonly aufnahme?: Nachrichtenvermerk;
  readonly annahme?: Nachrichtenvermerk;
  readonly befoerderung?: Nachrichtenvermerk;
  /** Additiv: der Übermittlungsvorschlag des LdF — Feld 1 und ein Satz in den Vermerken. */
  readonly vorschlag?: Nachrichtenvorschlag;
  readonly nachweis?: Nachrichtennachweis;
  readonly sichtung?: Nachrichtensichtung;
  readonly uebung: boolean;
  /** Additiv (ETB P1-2): die laufende Nummer der Tagebuchzeile — „ETB-Nr.“ in Feld 20. */
  readonly etbNummer?: string;
  /** Additiv (ETB P1-3, P2-7): zurückgezogen — Stempel mit Datum-Zeit-Gruppe und Grund. */
  readonly zurueckgezogen?: Nachrichtenrueckzug;
}

/** Die Optionen der Ausgabe. */
export interface Vordruckoptionen {
  /** A5 hoch (eine Nachricht je Seite) oder A4 quer (zwei nebeneinander). */
  readonly blatt: "a5" | "a4quer";
  /** Ueberschreibt `Nachrichtendruck.uebung`, etwa fuer den Probedruck. */
  readonly uebung?: boolean;
}

/** Versatz der rechten Haelfte auf A4 quer (Bibliothek, README). */
const VERSATZ_RECHTS = 148.5;

// --- Zeichenfilter
/** Die Zeichen von Windows-1252 oberhalb von U+007F, die nicht in Latin-1 stehen. */
const CP1252_SONDER = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");

/** Ersatz fuer Zeichen, die es in Windows-1252 nicht gibt, aber lesbar zu bewahren sind. */
const ERSATZ: Readonly<Record<string, string>> = {
  "→": "->", "←": "<-", "↔": "<->", "⇒": "=>", "⇐": "<=", "↑": "^", "↓": "v",
  "≥": ">=", "≤": "<=", "≠": "!=", "≈": "~", "−": "-", "‐": "-", "‑": "-", "‒": "-",
  "′": "'", "″": "\"", "✓": "x", "✔": "x", "✗": "x", "✘": "x", "\u2009": " ", "\u202f": " ",
  "\u00ad": "", "\u200b": "", "\u200c": "", "\u200d": "", "\ufe0f": "", "\ufeff": "",
};

/**
 * Laesst nur druckbares Windows-1252 durch.
 *
 * Die Bibliothek bettet keine Schrift ein; Helvetica kennt nur Windows-1252,
 * alles andere erschiene als Zeichensalat. Pfeile werden zu ASCII-Pfeilen,
 * Unbekanntes zu „?“. Zeilenumbrueche bleiben, Tabulatoren werden Leerzeichen.
 */
export function druckbar(text: string): string {
  let aus = "";
  for (const zeichen of text.replace(/\r\n?/g, "\n")) {
    const code = zeichen.codePointAt(0) ?? 0;
    if (zeichen in ERSATZ) aus += ERSATZ[zeichen];
    else if (zeichen === "\n") aus += "\n";
    else if (zeichen === "\t") aus += " ";
    else if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) aus += zeichen;
    else if (CP1252_SONDER.has(zeichen)) aus += zeichen;
    else aus += "?";
  }
  return aus;
}

// --- Zeit
const BERLIN = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  year: "2-digit",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Die Bestandteile eines Zeitpunkts in Berliner Zeit, alle zweistellig. */
function berlinTeile(iso: string): { jahr: string; monat: string; tag: string; stunde: string; minute: string } | undefined {
  const zeit = new Date(iso);
  if (Number.isNaN(zeit.getTime())) return undefined;
  const teile: Record<string, string> = {};
  for (const teil of BERLIN.formatToParts(zeit)) teile[teil.type] = teil.value;
  return {
    jahr: teile["year"] ?? "",
    monat: teile["month"] ?? "",
    tag: teile["day"] ?? "",
    stunde: teile["hour"] ?? "",
    minute: teile["minute"] ?? "",
  };
}

/** Die Datum-Zeit-Gruppe kommt aus `@s1/domaene` (eine Quelle, Berliner Zeit); hier nur durchgereicht. */
export { datumZeitGruppe };

/** Der Vermerk im Kopf: Tag zweistellig, Uhrzeit vierstellig. Leer, wenn nichts gesetzt ist. */
function vermerkAus(vermerk: Nachrichtenvermerk | undefined): VordruckVermerk {
  if (!vermerk) return {};
  const t = berlinTeile(vermerk.zeitpunkt);
  return {
    ...(t ? { datum: t.tag, uhrzeit: `${t.stunde}${t.minute}` } : {}),
    ...(vermerk.handzeichen ? { handzeichen: druckbar(vermerk.handzeichen) } : {}),
  };
}

// --- Verteiler
/** Text der freien Verteilerfelder je Sachgebietszeile (so nimmt ihn `VordruckDaten`). */
export type Verteilertexte = VordruckDaten["verteilerText"];

const SACHGEBIETSZEILEN = ["S1", "S2", "S3", "S4", "S6"] as const;

/** Die Stelle als Sachgebietskuerzel „S1“ … „S6“, sonst `undefined`. */
function sachgebiet(stelle: string): string | undefined {
  const treffer = /^S\s*([1-6])$/i.exec(stelle.trim());
  return treffer ? `S${treffer[1]}` : undefined;
}

/**
 * Ordnet den Verteiler den Ankreuzfeldern zu.
 *
 * LEITER und S1 … S6 (mit Zeile im Raster) setzen das Kaestchen ihrer Zeile in
 * Spalte 1. Alles andere (Fachberater, Verbindungsstellen, freie Namen, S5, das
 * keine Zeile hat) bekommt das naechste freie Kaestchen in Spalte 3 (Kopie)
 * oder Spalte 2, mit dem Namen daneben. Was keinen Platz findet, bleibt als
 * Rest und landet im Vermerkfeld.
 */
export function verteilerZuordnen(verteiler: readonly Nachrichtenverteiler[]): {
  felder: NachrichtenvordruckAnkreuzfeld[];
  texte: Verteilertexte;
  rest: string[];
} {
  const felder: NachrichtenvordruckAnkreuzfeld[] = [];
  const texte: Verteilertexte = {};
  const rest: string[] = [];
  const frei = new Map<number, string[]>([[2, [...SACHGEBIETSZEILEN]], [3, [...SACHGEBIETSZEILEN]]]);

  for (const eintrag of verteiler) {
    const name = eintrag.stelle.trim();
    const kuerzel = sachgebiet(name);
    if (/^leiter$/i.test(name)) {
      felder.push("verteilerLeiter");
    } else if (kuerzel && kuerzel !== "S5") {
      felder.push(`verteiler${kuerzel}Spalte1` as NachrichtenvordruckAnkreuzfeld);
    } else if (name) {
      const spalte = eintrag.kopie ? 3 : 2;
      const zeile = frei.get(spalte)?.shift() as keyof Verteilertexte | undefined;
      if (zeile) {
        felder.push(`verteiler${zeile}Spalte${spalte}` as NachrichtenvordruckAnkreuzfeld);
        texte[zeile] = { ...texte[zeile], [`spalte${spalte}`]: druckbar(name) };
      } else {
        rest.push(druckbar(name));
      }
    }
  }
  return { felder, texte, rest };
}

// --- Zuordnung Nachricht -> VordruckDaten
const WEGE: Readonly<Record<string, Uebermittlungsweg>> = {
  FUNK: "funk",
  TELEFON: "telefon",
  TELEFAX: "telefax",
  DFUE: "dfue",
  KURIER: "kurier",
};

/**
 * Der Weg aus dem tatsaechlichen Mittel, dann aus der Festlegung des LdF
 * (Feld 1 ist der Kasten der FmZ, und der LdF fuellt ihn, bevor befoerdert
 * ist), sonst aus dem Wunsch; Funk, wenn alles fehlt.
 */
function wegAus(nachricht: Nachrichtendruck): Uebermittlungsweg {
  const vermerk = nachricht.richtung === "EINGANG" ? nachricht.aufnahme : nachricht.befoerderung;
  const mittel = vermerk?.mittel?.trim().toUpperCase() ?? "";
  const festgelegt = nachricht.vorschlag?.mittel?.trim().toUpperCase() ?? "";
  const wunsch = nachricht.uebermittlungswunsch.trim().toUpperCase();
  return WEGE[mittel] ?? WEGE[festgelegt] ?? WEGE[wunsch] ?? "funk";
}

/**
 * „Weg (LdF): Kurier/Melder, durch Fm2, Hz. Lf" — die Bibliothek hat kein
 * eigenes Feld fuer das Handzeichen des LdF, deshalb steht es in Feld 20.
 */
export function wegvermerkText(weg: Nachrichtenvorschlag | undefined): string {
  if (weg === undefined) return "";
  const teile = [weg.mittel === undefined ? "" : projektion.mittelWort(weg.mittel), weg.fernmelder ? `durch ${weg.fernmelder}` : "", weg.handzeichen ? `Hz. ${weg.handzeichen}` : ""];
  return `Weg (LdF): ${teile.filter((t) => t !== "").join(", ")}`;
}

/**
 * Ordnet eine Nachricht den Feldern des Vordrucks zu (Konzept, Abschnitt 8).
 *
 * Eine Tabelle, keine Fachlogik. Die Vorbelegungen der Klasse (`funk`,
 * `ausgang`) werden ausdruecklich ueberschrieben, damit ein Eingang nicht als
 * Ausgang gedruckt wird; `art` und `vorrang` bleiben offen, wenn sie leer sind.
 * Der Inhalt steht ungeteilt darin; Folgeblaetter macht `vordruckBlaetterAus`.
 */
export function vordruckDatenAus(nachricht: Nachrichtendruck): VordruckDaten {
  const daten = new VordruckDaten();
  daten.uebermittlungsweg = wegAus(nachricht);
  daten.richtung = nachricht.richtung === "EINGANG" ? "eingang" : "ausgang";
  daten.nummer = nachricht.nachweis?.nummer ?? "";
  daten.aufnahmevermerk = nachricht.richtung === "EINGANG" ? vermerkAus(nachricht.aufnahme) : {};
  daten.annahmevermerk = nachricht.richtung === "AUSGANG" ? vermerkAus(nachricht.annahme) : {};
  daten.befoerderungsvermerk = nachricht.richtung === "AUSGANG" ? vermerkAus(nachricht.befoerderung) : {};

  const art = nachricht.art.trim().toLowerCase();
  if (art === "spruch" || art === "durchsage") daten.art = art;
  const vorrang = nachricht.vorrang.trim().toLowerCase();
  if (vorrang === "sofort" || vorrang === "blitz") daten.vorrang = vorrang;
  daten.gespraechsnotiz = nachricht.gespraechsnotiz;

  daten.empfaenger = nachricht.gegenstelle ? [druckbar(nachricht.gegenstelle)] : [];
  daten.anschriften = [nachricht.anschrift, nachricht.rufnummer].filter(Boolean).map(druckbar);
  daten.betreff = druckbar(nachricht.betreff.trim());
  daten.inhalt = druckbar(nachricht.inhalt);
  daten.absender = druckbar(nachricht.absender);
  daten.abfassungszeit = datumZeitGruppe(nachricht.abfassungszeit);
  daten.zeichen = druckbar(nachricht.zeichen);
  daten.funktion = druckbar(nachricht.funktion);
  sichtungUebernehmen(daten, nachricht.sichtung);
  const weg = wegvermerkText(nachricht.vorschlag);
  if (weg !== "") daten.vermerke = druckbar([daten.vermerke, weg].filter(Boolean).join(" "));
  zusatzUebernehmen(daten, nachricht, druckbar);
  return daten;
}

/** Quittung, Vermerke und Verteiler aus der Sichtung. */
function sichtungUebernehmen(daten: VordruckDaten, sichtung: Nachrichtensichtung | undefined): void {
  if (!sichtung) return;
  const t = berlinTeile(sichtung.zeitpunkt);
  daten.quittung = {
    ...(t ? { uhrzeit: `${t.stunde}${t.minute}` } : {}),
    ...(sichtung.handzeichen ? { zeichen: druckbar(sichtung.handzeichen) } : {}),
  };
  const zuordnung = verteilerZuordnen(sichtung.verteiler);
  daten.weitereAnkreuzfelder = zuordnung.felder;
  daten.verteilerText = zuordnung.texte;
  daten.vermerke = druckbar([sichtung.vermerke, ...zuordnung.rest].filter(Boolean).join(" "));
}

// --- Folgeblaetter
/**
 * Die Bloecke einer Nachricht: eines, wenn der Inhalt auf einen Vordruck passt,
 * sonst eines je volles Inhaltsfeld (die Bibliothek bricht dazu lange Zeilen
 * mit Helvetica-Metrik um), mit „Blatt n von m“ im Feld `blatt`. Kopf- und
 * Fussfelder stehen auf jedem Blatt. Zum Messen legt die Funktion eine
 * Wegwerf-jsPDF an.
 */
export function vordruckBlaetterAus(nachricht: Nachrichtendruck, uebung: boolean = nachricht.uebung): VordruckDaten[] {
  const messen = new jsPDF({ unit: "mm", format: "a5" });
  const geteilt = nachrichtenvordruckInhaltTeilen(messen, vordruckDatenAus(nachricht).inhalt);
  const teile = geteilt.length > 0 ? geteilt : [""];
  return teile.map((teil, i) => {
    const blatt = vordruckDatenAus(nachricht);
    blatt.inhalt = teil;
    if (teile.length > 1) blatt.blatt = `Blatt ${i + 1} von ${teile.length}`;
    blatt.uebung = uebung;
    return blatt;
  });
}

// --- PDF
/**
 * Zeichnet einen Block auf die aktuelle Seite. Exportiert (N3), damit die
 * Vorschau im Renderer (Entscheidung 4) mit genau diesem Aufruf zeichnet und
 * nicht mit einer zweiten Fassung, die irgendwann anders aussieht.
 */
export function blattZeichnen(pdf: jsPDF, daten: VordruckDaten, versatz: number): void {
  pdf.setFont("helvetica", "normal");
  zeichneNachrichtenvordruck(pdf, daten, versatz > 0 ? { offsetX: versatz } : {});
}

/** Die Bytes eines jsPDF. */
function bytes(pdf: jsPDF): Uint8Array {
  return new Uint8Array(pdf.output("arraybuffer"));
}

/**
 * Die Nachricht als Vordruck-PDF.
 *
 * `a5`: eine Seite je Block, A5 hoch. `a4quer`: zwei Bloecke nebeneinander auf
 * einer A4-Querseite (bei nur einem Block bleibt die rechte Haelfte leer).
 */
export function nachrichtAlsVordruckPdf(nachricht: Nachrichtendruck, optionen: Vordruckoptionen): Uint8Array {
  const quer = optionen.blatt === "a4quer";
  const pdf = new jsPDF({ orientation: quer ? "landscape" : "portrait", unit: "mm", format: quer ? "a4" : "a5", compress: true });
  const bloecke = vordruckBlaetterAus(nachricht, optionen.uebung ?? nachricht.uebung);

  bloecke.forEach((daten, i) => {
    const rechts = quer && i % 2 === 1;
    if (i > 0 && !rechts) pdf.addPage();
    // Der Stempel vor dem Formular, damit Linien und Eintragungen darüber liegen (ETB P2-7).
    if (nachricht.zurueckgezogen !== undefined) zeichneRueckzugsstempel(pdf, rechts ? VERSATZ_RECHTS : 0);
    blattZeichnen(pdf, daten, rechts ? VERSATZ_RECHTS : 0);
  });
  return bytes(pdf);
}

/**
 * Der leere Vordruck fuer den Papierblock: A4 quer, zwei Vordrucke.
 *
 * Die Vorbelegungen der Klasse (Funk, Ausgang) werden entfernt, sonst waeren
 * zwei Kreuze schon gesetzt.
 */
export function leererNachrichtenvordruckPdf(): Uint8Array {
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });
  for (const versatz of [0, VERSATZ_RECHTS]) {
    const daten = new VordruckDaten();
    delete daten.uebermittlungsweg;
    delete daten.richtung;
    blattZeichnen(pdf, daten, versatz);
  }
  return bytes(pdf);
}
