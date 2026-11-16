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
import { vergleicheHlc, type Hlc } from "../hlc.js";
import { vergleicheNachCodepunkt } from "../kanonisch.js";
import {
  zMittelvermerk,
  zNachweis,
  zSichtung,
  zZeitvermerk,
} from "../katalog/schemata-nachrichten.js";
import { FMZ_SCHWELLE_VORBELEGUNG, type Id } from "../werte.js";
import type {
  Laufzustand,
  Mittelvermerk,
  NachrichtZustand,
  Nachweisvermerk,
  Sichtungsvermerk,
  Zeitvermerk,
} from "../zustand-nachricht.js";
import type { Feld, Zustand } from "../zustand.js";

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
  readonly befoerderung?: Mittelvermerk;
  readonly nachweis?: Nachweisvermerk;
  readonly sichtung?: Sichtungsvermerk;
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
  /** Angenommen, unbefördert, länger als die Schwelle (§5); nur mit `jetzt`. */
  readonly fmzUeberSchwelle: boolean;
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

function marken(n: NachrichtZustand, sichtung: Sichtungsvermerk | undefined): Nachrichtenmarke[] {
  const ergebnis: Nachrichtenmarke[] = [];
  for (const { stelle, kopie } of sichtung?.verteiler ?? []) {
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

function ueberSchwelle(
  annahme: Zeitvermerk | undefined,
  befoerderung: Mittelvermerk | undefined,
  kontext: Zeilenkontext,
): boolean {
  if (annahme === undefined || befoerderung !== undefined || kontext.jetzt === undefined) return false;
  const seit = Date.parse(kontext.jetzt) - Date.parse(annahme.zeitpunkt);
  return Number.isFinite(seit) && seit > kontext.schwelleMinuten * 60000;
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

/** Baut die Zeile einer Nachricht. */
export function nachrichtenzeile(n: NachrichtZustand, kontext: Zeilenkontext): Nachrichtenzeile {
  const aufnahme = gelesen(zMittelvermerk, n.aufnahme);
  const annahme = gelesen(zZeitvermerk, n.annahme);
  const befoerderung = gelesen(zMittelvermerk, n.befoerderung);
  const nachweis = gelesen(zNachweis, n.nachweis);
  const sichtung = gelesen(zSichtung, n.sichtung);
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
    ...(befoerderung === undefined ? {} : { befoerderung }),
    ...(sichtung === undefined ? {} : { sichtung }),
    ...(vermerke === undefined || vermerke === "" ? {} : { vermerke }),
    verteiler: marken(n, sichtung),
    laufzustand: n.laufzustand,
    zurueckgezogen: n.laufzustand === "ZURUECKGEZOGEN",
    angelegtDurch: n.angelegtDurch,
    angelegtMit: n.angelegtMit,
    clientId: clientDer(n.angelegtDurch),
    fmzUeberSchwelle: n.laufzustand === "VOR_FMZ" && ueberSchwelle(annahme, befoerderung, kontext),
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
