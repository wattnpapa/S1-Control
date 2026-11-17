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

import type { Nachrichtenentwurf } from "@s1/ausgaben/vordruck";
import { NACHRICHT_STELLEN, datumZeitGruppe, datumZeitGruppeLesen, projektion, anzeigezoneWandzeit, type Nachrichtenzeile } from "@s1/domaene";

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

/**
 * Die Kopiefarbe als Wort mit ihrer Bedeutung (Audit Sachgebietsleiter
 * P2-8): Der schmale Rand allein ist bei schlechtem Licht, Farbsehschwäche
 * oder aus zwei Metern nicht zu halten.
 */
export function kopiewort(kopie: string | undefined): string {
  if (kopie === "GRUEN") return "grün: bearbeiten";
  if (kopie === "BLAU") return "blau: Kenntnis";
  if (kopie === "ROT") return "rot: S2";
  return kopie === undefined ? "ohne Kopie" : kopie;
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

/**
 * Die Datum-Zeit-Gruppe eines Zeitpunkts zum Anzeigen, „—" ohne. Groß
 * geschrieben wie im Kopfband, in Monitor und Ausgaben („171221NOV26"): Blatt
 * und Kopf zeigten sie vorher verschieden (Audit LdF P3-2). Eingabefelder und
 * der Papiervordruck behalten die Schreibweise der Domäne; gelesen wird sie
 * ohne Rücksicht auf die Groß- und Kleinschreibung.
 */
export function dtg(zeitpunkt: string | undefined): string {
  return zeitpunkt === undefined ? "—" : datumZeitGruppe(zeitpunkt).toUpperCase() || "—";
}

/**
 * Liest die Eingabe eines Zeitfelds des Vordrucks: zuerst als Datum-Zeit-
 * Gruppe („171045nov26", ohne Jahr das laufende), sonst wie jede Funkzeit
 * („1045", „171045", „17.11. 10:45").
 */
export function zeitAusEingabe(eingabe: string, jetzt: Date = new Date()): string | undefined {
  const text = eingabe.trim();
  if (text === "") return undefined;
  // Das Bezugsjahr ist das der Anzeigezone: In der Silvesternacht Berlins steht
  // eine UTC- oder New-Yorker Uhr noch im alten Jahr (Audit SGL P3-16).
  const alsDtg = datumZeitGruppeLesen(text, anzeigezoneWandzeit(jetzt)?.jahr ?? jetzt.getUTCFullYear());
  if (alsDtg !== undefined) return new Date(alsDtg).toISOString();
  return funkzeitAusEingabe(text, jetzt);
}

/**
 * Das Handzeichen als Pflichtfeld (Audit Sachgebietsleiter P1-4): zwei bis
 * vier Zeichen, leer nicht erlaubt. Gilt für die Stellenabfrage und jede
 * Maske des Vordrucks mit Handzeichen (Feld 2 bis 4, 17, 18).
 */
export function handzeichenPflicht(handzeichen: string): string | undefined {
  const hz = handzeichen.trim();
  if (hz === "") return "Handzeichen eintragen (zwei bis vier Zeichen)";
  return hz.length >= 2 && hz.length <= 4 ? undefined : "Das Handzeichen hat zwei bis vier Zeichen.";
}

/** Fünf Minuten Vorlauf: Uhren zweier Rechner gehen nie ganz gleich. */
const ZUKUNFT_TOLERANZ_MS = 5 * 60_000;
const TAG_MS = 24 * 60 * 60_000;

/**
 * Die weiche Plausibilität einer gelesenen Zeit (Audit Fernmelder P2-2): mehr
 * als fünf Minuten in der Zukunft oder älter als 24 Stunden gibt einen
 * Hinweis unter dem Feld, aber **keine Sperre** — der Nachtrag vom Papier
 * muss möglich bleiben (§6 „Papier-Rückfall").
 */
export function zeitHinweis(zeitpunkt: string | undefined, jetzt: Date = new Date()): string | undefined {
  if (zeitpunkt === undefined) return undefined;
  // Reine Zeitpunkt-Rechnung (ISO gegen `jetzt`): unabhängig von der Rechnerzone,
  // die Zone steckt nur im Lesen der Eingabe (`zeitAusEingabe`), Audit SGL P3-16.
  const abstand = Date.parse(zeitpunkt) - jetzt.getTime();
  if (!Number.isFinite(abstand)) return undefined;
  if (abstand > ZUKUNFT_TOLERANZ_MS) return "liegt in der Zukunft – bitte prüfen";
  if (abstand < -TAG_MS) return "liegt mehr als 24 Stunden zurück – bitte prüfen";
  return undefined;
}

/** „1045" aus der Datum-Zeit-Gruppe — die vierstellige Uhrzeit des Vordrucks (Feld 3, 4, 18), in derselben Zone wie die Gruppe. */
export function uhrzeit(zeitpunkt: string | undefined): string {
  const gruppe = zeitpunkt === undefined ? "" : datumZeitGruppe(zeitpunkt);
  return /^\d{6}/u.test(gruppe) ? gruppe.slice(2, 6) : "—";
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

/** „E 26" oder „A" — die Kennung einer Nachricht für den Bezug im Betreff (ohne Nummer nur die Richtung). */
export function bezugskennung(zeile: Pick<Nachrichtenzeile, "richtungKurz" | "nummer">): string {
  return zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
}

/**
 * „Antworten" (§5): Anschrift und Absender getauscht, Betreff mit Bezug
 * („Antwort auf E 26: …"), Bezug `antwortAuf`. Der Inhalt wird nicht zitiert —
 * der Vordruck hat zwölf Zeilen.
 *
 * Audit Sachgebietsleiter P3-17: Die Nummer steht im Betreff, weil sie für
 * die Rückfrage am Funk die einzige eindeutige Kennung ist; die Ruf-Nr. der
 * Gegenstelle (Feld 11) und das Mittel, auf dem die Nachricht kam, sind
 * vorbelegt — der Antwortende tippt sie sonst ein zweites Mal.
 */
export function antwortVorlage(zeile: Nachrichtenzeile, sitzung: Sitzungsstellen | undefined, jetzt: Date = new Date()): Maskenwerte {
  const leer = leereMaske(sitzung, jetzt);
  const betreff = zeile.betreff.trim();
  return {
    ...leer,
    anschrift: zeile.absender,
    absender: zeile.anschrift === "" ? leer.absender : zeile.anschrift,
    betreff: /^antwort(\s+auf\b[^:]*)?:/iu.test(betreff) ? betreff : `Antwort auf ${bezugskennung(zeile)}: ${betreff}`.trim(),
    rufnummer: zeile.rufnummer ?? "",
    uebermittlungswunsch: zeile.aufnahme?.mittel ?? zeile.uebermittlungswunsch ?? "",
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

/**
 * Was vor „Aufgeben" fehlt (§6): Anschrift, Absender, Betreff oder Inhalt,
 * eine lesbare Abfassungszeit. Der Absender (Feld 15) ist Pflicht (Audit
 * Sachgebietsleiter P1-4): Ohne ihn weiß bei der Rückfrage niemand, wer die
 * Nachricht gegeben hat.
 */
export function maskenfehler(werte: Maskenwerte, jetzt: Date = new Date()): readonly string[] {
  const fehler: string[] = [];
  if (werte.anschrift.trim() === "") fehler.push("Anschrift eintragen");
  if (werte.absender.trim() === "") fehler.push("Absender eintragen");
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

/** Was die Maske über Aufnahme und Laufzettel zur Vorschau beisteuert (N2-Teile der Maske). */
export interface Entwurfszusatz {
  readonly aufnahme?: { readonly mittel: string; readonly zeitpunkt: string; readonly handzeichen: string } | undefined;
  readonly gegenstelle?: string | undefined;
  readonly nummer?: string | undefined;
  readonly sichtung?: { readonly zeitpunkt: string; readonly handzeichen: string; readonly verteiler: readonly { readonly stelle: string; readonly kopie?: string | undefined }[]; readonly vermerke?: string | undefined } | undefined;
}

/**
 * Die Felder der Maske als Entwurf für die Vorschau des Vordrucks
 * (Entscheidung 4, N3): Richtung wie beim Aufgeben, die Abfassungszeit als
 * ISO, sobald sie lesbar ist. Die Abbildung auf die Felder des Vordrucks
 * macht `@s1/ausgaben` (`entwurfsdruck`), dieselbe wie beim Druck. Im
 * Laufzettel heißt nur die blaue Kopie „nur Kopie" — wie in `nachrichtendruckAus`.
 */
export function entwurfAus(werte: Maskenwerte, zusatz: Entwurfszusatz = {}, jetzt: Date = new Date()): Nachrichtenentwurf {
  const abfassungszeit = zeitAusEingabe(werte.abfassungszeit, jetzt);
  const s = zusatz.sichtung;
  return {
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
    ...(zusatz.aufnahme === undefined ? {} : { aufnahme: zusatz.aufnahme }),
    ...(zusatz.gegenstelle === undefined ? {} : { gegenstelle: zusatz.gegenstelle }),
    ...(zusatz.nummer === undefined ? {} : { nummer: zusatz.nummer }),
    ...(s === undefined
      ? {}
      : { sichtung: { zeitpunkt: s.zeitpunkt, handzeichen: s.handzeichen, verteiler: s.verteiler.map((v) => ({ stelle: v.stelle, kopie: v.kopie === "BLAU" })), vermerke: s.vermerke ?? "" } }),
  };
}
