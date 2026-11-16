/**
 * Was das Blatt „Nachrichten" und seine Masken rechnen, ohne zu zeichnen
 * (KONZEPT-NACHRICHTEN.md §5, §6) — reine Funktionen, damit Maske, Liste und
 * Laufzettel dieselbe Regel lesen und die Tests sie ohne DOM prüfen.
 *
 * Geordnet, gefiltert und gezählt wird in Ring 2; hier steht nur, was die
 * Oberfläche über die Zeile hinaus braucht: Farben, Wörter, die Datum-Zeit-
 * Gruppe als Eingabe, den Zeilenzähler des Inhalts und die Vorbelegungen von
 * „Nachricht verfassen", „Antworten" und „Weiterleiten".
 */

import { NACHRICHT_STELLEN, datumZeitGruppe, datumZeitGruppeLesen, projektion, type Nachrichtenzeile } from "@s1/domaene";

import type { Sitzungsstellen } from "../kontrakt/index.js";
import type { Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { funkzeitAusEingabe } from "./funkzeit.js";

/** Zwölf Zeilen Inhalt hat der Vordruck (Feld 14); ab der dreizehnten folgt ein Folgeblatt. */
export const ZEILEN_VORDRUCK = 12;

/**
 * Zeichen je Inhaltszeile, genähert: Das Feld ist 120 mm breit und in 12 pt
 * Helvetica gesetzt; gemessen wird erst beim Druck mit jsPDF. Die Maske
 * zählt mit dieser Näherung und sagt es früh genug, gekürzt wird nichts (§6).
 */
export const ZEICHEN_JE_ZEILE = 55;

/** Die Stellen des Verteilers (Feld 19) in der Reihenfolge des Vordrucks — ohne Sichter und FmZ. */
export const VERTEILERSTELLEN = ["LEITER", "S1", "S2", "S3", "S4", "S6", "FACHBERATER", "VERBINDUNGSSTELLE"] as const;

/** Alle Stellen eines Arbeitsplatzes zur Wahl (Entscheidung 3). */
export const ARBEITSPLATZSTELLEN: readonly string[] = NACHRICHT_STELLEN;

/** Die Kopiefarben mit Wort: grün Hauptempfänger, blau Mitleser, rot S2 (§2). */
export const KOPIEN = [
  { wert: "GRUEN", titel: "grün (Hauptempfänger)" },
  { wert: "BLAU", titel: "blau (Mitleser)" },
  { wert: "ROT", titel: "rot (S2)" },
] as const;

export function stellenname(stelle: string): string {
  return projektion.stellenWort(stelle);
}

/** Die CSS-Klasse der Kopiefarbe; ein unbekannter Wert steht neutral (§3.7). */
export function kopieklasse(kopie: string | undefined): string {
  if (kopie === "GRUEN") return "kopie-gruen";
  if (kopie === "BLAU") return "kopie-blau";
  if (kopie === "ROT") return "kopie-rot";
  return "kopie-ohne";
}

/** Die Kopie, die diese Zeile für die eigenen Stellen trägt — sonst die erste des Verteilers. */
export function kopieFuer(zeile: Nachrichtenzeile, stellen: readonly string[]): string | undefined {
  return (zeile.verteiler.find((m) => stellen.includes(m.stelle)) ?? zeile.verteiler[0])?.kopie;
}

/** Gelesen und erledigt für die eigenen Stellen — die beiden Marken des Posteingangs. */
export function eigeneMarken(zeile: Nachrichtenzeile, stellen: readonly string[]): { readonly gelesen: boolean; readonly erledigt: boolean } {
  const eigene = zeile.verteiler.filter((m) => stellen.includes(m.stelle));
  return {
    gelesen: eigene.length > 0 && eigene.every((m) => m.gelesen || m.erledigt),
    erledigt: eigene.length > 0 && eigene.every((m) => m.erledigt),
  };
}

/** „Blitz", „Sofort" oder leer — die Marke der Vorrangspalte. */
export function vorrangwort(zeile: Pick<Nachrichtenzeile, "vorrangstufe" | "vorrang">): string {
  if (zeile.vorrangstufe === 0) return "Blitz";
  if (zeile.vorrangstufe === 1) return zeile.vorrang === "SOFORT" || zeile.vorrang === undefined ? "Sofort" : zeile.vorrang;
  return "";
}

/** Die Datum-Zeit-Gruppe eines Zeitpunkts, „—" ohne. */
export function dtg(zeitpunkt: string | undefined): string {
  return zeitpunkt === undefined ? "—" : datumZeitGruppe(zeitpunkt) || "—";
}

/**
 * Liest die Eingabe eines Zeitfelds des Vordrucks: zuerst als Datum-Zeit-
 * Gruppe („171045nov26", ohne Jahr das laufende), sonst wie jede Funkzeit
 * („1045", „171045", „17.11. 10:45").
 */
export function zeitAusEingabe(eingabe: string, jetzt: Date = new Date()): string | undefined {
  const text = eingabe.trim();
  if (text === "") return undefined;
  const alsDtg = datumZeitGruppeLesen(text, jetzt.getFullYear());
  if (alsDtg !== undefined) return new Date(alsDtg).toISOString();
  return funkzeitAusEingabe(text, jetzt);
}

/** Wie viele Zeilen der Inhalt auf dem Vordruck braucht: harte Umbrüche, lange Zeilen wortweise umbrochen. */
export function inhaltszeilen(inhalt: string, breite: number = ZEICHEN_JE_ZEILE): number {
  if (inhalt.trim() === "") return 0;
  let zeilen = 0;
  for (const absatz of inhalt.replace(/\s+$/u, "").split("\n")) {
    let laenge = 0;
    let dieser = 1;
    for (const wort of absatz.split(/\s+/u).filter((w) => w !== "")) {
      const noetig = laenge === 0 ? wort.length : laenge + 1 + wort.length;
      if (noetig <= breite) {
        laenge = noetig;
        continue;
      }
      dieser += laenge === 0 ? Math.ceil(wort.length / breite) - 1 : Math.ceil(wort.length / breite);
      laenge = wort.length % breite === 0 ? breite : wort.length % breite;
    }
    zeilen += dieser;
  }
  return zeilen;
}

/** Die Felder der Maske „Nachricht verfassen" als Text, wie getippt. */
export interface Maskenwerte {
  readonly uebermittlungswunsch: string;
  readonly art: string;
  readonly vorrang: string;
  readonly anschrift: string;
  readonly rufnummer: string;
  readonly betreff: string;
  readonly inhalt: string;
  readonly absender: string;
  readonly zeichen: string;
  readonly funktion: string;
  readonly abfassungszeit: string;
  readonly gespraechsnotiz: boolean;
  readonly antwortAuf?: string;
  readonly weitergeleitetVon?: string;
  /**
   * Additiv (N2): Eingang, wenn die FmZ aufnimmt. Die Gesprächsnotiz ist
   * immer ein Eingang (§5), gleich, was hier steht; ohne Angabe Ausgang.
   */
  readonly richtung?: "EINGANG" | "AUSGANG";
}

/** Die erste Stelle der Sitzung als Wort — Absender und Funktion der Vorbelegung. */
function eigeneStelle(sitzung: Sitzungsstellen | undefined): string {
  const erste = sitzung?.stellen[0];
  return erste === undefined ? "" : stellenname(erste);
}

/** Absender, Zeichen und Funktion aus Stelle und Handzeichen, die Abfassungszeit „jetzt" (§6). */
export function leereMaske(sitzung: Sitzungsstellen | undefined, jetzt: Date = new Date()): Maskenwerte {
  return {
    uebermittlungswunsch: "",
    art: "",
    vorrang: "",
    anschrift: "",
    rufnummer: "",
    betreff: "",
    inhalt: "",
    absender: eigeneStelle(sitzung),
    zeichen: sitzung?.handzeichen ?? "",
    funktion: eigeneStelle(sitzung),
    abfassungszeit: datumZeitGruppe(jetzt),
    gespraechsnotiz: false,
  };
}

/**
 * „Antworten" (§5): Anschrift und Absender getauscht, Betreff mit „Antwort:",
 * Bezug `antwortAuf`. Der Inhalt wird nicht zitiert — der Vordruck hat zwölf Zeilen.
 */
export function antwortVorlage(zeile: Nachrichtenzeile, sitzung: Sitzungsstellen | undefined, jetzt: Date = new Date()): Maskenwerte {
  const leer = leereMaske(sitzung, jetzt);
  const betreff = zeile.betreff.trim();
  return {
    ...leer,
    anschrift: zeile.absender,
    absender: zeile.anschrift === "" ? leer.absender : zeile.anschrift,
    betreff: /^antwort:/iu.test(betreff) ? betreff : `Antwort: ${betreff}`.trim(),
    antwortAuf: zeile.id,
  };
}

/** „Weiterleiten" (§5): derselbe Inhalt, neue Anschrift, Bezug `weitergeleitetVon`. */
export function weiterleitenVorlage(zeile: Nachrichtenzeile, sitzung: Sitzungsstellen | undefined, jetzt: Date = new Date()): Maskenwerte {
  return {
    ...leereMaske(sitzung, jetzt),
    art: zeile.art ?? "",
    vorrang: zeile.vorrang ?? "",
    betreff: zeile.betreff,
    inhalt: zeile.inhalt,
    weitergeleitetVon: zeile.id,
  };
}

/** Was vor „Aufgeben" fehlt (§6): Anschrift, Betreff oder Inhalt, eine lesbare Abfassungszeit. */
export function maskenfehler(werte: Maskenwerte, jetzt: Date = new Date()): readonly string[] {
  const fehler: string[] = [];
  if (werte.anschrift.trim() === "") fehler.push("Anschrift eintragen");
  if (werte.betreff.trim() === "" && werte.inhalt.trim() === "") fehler.push("Betreff oder Inhalt eintragen");
  if (zeitAusEingabe(werte.abfassungszeit, jetzt) === undefined) fehler.push("Abfassungszeit als „171045nov26“ oder „1045“ eintragen");
  return fehler;
}

/** Die Richtung der Anlage: Gesprächsnotiz und Aufnahme der FmZ sind Eingänge (§5), sonst Ausgang. */
export function richtungAus(werte: Pick<Maskenwerte, "richtung" | "gespraechsnotiz">): "EINGANG" | "AUSGANG" {
  return werte.gespraechsnotiz || werte.richtung === "EINGANG" ? "EINGANG" : "AUSGANG";
}

/** Die Anlage aus den Feldern; die Richtung nach {@link richtungAus}. */
export function anlageAus(werte: Maskenwerte, nachrichtId: string, jetzt: Date = new Date()): Nachrichtenanlage {
  const abfassungszeit = zeitAusEingabe(werte.abfassungszeit, jetzt);
  return {
    nachrichtId,
    richtung: richtungAus(werte),
    art: werte.art,
    vorrang: werte.vorrang,
    gespraechsnotiz: werte.gespraechsnotiz,
    uebermittlungswunsch: werte.uebermittlungswunsch,
    anschrift: werte.anschrift,
    rufnummer: werte.rufnummer,
    betreff: werte.betreff,
    inhalt: werte.inhalt,
    absender: werte.absender,
    zeichen: werte.zeichen,
    funktion: werte.funktion,
    ...(abfassungszeit === undefined ? {} : { abfassungszeit }),
    ...(werte.antwortAuf === undefined ? {} : { antwortAuf: werte.antwortAuf }),
    ...(werte.weitergeleitetVon === undefined ? {} : { weitergeleitetVon: werte.weitergeleitetVon }),
  };
}
