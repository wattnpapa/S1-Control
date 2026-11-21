/**
 * Das Blatt „Nachrichten" als Projektion (KONZEPT-NACHRICHTEN.md §6, §9, §10):
 * die fünf Sichten, der Ausschnitt mit Gesamtzahl, die Nummernvorbelegung
 * und die fünf Zahlen des Bandes.
 *
 * **Die Stelle ist ein Zuschnitt, kein Recht** (§4). Jede Sicht nimmt die
 * Stellen des Arbeitsplatzes als Liste entgegen; wer eine andere Liste
 * übergibt, sieht den Posteingang einer anderen Stelle — so wie jedes Blatt
 * unter „Mehr" erreichbar bleibt.
 *
 * Gerechnet wird aus dem Zustand und nicht aus dem Ereignisstrom: Die
 * Nachricht ist eine Entität mit Feldern, und jede Sicht fragt nach dem
 * geltenden Stand, nicht nach dem Verlauf. Der Verlauf steht im Tagebuch.
 */

import { vergleicheHlc } from "../hlc.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";
import {
  alleNachrichtenzeilen,
  vergleicheNachNummer,
  vergleicheNachrichten,
  zeilenkontext,
  type Nachrichtenzeile,
} from "./nachrichtenzeile.js";
import { nummernluecken, offenFuerStellen, type Offenumfeld } from "./nachrichtenoffen.js";
import { ldfSchrittDer } from "./nachrichtenstand.js";
import { stellenWort } from "./tagebuch-nachrichten.js";

/**
 * Die Sichten des Umschalters (§6); „ldf" additiv (2026-11-17): Ausgänge vor
 * der Festlegung des Wegs und Eingänge vor der Weitergabe an den Sichter.
 * Ebenfalls additiv: „offen" — alles, was für die Stellen der Sitzung noch
 * nicht erledigt ist, nach Vorrang und Alter, für die Übergabe (SGL P1-7) —
 * und „gesichtet" — alle Nachrichten mit Sichtung, neueste zuerst, für die
 * Nachsichtung (Sichter-Audit).
 */
export const NACHRICHTEN_SICHTEN = ["posteingang", "ausgang", "sichter", "fmz", "nachweisung", "ldf", "offen", "gesichtet"] as const;
export type Nachrichtensicht = (typeof NACHRICHTEN_SICHTEN)[number];

/** Der Stand einer Nachricht im Posteingang, bezogen auf die eigenen Stellen. */
export type Posteingangsstand = "NEU" | "GELESEN" | "ERLEDIGT";

export interface Nachrichtenanfrage {
  readonly sicht: Nachrichtensicht;
  /** Die Stellen dieses Arbeitsplatzes; Posteingang und Ausgang schneiden danach zu. */
  readonly stellen?: readonly string[];
  /** Ausgang: auch, was dieser Arbeitsplatz verfasst hat, unabhängig von der Stelle (Stelle = Nutzlastfeld `funktion`, SGL P2-14). */
  readonly clientId?: string;
  /** Nur im Posteingang: die Chips „neu", „gelesen", „erledigt". */
  readonly zustaende?: readonly Posteingangsstand[];
  /** Volltext über Betreff, Inhalt, Absender und Anschrift. */
  readonly suche?: string;
  /** Zeigerstand und Seitenlänge wie beim Tagebuch. */
  readonly von?: number;
  readonly anzahl?: number;
  /** Für die Zwanzig-Minuten-Marke; Ring 2 liest keine Uhr. */
  readonly jetzt?: string;
  /** Additiv: nur diese Nachricht — „Nachricht öffnen" an der Tagebuchzeile (ETB P0-1). */
  readonly nachrichtId?: Id;
  /** Additiv, Sicht „gesichtet": nur Sichtungen dieses Handzeichens oder Arbeitsplatzes (`clientId`). */
  readonly nurEigeneSichtungen?: boolean;
  /** Additiv: das Handzeichen der Sitzung, für „meine Sichtungen". */
  readonly handzeichen?: string;
  /** Additiv, Sicht „offen": ob ein Sichter besetzt ist (Präsenz kennt nur der Worker). */
  readonly sichterBesetzt?: boolean;
}

export interface Nachrichtenausschnitt {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly gesamtzahl: number;
  readonly von: number;
}

/** Die fünf Zahlen des Bandes (§6). */
export interface Nachrichtenlage {
  /** Gesichtet, eine eigene Stelle im Verteiler hat weder Kenntnis genommen noch erledigt. */
  readonly neuFuerStellen: number;
  readonly vorFmz: number;
  readonly vorSichter: number;
  /** Sofort oder Blitz, weder erledigt noch zurückgezogen. */
  readonly mitVorrangOffen: number;
  /** Angenommen, unbefördert, länger als die Schwelle in der FmZ. */
  readonly ueberSchwelle: number;
  /** Additiv: vor dem LdF — nur, wenn der Einsatz den LdF als Station führt (`ldfStation`). */
  readonly vorLdf?: number;
  /** Additiv (R2-LdF P2-4): `ueberSchwelle` getrennt nach LdF und FmZ, nur mit `ldfStation`. */
  readonly ueberSchwelleLdf?: number;
  readonly ueberSchwelleFmz?: number;
  /** Additiv: fehlende Nummern zwischen 1 und der höchsten (LdF P2-2, ETB P2-2). */
  readonly nummernluecken?: readonly number[];
  /**
   * Additiv (Sichter P1-4): Eingänge, die mindestens die Schwelle der FmZ lang
   * vor dem Sichter liegen — der Stau, der ohne besetzten Sichter niemandem
   * auffiel. Nur mit `jetzt`.
   */
  readonly vorSichterUeberSchwelle?: number;
  /**
   * Additiv (zweiter Durchlauf, Wartezeit): die Zeit, gegen die die Zahlen
   * gerechnet sind (ISO). Die Spalte „Wartet“ rechnet mit
   * `wartezeitMinuten(zeile, gerechnetUm)` gegen dieselbe Zeit.
   */
  readonly gerechnetUm?: string;
}

function eigeneMarken(zeile: Nachrichtenzeile, stellen: readonly string[]): Nachrichtenzeile["verteiler"] {
  return zeile.verteiler.filter((marke) => stellen.includes(marke.stelle));
}

/**
 * NEU, solange eine eigene Stelle des Verteilers weder gelesen noch erledigt
 * hat; ERLEDIGT, wenn alle eigenen erledigt sind; sonst GELESEN. `undefined`,
 * wenn keine eigene Stelle im Verteiler steht.
 */
export function posteingangsstand(zeile: Nachrichtenzeile, stellen: readonly string[]): Posteingangsstand | undefined {
  const eigene = eigeneMarken(zeile, stellen);
  if (eigene.length === 0) return undefined;
  if (eigene.every((marke) => marke.erledigt)) return "ERLEDIGT";
  return eigene.some((marke) => !marke.gelesen && !marke.erledigt) ? "NEU" : "GELESEN";
}

function trifftSuche(zeile: Nachrichtenzeile, suche: string | undefined): boolean {
  const nadel = suche?.trim().toLocaleLowerCase("de-DE") ?? "";
  if (nadel === "") return true;
  return [zeile.betreff, zeile.inhalt, zeile.absender, zeile.anschrift]
    .join("\n")
    .toLocaleLowerCase("de-DE")
    .includes(nadel);
}

/**
 * Gehört `funktion` (Feld 15 beziehungsweise 17 des Vordrucks: die verfassende
 * Stelle) zu einer der Stellen der Sitzung? Verglichen wird mit dem Schlüssel
 * („FMZ") und mit dem Wort der Maske („FmZ"), weil die Maske die Funktion aus
 * der Stelle als Wort vorbelegt; Groß- und Kleinschreibung zählt nicht.
 */
function funktionGehoertZuStellen(funktion: string | undefined, stellen: readonly string[]): boolean {
  const gesucht = funktion?.trim().toLocaleLowerCase("de-DE") ?? "";
  if (gesucht === "") return false;
  return stellen.some((stelle) => [stelle, stellenWort(stelle)].some((name) => name.toLocaleLowerCase("de-DE") === gesucht));
}

/**
 * Ausgang: Richtung Ausgang oder Gesprächsnotiz, verfasst von diesem
 * Arbeitsplatz (`clientId`) oder von einer Stelle der Sitzung (`funktion`).
 *
 * SGL P2-14, Entscheidung 14 vom 2026-11-17 („Die Lehrunterlage ist Maßstab"):
 * Absender ist die Stelle (Vordruck, Feld 15/17), nicht der Absender-Freitext.
 * Wer beim Schichtwechsel an einem anderen Rechner die Stelle S4 übernimmt,
 * sieht den Ausgang des Vorgängers; der Freitext („OV Wildeshausen, S4")
 * entscheidet nichts mehr.
 */
function istEigenerAusgang(zeile: Nachrichtenzeile, anfrage: Nachrichtenanfrage): boolean {
  if (zeile.richtung !== "AUSGANG" && !zeile.gespraechsnotiz) return false;
  const stellen = anfrage.stellen ?? [];
  if (stellen.length === 0 && anfrage.clientId === undefined) return true;
  return (anfrage.clientId !== undefined && zeile.clientId === anfrage.clientId) || funktionGehoertZuStellen(zeile.funktion, stellen);
}

function inPosteingang(zeile: Nachrichtenzeile, anfrage: Nachrichtenanfrage): boolean {
  const stand = posteingangsstand(zeile, anfrage.stellen ?? []);
  if (stand === undefined) return false;
  return anfrage.zustaende === undefined || anfrage.zustaende.length === 0 || anfrage.zustaende.includes(stand);
}

/** Gehört die Zeile in die angefragte Sicht? */
export function inSicht(zeile: Nachrichtenzeile, anfrage: Nachrichtenanfrage): boolean {
  switch (anfrage.sicht) {
    case "posteingang":
      return inPosteingang(zeile, anfrage);
    case "ausgang":
      return istEigenerAusgang(zeile, anfrage);
    case "sichter":
      return zeile.laufzustand === "VOR_SICHTER";
    case "fmz":
      // Ein angenommener Ausgang beim LdF bleibt in der Warteschlange sichtbar:
      // Ist kein LdF da, befördert der Fernmelder ihn selbst (Ersatzregel).
      // Der beförderte Ausgang beim LdF (Nachweisung, Weitergabe) gehört nicht mehr in die Schlange.
      return zeile.laufzustand === "VOR_FMZ" || ldfSchrittDer(zeile) === "zuteilung";
    case "ldf":
      return zeile.laufzustand === "VOR_LDF";
    case "nachweisung":
      return true;
    case "offen":
      return offenFuerStellen(zeile, anfrage.stellen ?? [], umfeldDer(anfrage));
    case "gesichtet":
      return zeile.sichtung !== undefined && (anfrage.nurEigeneSichtungen !== true || eigeneSichtung(zeile, anfrage));
  }
}

function umfeldDer(anfrage: Nachrichtenanfrage): Offenumfeld {
  return anfrage.sichterBesetzt === undefined ? {} : { sichterBesetzt: anfrage.sichterBesetzt };
}

/** „Meine Sichtungen": vom Arbeitsplatz der Sitzung oder mit ihrem Handzeichen. */
function eigeneSichtung(zeile: Nachrichtenzeile, anfrage: Nachrichtenanfrage): boolean {
  const hz = anfrage.handzeichen?.trim() ?? "";
  if (anfrage.clientId !== undefined && zeile.gesichtetVon === anfrage.clientId) return true;
  return hz !== "" && zeile.sichtung?.handzeichen.trim().toLocaleLowerCase("de-DE") === hz.toLocaleLowerCase("de-DE");
}

/** Sicht „gesichtet": die jüngste Sichtung zuerst (fachliche Zeit, dann Eingang). */
function vergleicheNachSichtung(a: Nachrichtenzeile, b: Nachrichtenzeile): number {
  const za = Date.parse(a.sichtung?.zeitpunkt ?? "");
  const zb = Date.parse(b.sichtung?.zeitpunkt ?? "");
  if (Number.isFinite(za) && Number.isFinite(zb) && za !== zb) return zb - za;
  return -vergleicheHlc(a.angelegtMit, b.angelegtMit);
}

function ordnungDer(sicht: Nachrichtensicht): (a: Nachrichtenzeile, b: Nachrichtenzeile) => number {
  if (sicht === "nachweisung") return vergleicheNachNummer;
  return sicht === "gesichtet" ? vergleicheNachSichtung : vergleicheNachrichten;
}

/**
 * Der Ausschnitt einer Sicht, mit Gesamtzahl wie `tagebuchausschnitt`.
 *
 * Geordnet wird Blitz vor Sofort vor einfach, dann nach Eingang (§5); die
 * Nachweisung allein nach Nummer, ohne Nummer zuletzt.
 */
export function nachrichtenausschnitt(zustand: Zustand, anfrage: Nachrichtenanfrage): Nachrichtenausschnitt {
  const kontext = zeilenkontext(zustand, anfrage.jetzt);
  const passend = alleNachrichtenzeilen(zustand, kontext).filter(
    (zeile) =>
      (anfrage.nachrichtId === undefined || zeile.id === anfrage.nachrichtId) && inSicht(zeile, anfrage) && trifftSuche(zeile, anfrage.suche),
  );
  passend.sort(ordnungDer(anfrage.sicht));
  const von = Math.max(0, anfrage.von ?? 0);
  const bis = anfrage.anzahl === undefined ? undefined : von + anfrage.anzahl;
  return { zeilen: passend.slice(von, bis), gesamtzahl: passend.length, von };
}

/** Die Zeile einer einzelnen Nachricht, etwa für die Maske oder den Vordruck. */
export function nachrichtNach(zustand: Zustand, id: Id, jetzt?: string): Nachrichtenzeile | undefined {
  const kontext = zeilenkontext(zustand, jetzt);
  return alleNachrichtenzeilen(zustand, kontext).find((zeile) => zeile.id === id);
}

/**
 * Die Vorbelegung der Nachweisungsnummer: höchste bekannte plus eins (§6
 * „Papier-Rückfall"). Zurückgezogene zählen mit — ihre Nummer steht auf
 * Papier und bleibt vergeben. Eine höhere Nummer darf jederzeit eingetragen
 * werden; doppelt meldet der Fold (`nachweisnummerDoppelt`).
 */
export function naechsteNachweisnummer(zustand: Zustand): number {
  let hoechste = 0;
  for (const zeile of alleNachrichtenzeilen(zustand, zeilenkontext(zustand))) {
    if (zeile.nummer !== undefined && zeile.nummer > hoechste) hoechste = zeile.nummer;
  }
  return hoechste + 1;
}

/**
 * Die fünf Zahlen des Bandes, je Stelle dieses Arbeitsplatzes gerechnet (§6, §9).
 *
 * „Mit Vorrang offen" zählt nur, was für die Stellen der Sitzung noch offen
 * ist (`offenFuerStellen`, SGL P1-7 und Sichter-Audit): Eine Sofort-Nachricht,
 * die S3 erledigt hat, zählt bei S3 nicht mehr, auch wenn S4 noch liest.
 * Dazu additiv die Lücken der Nummernfolge (LdF P2-2).
 */
export function nachrichtenlage(zustand: Zustand, stellen: readonly string[], jetzt?: string, umfeld: Offenumfeld = {}): Nachrichtenlage {
  const lage: { -readonly [K in keyof Nachrichtenlage]: Nachrichtenlage[K] } & Record<"neuFuerStellen" | "vorFmz" | "vorSichter" | "mitVorrangOffen" | "ueberSchwelle", number> = {
    neuFuerStellen: 0,
    vorFmz: 0,
    vorSichter: 0,
    mitVorrangOffen: 0,
    ueberSchwelle: 0,
  };
  // Die sechste Zahl gibt es nur, wenn der Einsatz den LdF als Station führt.
  if (zustand.einsatz?.ldfStation?.wert === true) Object.assign(lage, { vorLdf: 0, ueberSchwelleLdf: 0, ueberSchwelleFmz: 0 });
  const kontext = zeilenkontext(zustand, jetzt);
  const zeilen = alleNachrichtenzeilen(zustand, kontext);
  for (const zeile of zeilen) {
    if (zeile.zurueckgezogen) continue;
    if (posteingangsstand(zeile, stellen) === "NEU") lage.neuFuerStellen += 1;
    if (zeile.laufzustand === "VOR_FMZ") lage.vorFmz += 1;
    if (zeile.laufzustand === "VOR_SICHTER") lage.vorSichter += 1;
    if (zeile.laufzustand === "VOR_LDF" && lage.vorLdf !== undefined) lage.vorLdf += 1;
    if (zeile.vorrangstufe < 2 && offenFuerStellen(zeile, stellen, umfeld)) lage.mitVorrangOffen += 1;
    if (zeile.fmzUeberSchwelle) lage.ueberSchwelle += 1;
    // R2-LdF P2-4: die Schwellenzahl mischte LdF und FmZ.
    if (zeile.fmzUeberSchwelle && lage.ueberSchwelleLdf !== undefined && lage.ueberSchwelleFmz !== undefined) {
      if (zeile.laufzustand === "VOR_LDF") lage.ueberSchwelleLdf += 1;
      else lage.ueberSchwelleFmz += 1;
    }
    // R2-FM P2-5, R2-Si P2-2: die Schwelle je Vorrang (Blitz 5, Sofort 10, einfach die der FmZ).
    if (jetzt !== undefined && zeile.sichterSchwelleUeberschritten === true) lage.vorSichterUeberSchwelle = (lage.vorSichterUeberSchwelle ?? 0) + 1;
  }
  if (jetzt !== undefined) {
    lage.vorSichterUeberSchwelle ??= 0;
    lage.gerechnetUm = jetzt;
  }
  const luecken = nummernluecken(zeilen);
  if (luecken.length > 0) lage.nummernluecken = luecken;
  return lage;
}
