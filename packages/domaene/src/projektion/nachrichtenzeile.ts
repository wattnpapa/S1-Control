/**
 * Die Zeile einer Nachricht, wie jede Sicht des Blattes „Nachrichten" sie
 * zeigt (KONZEPT-NACHRICHTEN.md §6), und die Ordnung der Listen.
 *
 * Die Zeile trägt **alle** Felder des Vordrucks und nicht nur die Spalten der
 * Liste: Sie ist zugleich die Projektion, die der Adapter nach
 * `VordruckDaten` in `@s1/ausgaben` entgegennimmt (§8) — der Adapter bekommt
 * eine Nachricht, nicht den Zustand.
 *
 * Die Vermerke stehen als Strukturwerte im Rahmen (`neu`), und den prüft der
 * Fold nicht (§2.2). Gelesen wird deshalb über die Schemata des Katalogs: Ein
 * Wert, der nicht passt, fehlt in der Zeile, statt sie zu sprengen.
 */

import type { z } from "zod";

import { zerlegeEreignisId, type EreignisId } from "../ereignis.js";
import { streitigeSichtung } from "../fold-nachricht.js";
import { vergleicheHlc, type Hlc } from "../hlc.js";
import { vergleicheNachCodepunkt } from "../kanonisch.js";
import {
  zMittelvermerk,
  zNachweis,
  zSichtung,
  zVorschlag,
  zWeitergabe,
  zZeitvermerk,
} from "../katalog/schemata-nachrichten.js";
import { FMZ_SCHWELLE_VORBELEGUNG, type Id } from "../werte.js";
import type {
  Laufzustand,
  Mittelvermerk,
  NachrichtZustand,
  Nachweisvermerk,
  Sichtungsvermerk,
  Uebermittlungsvorschlag,
  Zeitvermerk,
} from "../zustand-nachricht.js";
import type { Feld, Zustand } from "../zustand.js";
import { fmzVermerkTextAus, laufstandAus, ohneNummerAus, ueberWarteschwelle, type Laufstand, type Wartegrundlage } from "./nachrichtenstand.js";
import { wartegrundlage, wartezeitMinuten, wartezeitVorSichterMinuten, zurueckziehungAus, type Zurueckziehung } from "./nachrichtenzusatz.js";

/** Eine Stelle des Verteilers mit ihrer Kopiefarbe und den beiden Marken. */
export interface Nachrichtenmarke {
  readonly stelle: string;
  /** ROT, GRUEN, BLAU oder ein unbekannter Wert, wie er kam (§3.7). */
  readonly kopie: string;
  readonly gelesen: boolean;
  /** Wer wann Kenntnis genommen hat; fehlt, solange niemand. */
  readonly kenntnis?: Zeitvermerk;
  readonly erledigt: boolean;
}

/** 0 Blitz, 1 Sofort (und ein unbekannter Vorrang), 2 einfach. */
export type Vorrangstufe = 0 | 1 | 2;

export interface Nachrichtenzeile {
  readonly id: Id;
  /** EINGANG oder AUSGANG. */
  readonly richtung: string;
  /** „E" oder „A" — das Kreuz in Feld 5. */
  readonly richtungKurz: "E" | "A";
  readonly art?: string;
  readonly vorrang?: string;
  readonly vorrangstufe: Vorrangstufe;
  readonly gespraechsnotiz: boolean;
  readonly uebermittlungswunsch?: string;
  readonly nummer?: number;
  /** Die Nummer steht in `nachweisnummerDoppelt` (§9) — die Marke der Nachweisung. */
  readonly nummerDoppelt: boolean;
  readonly anschrift: string;
  readonly rufnummer?: string;
  readonly betreff: string;
  readonly inhalt: string;
  readonly absender: string;
  readonly abfassungszeit?: string;
  readonly zeichen?: string;
  readonly funktion?: string;
  /** Aus der Beförderung, sonst aus der Anlage. */
  readonly gegenstelle?: string;
  readonly aufnahme?: Mittelvermerk;
  readonly annahme?: Zeitvermerk;
  /** Der Übermittlungsvorschlag des LdF; fehlt, solange keiner vorliegt. */
  readonly vorschlag?: Uebermittlungsvorschlag;
  readonly befoerderung?: Mittelvermerk;
  readonly nachweis?: Nachweisvermerk;
  /** Additiv: die Weitergabe des Eingangs vom LdF an den Sichter. */
  readonly weitergabe?: Zeitvermerk;
  readonly sichtung?: Sichtungsvermerk;
  /**
   * Additiv: die zweite Sichtung, solange zwei Sichter ohne voneinander zu
   * wissen verteilt haben (§5) — der Verteiler ist dann die Vereinigung, die
   * Zeile trägt die Marke „zwei Sichtungen", bis eine Nachsichtung bereinigt.
   */
  readonly zweiteSichtung?: Sichtungsvermerk;
  /** Der jüngere aus den Vermerken der Sichtung und `NachrichtVermerkt`. */
  readonly vermerke?: string;
  readonly verteiler: readonly Nachrichtenmarke[];
  readonly laufzustand: Laufzustand;
  readonly zurueckgezogen: boolean;
  readonly antwortAuf?: Id;
  readonly weitergeleitetVon?: Id;
  readonly angelegtDurch: EreignisId;
  /** Die HLC der Anlage — die Ordnung innerhalb einer Vorrangstufe. */
  readonly angelegtMit: Hlc;
  /** Der Arbeitsplatz, der die Nachricht verfasst oder aufgenommen hat. */
  readonly clientId: string;
  /**
   * Ausgang bei der FmZ, unbefördert, länger als die Schwelle (§5); nur mit
   * `jetzt`. Gemessen ab dem Eintreffen bei der FmZ, nicht erst ab der
   * Annahme (LdF P0-2, Fernmelder P1-5).
   */
  readonly fmzUeberSchwelle: boolean;
  /** Additiv: Minuten seit dem Eintreffen bei der FmZ, solange unbefördert; nur mit `jetzt` (LdF P0-2). */
  readonly wartetSeit?: number;
  /**
   * Additiv: der sichtbare Stand der Listen, feiner als `laufzustand` (SGL
   * P0-1, `nachrichtenstand.ts`). Die Projektion setzt ihn immer; optional
   * nur, damit handgebaute Zeilen älterer Prüfhilfen gültig bleiben
   * (`standDerZeile` rechnet ihn dann nach).
   */
  readonly laufstand?: Laufstand;
  /** Additiv: Marke „ohne Nummer" — hinter der FmZ, aber nicht nachgewiesen (SGL P0-1, LdF P1-2); immer gesetzt wie `laufstand`. */
  readonly ohneNummer?: boolean;
  /** Additiv: „angenommen 1320 Fm · befördert 1321 Fm (Funk)" — der Vermerk der FmZ für die Listen (SGL P0-1). */
  readonly fmzVermerkText?: string;
  /** Additiv: der Arbeitsplatz, dessen Sichtung gilt — für „meine Sichtungen" (Sichter-Audit). */
  readonly gesichtetVon?: string;
  /**
   * Additiv (zweiter Durchlauf): seit wann der Ausgang bei der FmZ liegt (ISO).
   * Die Spalte „Wartet“ rechnet daraus mit `wartezeitMinuten(zeile, jetzt)`
   * gegen dieselbe Zeit wie das Band, statt eine beim Abruf eingefrorene Zahl
   * zu zeigen.
   */
  readonly eintreffenBeiFmz?: string;
  /** Additiv (Sichter P1-4): seit wann der Eingang vor dem Sichter liegt (ISO). */
  readonly vorSichterSeit?: string;
  /** Additiv (Sichter P1-4): Minuten vor dem Sichter, solange ungesichtet; nur mit `jetzt`. */
  readonly wartetSeitSichter?: number;
  /** Additiv (ETB P1-3, P2-7): Zeit und Grund des Zurückziehens — für Ansicht, Nachweisung und Stempel im Vordruck. */
  readonly zurueckgezogenMit?: Zurueckziehung;
  /**
   * Additiv (ETB P1-2): die laufende Nummer der Tagebuchzeile
   * „aufgegeben/aufgenommen“, wie im gedruckten Tagebuch. Setzt der Worker
   * (`mitEtbNummern`), denn nur er kennt die Ereignisse; Ring 2 lässt sie weg.
   */
  readonly etbNummer?: number;
}

/** Was jede Zeile über den Einsatz wissen muss; einmal je Anfrage gebaut. */
export interface Zeilenkontext {
  readonly doppelt: ReadonlySet<Id>;
  readonly schwelleMinuten: number;
  /** Ring 2 liest keine Uhr: ohne `jetzt` ist nichts über der Schwelle. */
  readonly jetzt?: string;
}

/** Die Schwelle der FmZ aus dem Einsatz, sonst die Vorbelegung (20). */
export function fmzSchwelle(zustand: Zustand): number {
  const wert = zustand.einsatz?.fmzSchwelleMinuten?.wert;
  return typeof wert === "number" && Number.isFinite(wert) && wert > 0 ? wert : FMZ_SCHWELLE_VORBELEGUNG;
}

export function zeilenkontext(zustand: Zustand, jetzt?: string): Zeilenkontext {
  const doppelt = new Set<Id>();
  for (const hinweis of zustand.hinweise) {
    if (hinweis.art === "nachweisnummerDoppelt") for (const id of hinweis.ids) doppelt.add(id);
  }
  return { doppelt, schwelleMinuten: fmzSchwelle(zustand), ...(jetzt === undefined ? {} : { jetzt }) };
}

export function vorrangstufe(vorrang: string | undefined): Vorrangstufe {
  if (vorrang === undefined || vorrang === "") return 2;
  return vorrang === "BLITZ" ? 0 : 1;
}

function text(feld: Feld<unknown> | undefined): string | undefined {
  return typeof feld?.wert === "string" ? feld.wert : undefined;
}

function gelesen<T>(schema: z.ZodType<T>, feld: Feld<unknown> | undefined): T | undefined {
  if (feld === undefined || feld.wert === null) return undefined;
  const ergebnis = schema.safeParse(feld.wert);
  return ergebnis.success ? ergebnis.data : undefined;
}

function marken(n: NachrichtZustand, sichtung: Sichtungsvermerk | undefined, zweite?: Sichtungsvermerk): Nachrichtenmarke[] {
  const ergebnis: Nachrichtenmarke[] = [];
  for (const { stelle, kopie } of [...(sichtung?.verteiler ?? []), ...(zweite?.verteiler ?? [])]) {
    if (ergebnis.some((m) => m.stelle === stelle)) continue;
    const kenntnis = gelesen(zZeitvermerk, n.kenntnis?.[stelle]);
    ergebnis.push({
      stelle,
      kopie,
      gelesen: kenntnis !== undefined,
      ...(kenntnis === undefined ? {} : { kenntnis }),
      erledigt: n.erledigt?.[stelle]?.wert === true,
    });
  }
  return ergebnis;
}

/** Die geltenden Vermerke: wer zuletzt geschrieben hat, Sichtung oder Nachtrag (§9). */
function vermerkeDer(n: NachrichtZustand, sichtung: Sichtungsvermerk | undefined): string | undefined {
  const nachtrag = text(n.vermerke);
  if (nachtrag === undefined || n.vermerke === undefined) return sichtung?.vermerke;
  if (sichtung === undefined || n.sichtung === undefined) return nachtrag;
  return vergleicheHlc(n.vermerke.hlc, n.sichtung.hlc) > 0 ? nachtrag : (sichtung.vermerke ?? nachtrag);
}

/**
 * Über der Schwelle: ein Ausgang vor der FmZ oder beim LdF, unbefördert,
 * mindestens die Schwelle lang **seit dem Eintreffen** (LdF P0-2: vorher zählte
 * nur, was angenommen war — ein Blitz im Fach blieb unbemerkt). Gerechnet in
 * ganzen Minuten über `wartezeitMinuten`, damit Spalte und Band nie
 * auseinanderlaufen (zweiter Durchlauf: „Wartet 0 min“ neben „über der Schwelle“).
 */
function ueberSchwelle(grundlage: Wartegrundlage, kontext: Zeilenkontext): boolean {
  return ueberWarteschwelle(wartezeitMinuten(grundlage, kontext.jetzt), kontext.schwelleMinuten);
}

/** Die additiven Felder des Standes (SGL P0-1, LdF P0-2); eigene Funktion wegen der Länge des Zeilenbaus. */
function standfelder(
  n: NachrichtZustand,
  vermerke: {
    readonly aufnahme: Mittelvermerk | undefined;
    readonly annahme: Zeitvermerk | undefined;
    readonly befoerderung: Mittelvermerk | undefined;
    readonly nachweis: Nachweisvermerk | undefined;
    readonly sichtung: Sichtungsvermerk | undefined;
  },
  kontext: Zeilenkontext,
): Pick<Nachrichtenzeile, "laufstand" | "ohneNummer" | "wartetSeit" | "fmzVermerkText" | "gesichtetVon" | "eintreffenBeiFmz" | "vorSichterSeit" | "wartetSeitSichter"> {
  const richtung = text(n.richtung) ?? "";
  const gespraechsnotiz = n.gespraechsnotiz?.wert === true;
  const nummer = vermerke.nachweis?.nummer;
  const laufstand = laufstandAus({ laufzustand: n.laufzustand, richtung, gespraechsnotiz, nummer, annahme: vermerke.annahme, sichtung: vermerke.sichtung });
  const grundlage = wartegrundlage(n, vermerke.annahme);
  const wartetSeit = wartezeitMinuten(grundlage, kontext.jetzt);
  const wartetSeitSichter = wartezeitVorSichterMinuten(grundlage, kontext.jetzt);
  const fmzVermerkText = fmzVermerkTextAus(vermerke.aufnahme, vermerke.annahme, vermerke.befoerderung);
  const gesichtetVon = vermerke.sichtung === undefined ? undefined : n.sichtung?.hlc.clientId;
  return {
    laufstand,
    ohneNummer: ohneNummerAus(laufstand, nummer),
    ...(wartetSeit === undefined ? {} : { wartetSeit }),
    ...(fmzVermerkText === undefined ? {} : { fmzVermerkText }),
    ...(gesichtetVon === undefined ? {} : { gesichtetVon }),
    ...(grundlage.eintreffenBeiFmz === undefined ? {} : { eintreffenBeiFmz: grundlage.eintreffenBeiFmz }),
    ...(grundlage.vorSichterSeit === undefined ? {} : { vorSichterSeit: grundlage.vorSichterSeit }),
    ...(wartetSeitSichter === undefined ? {} : { wartetSeitSichter }),
  };
}

function clientDer(id: EreignisId): string {
  try {
    return zerlegeEreignisId(id).clientId;
  } catch {
    return "";
  }
}

/** Optionale Textfelder der Anlage, nur wenn gesetzt. */
function freieTexte(n: NachrichtZustand): Partial<Nachrichtenzeile> {
  const paare: readonly [keyof Nachrichtenzeile, Feld<unknown> | undefined][] = [
    ["art", n.art],
    ["vorrang", n.vorrang],
    ["uebermittlungswunsch", n.uebermittlungswunsch],
    ["rufnummer", n.rufnummer],
    ["abfassungszeit", n.abfassungszeit],
    ["zeichen", n.zeichen],
    ["funktion", n.funktion],
    ["antwortAuf", n.antwortAuf],
    ["weitergeleitetVon", n.weitergeleitetVon],
  ];
  const ergebnis: Record<string, string> = {};
  for (const [name, feld] of paare) {
    const wert = text(feld);
    if (wert !== undefined && wert !== "") ergebnis[name] = wert;
  }
  return ergebnis as Partial<Nachrichtenzeile>;
}

/** Die streitige zweite Sichtung nach der Regel des Folds (`streitigeSichtung`). */
function zweiteSichtungDer(n: NachrichtZustand): Sichtungsvermerk | undefined {
  const wert = streitigeSichtung(n.sichtung as Feld<unknown> | undefined);
  if (wert === undefined) return undefined;
  const ergebnis = zSichtung.safeParse(wert);
  return ergebnis.success ? ergebnis.data : undefined;
}

/** Zeit und Grund des Zurückziehens, nur wenn zurückgezogen (ETB P1-3). */
function zurueckgezogenFeld(n: NachrichtZustand): Pick<Nachrichtenzeile, "zurueckgezogenMit"> {
  const mit = zurueckziehungAus(n);
  return mit === undefined ? {} : { zurueckgezogenMit: mit };
}

/** Baut die Zeile einer Nachricht. */
export function nachrichtenzeile(n: NachrichtZustand, kontext: Zeilenkontext): Nachrichtenzeile {
  const aufnahme = gelesen(zMittelvermerk, n.aufnahme);
  const annahme = gelesen(zZeitvermerk, n.annahme);
  const vorschlag = gelesen(zVorschlag, n.vorschlag);
  const befoerderung = gelesen(zMittelvermerk, n.befoerderung);
  const nachweis = gelesen(zNachweis, n.nachweis);
  const weitergabe = gelesen(zWeitergabe, n.weitergabe);
  const sichtung = gelesen(zSichtung, n.sichtung);
  const zweite = zweiteSichtungDer(n);
  const vermerke = vermerkeDer(n, sichtung);
  const gegenstelle = (n.befoerderung?.wert as { gegenstelle?: unknown } | null | undefined)?.gegenstelle;
  const gegenstelleText = typeof gegenstelle === "string" && gegenstelle !== "" ? gegenstelle : text(n.gegenstelle);
  const richtung = text(n.richtung) ?? "";
  return {
    id: n.id,
    richtung,
    richtungKurz: richtung === "AUSGANG" ? "A" : "E",
    ...freieTexte(n),
    vorrangstufe: vorrangstufe(text(n.vorrang)),
    gespraechsnotiz: n.gespraechsnotiz?.wert === true,
    ...(nachweis === undefined ? {} : { nummer: nachweis.nummer, nachweis }),
    nummerDoppelt: kontext.doppelt.has(n.id),
    anschrift: text(n.anschrift) ?? "",
    betreff: text(n.betreff) ?? "",
    inhalt: text(n.inhalt) ?? "",
    absender: text(n.absender) ?? "",
    ...(gegenstelleText === undefined || gegenstelleText === "" ? {} : { gegenstelle: gegenstelleText }),
    ...(aufnahme === undefined ? {} : { aufnahme }),
    ...(annahme === undefined ? {} : { annahme }),
    ...(vorschlag === undefined ? {} : { vorschlag }),
    ...(befoerderung === undefined ? {} : { befoerderung }),
    ...(weitergabe === undefined ? {} : { weitergabe }),
    ...(sichtung === undefined ? {} : { sichtung }),
    ...(zweite === undefined ? {} : { zweiteSichtung: zweite }),
    ...(vermerke === undefined || vermerke === "" ? {} : { vermerke }),
    verteiler: marken(n, sichtung, zweite),
    laufzustand: n.laufzustand,
    zurueckgezogen: n.laufzustand === "ZURUECKGEZOGEN",
    angelegtDurch: n.angelegtDurch,
    angelegtMit: n.angelegtMit,
    clientId: clientDer(n.angelegtDurch),
    // Auch die Zeit beim LdF zählt, und sie läuft ab dem Eintreffen (LdF P0-2).
    fmzUeberSchwelle: ueberSchwelle(wartegrundlage(n, annahme), kontext),
    ...standfelder(n, { aufnahme, annahme, befoerderung, nachweis, sichtung }, kontext),
    ...zurueckgezogenFeld(n),
  };
}

/**
 * Blitz vor Sofort vor einfach, innerhalb der Stufe nach Eingang — der HLC
 * der Anlage, dann der Id (DV 810, Folie 19 und 20; §5 „Vorrang").
 */
export function vergleicheNachrichten(a: Nachrichtenzeile, b: Nachrichtenzeile): number {
  if (a.vorrangstufe !== b.vorrangstufe) return a.vorrangstufe - b.vorrangstufe;
  return vergleicheHlc(a.angelegtMit, b.angelegtMit) || vergleicheNachCodepunkt(a.id, b.id);
}

/** Die Nachweisung: nach Nummer, ohne Nummer zuletzt, sonst nach Eingang. */
export function vergleicheNachNummer(a: Nachrichtenzeile, b: Nachrichtenzeile): number {
  if (a.nummer !== b.nummer) {
    if (a.nummer === undefined) return 1;
    if (b.nummer === undefined) return -1;
    return a.nummer - b.nummer;
  }
  return vergleicheHlc(a.angelegtMit, b.angelegtMit) || vergleicheNachCodepunkt(a.id, b.id);
}

/** Alle Zeilen des Zustands, ungeordnet. */
export function alleNachrichtenzeilen(zustand: Zustand, kontext: Zeilenkontext): Nachrichtenzeile[] {
  return Object.values(zustand.nachrichten ?? {}).map((n) => nachrichtenzeile(n, kontext));
}
