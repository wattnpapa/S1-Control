/**
 * Die Welt der Nachrichten-Szenarien: ein Einsatz auf echtem Dateisystem mit
 * einem Arbeitsplatz je Stelle, so wie die Szenarientests des Workers sie
 * bauen (`src/worker/pruefhilfen/werkstatt.ts`).
 *
 * Warum je Stelle ein eigener Aktendienst und nicht einer mit allen Stellen:
 * Der Laufweg des Vordrucks ist ein Weg **zwischen** Stühlen. Ob der
 * Fernmelder einen Sichter sieht, entscheidet die Präsenz eines anderen
 * Arbeitsplatzes, und ob S2 die rote Kopie bekommt, zeigt erst der Posteingang
 * eines anderen Rechners nach dem Abgleich über den Share. Ein einziger Dienst
 * mit allen Stellen prüfte nur, dass ein Platz mit sich selbst einig ist.
 *
 * Die Welt lebt je Testdatei einmal (Vitest isoliert die Dateien); jedes
 * Szenario beginnt mit „Angenommen ein Einsatz ist angelegt" und baut sie neu.
 */

import type { Nachrichtenzeile, Tagebuchzeile } from "@s1/domaene";

import type { Bedienergebnis, Entwurf, Lagebild, Mitteilung } from "../../src/kontrakt/index.js";
import { baueDienst, baueWerkstatt, grundlage, legeEinsatzordnerAn, raeumeAuf, takteBis, type Platz } from "../../src/worker/pruefhilfen/werkstatt.js";

/** Ein Arbeitsplatz mit der Stelle, die er in diesem Szenario führt. */
export interface Stuhl {
  readonly platz: Platz;
  readonly stelle: string;
  readonly handzeichen: string;
}

/** Wer in einem Schritt handelt: die Stelle und, bei zwei gleichen Stellen, welcher. */
export interface Rolle {
  readonly stelle: string;
  /** 1 für „der erste", 2 für „der zweite"; sonst 1. */
  readonly nr: number;
  /** Wie der Schritt die Rolle nennt — für die Fehlermeldung. */
  readonly wort: string;
}

/** Was ein Szenario über seine Nachrichten weiß: Id und Betreff. */
interface Merkposten {
  readonly id: string;
  readonly betreff: string;
}

interface Zustand {
  wurzel: string;
  share: string;
  stuehle: Stuhl[];
  nachrichten: Merkposten[];
  /** Das letzte Bedienergebnis je Rolle — für Hinweise und Konflikte. */
  ergebnisse: Map<string, Bedienergebnis>;
  /** Was ein Sichter beim Öffnen des Laufzettels gesehen hat (Vorwert der Sichtung). */
  laufzettel: Map<string, unknown>;
  /** Der Schritt, der zuerst fehlschlug; danach wird übersprungen wie in Cucumber. */
  abgebrochen?: string;
}

let welt: Zustand | undefined;

/** Die Wanduhr als Zeitpunkt eines Vermerks — der Bediener trägt „jetzt“ ein. */
export const jetzt = (): string => new Date().toISOString();

/** Eine Zeit vor so vielen Minuten — für Vermerke, die auf Papier älter sind. */
export function vorMinuten(minuten: number): string {
  return new Date(Date.now() - minuten * 60_000).toISOString();
}

export function aktuelleWelt(): Zustand {
  if (welt === undefined) throw new Error("Kein Einsatz angelegt: Jedes Szenario beginnt mit „Angenommen ein Einsatz ist angelegt“.");
  return welt;
}

/** Schließt alle Plätze und räumt die Wegwerf-Verzeichnisse ab. */
export function schliesseWelt(): void {
  for (const stuhl of welt?.stuehle ?? []) stuhl.platz.dienst.schliesse();
  welt = undefined;
  raeumeAuf();
}

/** Ein frischer Einsatz mit einem ersten Arbeitsplatz, der die drei Grundereignisse schreibt. */
export async function legeEinsatzAn(): Promise<void> {
  schliesseWelt();
  const { wurzel, share } = baueWerkstatt();
  await legeEinsatzordnerAn(wurzel, share);
  const erster = baueDienst(wurzel, share, 1);
  await erster.dienst.oeffne();
  await grundlage(erster);
  welt = { wurzel, share, stuehle: [{ platz: erster, stelle: "", handzeichen: "" }], nachrichten: [], ergebnisse: new Map(), laufzettel: new Map() };
}

/**
 * Setzt Stelle und Handzeichen auf den nächsten Arbeitsplatz. Der erste
 * Platz der Werkstatt hat noch keine Stelle und wird zuerst vergeben; jeder
 * weitere ist ein neuer Rechner am selben Share.
 */
export async function besetze(stelle: string, handzeichen: string): Promise<void> {
  const w = aktuelleWelt();
  const frei = w.stuehle.findIndex((s) => s.stelle === "");
  const platz = frei >= 0 ? w.stuehle[frei]!.platz : baueDienst(w.wurzel, w.share, w.stuehle.length + 1);
  if (frei < 0) await platz.dienst.oeffne();
  platz.dienst.stellenSetzen([stelle], handzeichen);
  const stuhl = { platz, stelle, handzeichen };
  if (frei >= 0) w.stuehle[frei] = stuhl;
  else w.stuehle.push(stuhl);
}

/** Lässt alle Plätze takten, bis Ereignisse und Präsenz überall angekommen sind. */
export async function gleicheAb(): Promise<void> {
  await takteBis(aktuelleWelt().stuehle.map((s) => s.platz), 4);
}

export function stuhlVon(rolle: Rolle): Stuhl {
  const w = aktuelleWelt();
  const passende = w.stuehle.filter((s) => s.stelle === rolle.stelle);
  const stuhl = passende[rolle.nr - 1];
  if (stuhl === undefined) {
    const besetzt = w.stuehle.map((s) => s.stelle || "(ohne Stelle)").join(", ");
    throw new Error(`${rolle.wort} sitzt an keinem Arbeitsplatz dieses Szenarios (besetzt: ${besetzt}).`);
  }
  return stuhl;
}

/** Irgendein Platz, von dem aus gelesen wird — nach dem Abgleich sehen alle dasselbe. */
export function leser(): Platz {
  return aktuelleWelt().stuehle[0]!.platz;
}

/**
 * Schreibt einen Entwurf vom Platz der Rolle, gleicht ab und liefert das
 * Ergebnis. `erlaubeVorwert` lässt die Abweisung wegen eines fremden
 * Vorwerts durch: Für die zweite Sichtung ist sie das gesuchte Ergebnis.
 */
export async function bediene(rolle: Rolle, entwurf: Entwurf, erlaubeVorwert = false): Promise<Bedienergebnis> {
  const stuhl = stuhlVon(rolle);
  const ergebnis = await stuhl.platz.dienst.bediene(entwurf);
  aktuelleWelt().ergebnisse.set(`${rolle.stelle}#${String(rolle.nr)}`, ergebnis);
  await gleicheAb();
  const vorwert = ergebnis.art === "abgewiesen" && ergebnis.code === "VORWERT";
  if (ergebnis.art !== "geschrieben" && !(erlaubeVorwert && vorwert)) {
    const meldung = "meldung" in ergebnis ? ergebnis.meldung : "";
    const code = "code" in ergebnis && ergebnis.code !== undefined ? ` [${ergebnis.code}]` : "";
    throw new Error(`${rolle.wort} konnte „${entwurf.typ}“ nicht schreiben: ${ergebnis.art}${code} — ${meldung}`);
  }
  return ergebnis;
}

export function letztesErgebnis(rolle: Rolle): Bedienergebnis | undefined {
  return aktuelleWelt().ergebnisse.get(`${rolle.stelle}#${String(rolle.nr)}`);
}

export function merkeLaufzettel(rolle: Rolle, gesehen: unknown): void {
  aktuelleWelt().laufzettel.set(`${rolle.stelle}#${String(rolle.nr)}`, gesehen);
}

/** Was der Laufzettel beim Öffnen sah; ohne Öffnen der heute geltende Wert. */
export function laufzettel(rolle: Rolle, geltend: unknown): unknown {
  const schluessel = `${rolle.stelle}#${String(rolle.nr)}`;
  const w = aktuelleWelt();
  return w.laufzettel.has(schluessel) ? w.laufzettel.get(schluessel) : geltend;
}

/** Vergibt eine Id für eine neue Nachricht und merkt sich ihren Betreff. */
export function neueNachricht(betreff: string): string {
  const w = aktuelleWelt();
  const id = `N-${String(w.nachrichten.length + 1)}`;
  w.nachrichten.push({ id, betreff });
  return id;
}

/** Die Nachricht, von der das Szenario gerade spricht: die zuletzt angelegte. */
export function aktuelleNachricht(): Merkposten {
  const letzte = aktuelleWelt().nachrichten.at(-1);
  if (letzte === undefined) throw new Error("Es gibt in diesem Szenario noch keine Nachricht.");
  return letzte;
}

type Sicht = "posteingang" | "ausgang" | "sichter" | "fmz" | "nachweisung";

/** Eine Sicht des Blattes „Nachrichten", wie das Fenster sie anfordert. */
export function sicht(platz: Platz, art: Sicht, stellen?: readonly string[]): readonly Nachrichtenzeile[] {
  const ruf = { art: "nachrichtenAnfordern" as const, akteId: `akte-${String(platz.nummer)}`, sicht: art, anzahl: 500 };
  return platz.dienst.nachrichten(stellen === undefined ? ruf : { ...ruf, stellen: [...stellen] }).zeilen;
}

/** Die Zeile der Nachricht über die Nachweisung, die alle Nachrichten führt. */
export function zeileDer(id: string): Nachrichtenzeile {
  const zeile = sicht(leser(), "nachweisung").find((z) => z.id === id);
  if (zeile === undefined) throw new Error(`Die Nachricht ${id} steht in keiner Sicht — sie wurde nicht angelegt.`);
  return zeile;
}

/** Die Worte, mit denen die Szenarien den Laufzustand nennen. */
export const LAUFZUSTAND_WORT: Readonly<Record<string, string>> = {
  "vor der FmZ": "VOR_FMZ",
  "beim LdF": "VOR_LDF",
  "vor dem Sichter": "VOR_SICHTER",
  verteilt: "VERTEILT",
  erledigt: "ERLEDIGT",
  zurückgezogen: "ZURUECKGEZOGEN",
};

/** Das Lagebild nach einem vollen Stand, wie das Fenster es hat. */
export function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("Der Arbeitsplatz hat kein volles Lagebild gesendet.");
  return stand.voll;
}

/** Die Tagebuchzeilen einer Nachricht, älteste zuerst — erkannt am Betreff in ‚…‘. */
export function tagebuchDer(betreff: string): readonly Tagebuchzeile[] {
  const platz = leser();
  const { zeilen } = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: `akte-${String(platz.nummer)}`, anzahl: 500 });
  return zeilen.filter((z) => z.satz.includes(`‚${betreff}‘`)).reverse();
}

/** Merkt den ersten fehlgeschlagenen Schritt eines Szenarios. */
export function merkeAbbruch(schritt: string): void {
  if (welt !== undefined) welt.abgebrochen ??= schritt;
}

export function abgebrochenBei(): string | undefined {
  return welt?.abgebrochen;
}
