/**
 * Der letzte Kontakt einer Einheit (KONZEPT-FUNKPLAN.md §3, Funkplan F3).
 *
 * **Letzter Kontakt** ist der jüngere Zeitpunkt aus der letzten Funkprobe mit
 * Ergebnis „Kontakt" und der fachlichen Zeit der letzten Statusmeldung
 * (`StatusGesetzt.ereignisZeit`, sonst die Wanduhr des Ereignisses). Ein
 * zurückgenommenes Statusfeld ist keine Meldung und zählt nicht. Eine Probe
 * mit „kein Kontakt" setzt den letzten Kontakt nicht zurück — sie liegt auf
 * einem eigenen Feldpfad — und steht als eigener Hinweis daneben, solange
 * danach kein Kontakt gelang.
 *
 * **Über der Schwelle** ist ein Kontakt, der länger zurückliegt als die
 * Schwelle des Einsatzes (`funkKontaktSchwelleMinuten`, Vorbelegung 60);
 * genau die Schwelle ist noch nicht darüber. Einheiten in Rufbereitschaft,
 * Einsatzvorbehalt, Angefordert und Rückmarsch sind nie darüber: Wer noch
 * nicht da oder schon weg ist, muss nicht funken.
 *
 * `jetzt` kommt vom Aufrufer wie bei `verfuegbarkeitsmarke` (K18): Ring 2
 * liest keine Uhr. Der Worker rechnet den Funkplan mit seiner Uhr; die
 * Einheitentabelle trägt den Kontakt ohne Uhr an der Zeile
 * ({@link Kontaktstand}), und die Oberfläche setzt die Marke mit ihrer
 * Minutenuhr ({@link kontaktmarke}).
 */

import { FUNK_KONTAKT_SCHWELLE_VORBELEGUNG, type Id, type Zeitpunkt } from "../werte.js";
import type { EinheitZustand, Feld, Funkprobenwert, Zustand } from "../zustand.js";
import type { Markenton } from "./abloesung.js";

/** Woher der letzte Kontakt stammt. */
export type Kontaktart = "FUNKPROBE" | "MELDUNG";

/** Status, in denen eine Einheit nie als „kein Kontakt" geführt wird (§3). */
export const STATUS_OHNE_KONTAKTPFLICHT: ReadonlySet<string> = new Set(["RUFBEREITSCHAFT", "EINSATZVORBEHALT", "ANGEFORDERT", "RUECKMARSCH"]);

export interface LetzterKontakt {
  readonly art: Kontaktart;
  readonly zeitpunkt: Zeitpunkt;
  /** Älter als die Schwelle, gerechnet gegen das übergebene `jetzt`; ohne `jetzt` nie. */
  readonly ueberSchwelle: boolean;
}

/** Eine Probe mit „kein Kontakt", die jünger ist als der letzte Kontakt. */
export interface KeinKontaktGemeldet {
  readonly zeitpunkt: Zeitpunkt;
  readonly grund?: string;
  readonly rufgruppeId?: Id;
}

/** Die gesetzten Proben als Rohwert — der Vorher-Wert eines neuen Eintrags. */
export interface LetzteFunkproben {
  readonly KONTAKT?: Funkprobenwert;
  readonly KEIN_KONTAKT?: Funkprobenwert;
}

/**
 * Was die Zeile der Einheitentabelle für „Letzter Kontakt" trägt: der Kontakt
 * ohne Uhr, dazu Schwelle und Kontaktpflicht, damit die Marke ohne weiteren
 * Ruf entsteht ({@link kontaktmarke}).
 */
export interface Kontaktstand {
  readonly art: Kontaktart;
  readonly zeitpunkt: Zeitpunkt;
  readonly schwelleMinuten: number;
  readonly kontaktpflicht: boolean;
}

const MINUTE_MS = 60_000;

/** Die Schwelle des Einsatzes in Minuten; ohne gültigen Wert die Vorbelegung. */
export function funkKontaktSchwelle(zustand: Zustand): number {
  const wert = zustand.einsatz?.funkKontaktSchwelleMinuten?.wert;
  return typeof wert === "number" && Number.isInteger(wert) && wert >= 1 ? wert : FUNK_KONTAKT_SCHWELLE_VORBELEGUNG;
}

function zeitMs(zeitpunkt: string | undefined): number {
  return zeitpunkt === undefined ? Number.NaN : Date.parse(zeitpunkt);
}

/** Der Wert eines Probenfeldes, wenn er die Form hat; `null` (zurückgenommen bis leer) ist keiner. */
export function funkprobenwert(feld: Feld<Funkprobenwert> | undefined): Funkprobenwert | undefined {
  const wert = feld?.wert as Partial<Funkprobenwert> | null | undefined;
  if (wert === null || wert === undefined || typeof wert.zeitpunkt !== "string" || Number.isNaN(zeitMs(wert.zeitpunkt))) return undefined;
  return {
    zeitpunkt: wert.zeitpunkt,
    ...(typeof wert.rufgruppeId === "string" && wert.rufgruppeId !== "" ? { rufgruppeId: wert.rufgruppeId } : {}),
    ...(typeof wert.grund === "string" && wert.grund !== "" ? { grund: wert.grund } : {}),
  };
}

export function letzteFunkproben(einheit: EinheitZustand): LetzteFunkproben {
  const kontakt = funkprobenwert(einheit.letzteFunkprobe?.KONTAKT);
  const kein = funkprobenwert(einheit.letzteFunkprobe?.KEIN_KONTAKT);
  return { ...(kontakt === undefined ? {} : { KONTAKT: kontakt }), ...(kein === undefined ? {} : { KEIN_KONTAKT: kein }) };
}

/** Die Zeit der letzten Statusmeldung: Funkzeit, sonst Wanduhr; eine Rücknahme ist keine Meldung. */
function meldezeit(einheit: EinheitZustand): Zeitpunkt | undefined {
  const status = einheit.status;
  if (status.undoOf !== undefined) return undefined;
  const zeit = status.fachlicheZeit ?? status.wanduhr;
  return Number.isNaN(zeitMs(zeit)) ? undefined : zeit;
}

/** Der jüngere aus Funkprobe „Kontakt" und Statusmeldung — ohne Uhr. Bei Gleichstand die Funkprobe. */
export function letzterKontaktOhneUhr(einheit: EinheitZustand): { readonly art: Kontaktart; readonly zeitpunkt: Zeitpunkt } | undefined {
  const probe = funkprobenwert(einheit.letzteFunkprobe?.KONTAKT)?.zeitpunkt;
  const meldung = meldezeit(einheit);
  if (probe === undefined) return meldung === undefined ? undefined : { art: "MELDUNG", zeitpunkt: meldung };
  if (meldung !== undefined && zeitMs(meldung) > zeitMs(probe)) return { art: "MELDUNG", zeitpunkt: meldung };
  return { art: "FUNKPROBE", zeitpunkt: probe };
}

/** Muss die Einheit in diesem Status funken? */
export function kontaktpflicht(status: string): boolean {
  return !STATUS_OHNE_KONTAKTPFLICHT.has(status);
}

/** Älter als die Schwelle? Genau die Schwelle ist noch nicht darüber; ohne lesbares `jetzt` nie. */
export function istUeberSchwelle(zeitpunkt: Zeitpunkt, jetzt: Zeitpunkt | undefined, schwelleMinuten: number): boolean {
  const alter = zeitMs(jetzt) - zeitMs(zeitpunkt);
  return !Number.isNaN(alter) && alter > schwelleMinuten * MINUTE_MS;
}

/** Der letzte Kontakt mit Schwelle; `undefined`, wenn weder Probe noch Meldung eine Zeit tragen. */
export function letzterKontakt(einheit: EinheitZustand, jetzt: Zeitpunkt | undefined, schwelleMinuten: number): LetzterKontakt | undefined {
  const kontakt = letzterKontaktOhneUhr(einheit);
  if (kontakt === undefined) return undefined;
  const pflicht = kontaktpflicht(typeof einheit.status.wert === "string" ? einheit.status.wert : "");
  return { ...kontakt, ueberSchwelle: pflicht && istUeberSchwelle(kontakt.zeitpunkt, jetzt, schwelleMinuten) };
}

/** Die letzte Probe „kein Kontakt", wenn danach kein Kontakt gelang. */
export function keinKontaktGemeldet(einheit: EinheitZustand): KeinKontaktGemeldet | undefined {
  const kein = funkprobenwert(einheit.letzteFunkprobe?.KEIN_KONTAKT);
  if (kein === undefined) return undefined;
  const kontakt = letzterKontaktOhneUhr(einheit);
  if (kontakt !== undefined && zeitMs(kontakt.zeitpunkt) >= zeitMs(kein.zeitpunkt)) return undefined;
  return kein;
}

/** Der jüngste Zeitpunkt einer Liste. */
export function juengste(zeiten: readonly (Zeitpunkt | undefined)[]): Zeitpunkt | undefined {
  let beste: Zeitpunkt | undefined;
  for (const zeit of zeiten) {
    if (zeit !== undefined && (beste === undefined || zeitMs(zeit) > zeitMs(beste))) beste = zeit;
  }
  return beste;
}

/** Die Zelle der Einheitentabelle: der Kontakt ohne Uhr, mit Schwelle und Kontaktpflicht. */
export function kontaktstand(zustand: Zustand, einheit: EinheitZustand): Kontaktstand | undefined {
  const kontakt = letzterKontaktOhneUhr(einheit);
  if (kontakt === undefined) return undefined;
  const status = typeof einheit.status.wert === "string" ? einheit.status.wert : "";
  return { ...kontakt, schwelleMinuten: funkKontaktSchwelle(zustand), kontaktpflicht: kontaktpflicht(status) };
}

// ---------------------------------------------------------------------------
// Schreibweisen
// ---------------------------------------------------------------------------

/** „1431" — die Uhrzeit der Ortszeit, wie sie der Sprechfunker sagt. */
export function uhrzeitKurz(zeitpunkt: Zeitpunkt): string {
  const zeit = new Date(zeitpunkt);
  if (Number.isNaN(zeit.getTime())) return "—";
  const zwei = (n: number): string => String(n).padStart(2, "0");
  return `${zwei(zeit.getHours())}${zwei(zeit.getMinutes())}`;
}

/** „1 h 53 min", „12 min" — das Alter eines Kontakts, abgerundet auf die Minute. */
export function alterText(zeitpunkt: Zeitpunkt, jetzt: Zeitpunkt): string {
  const minuten = Math.max(0, Math.floor((zeitMs(jetzt) - zeitMs(zeitpunkt)) / MINUTE_MS));
  if (Number.isNaN(minuten)) return "";
  const stunden = Math.floor(minuten / 60);
  return stunden === 0 ? `${String(minuten)} min` : `${String(stunden)} h ${String(minuten % 60)} min`;
}

export function kontaktartWort(art: Kontaktart): string {
  return art === "FUNKPROBE" ? "Funkprobe" : "Meldung";
}

/** „1431 Funkprobe" — der Text der Zelle ohne Uhr. */
export function kontaktText(kontakt: { readonly art: Kontaktart; readonly zeitpunkt: Zeitpunkt }): string {
  return `${uhrzeitKurz(kontakt.zeitpunkt)} ${kontaktartWort(kontakt.art)}`;
}

/** Eine Marke mit Erklärung für den Tooltip. */
export interface Kontaktmarke {
  readonly text: string;
  readonly ton: Markenton;
  readonly titel: string;
}

/**
 * Die Marke „Letzter Kontakt" für ein `jetzt` des Aufrufers: neutral
 * „1431 Funkprobe", über der Schwelle Bernstein mit Alter „1250 · 1 h 53 min".
 * Ohne Kontakt keine Marke.
 */
export function kontaktmarke(stand: Kontaktstand | undefined, jetzt: Zeitpunkt): Kontaktmarke | undefined {
  if (stand === undefined) return undefined;
  const titel = `${kontaktText(stand)} · vor ${alterText(stand.zeitpunkt, jetzt)}`;
  if (stand.kontaktpflicht && istUeberSchwelle(stand.zeitpunkt, jetzt, stand.schwelleMinuten)) {
    return {
      text: `${uhrzeitKurz(stand.zeitpunkt)} · ${alterText(stand.zeitpunkt, jetzt)}`,
      ton: "warn",
      titel: `${titel} — kein Kontakt seit mehr als ${String(stand.schwelleMinuten)} min`,
    };
  }
  return { text: kontaktText(stand), ton: "neutral", titel };
}
