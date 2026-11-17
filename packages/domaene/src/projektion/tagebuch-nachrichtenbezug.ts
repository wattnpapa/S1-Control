/**
 * Die Nachricht hinter einer Tagebuchzeile (additiv, 2026-11-17).
 *
 * Aus dem Audit des ETB-Führers:
 *
 *  * P0-1: Eine Tagebuchzeile hing nur über Text an ihrer Nachricht; „Im
 *    Tagebuch zeigen" war eine Suche auf den Betreff und fand fremde Zeilen.
 *    Jede Zeile einer Nachricht trägt deshalb ihre Kennung (`nachrichtId`),
 *    auch ein frei getippter Eintrag mit Bezug NACHRICHT, und der Filter des
 *    Tagebuchs schneidet danach.
 *  * P0-2: Berichtigungen an Nachrichten waren im Tagebuch nicht als solche
 *    erkennbar, und die Nummer in der Zeile war die von heute. Hier entsteht
 *    der Verlauf in HLC-Ordnung (`nachrichtenverlauf`): je Ereignis die
 *    Nummer, die zu seiner Zeit galt, und ob schon gesichtet war. Als
 *    Berichtigung gilt ein Vermerk der Form (a) mit gesetztem `vorher`, der
 *    eine frühere Beobachtung verdrängt, und das Zurückziehen.
 *  * P0-3 / P1-7: Das Handzeichen steht als eigene Angabe der Zeile, wo das
 *    Ereignis eines trägt, damit der Druck es als Spalte führen kann.
 */

import type { EreignisId } from "../ereignis.js";
import type { EingehendesEreignis } from "../fold.js";
import { kanonischeSerialisierung, type KanonischerWert } from "../kanonisch.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";
import { NACHRICHTENARTEN, nummernkurz, type Zeitstand } from "./tagebuch-nachrichten.js";

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : undefined;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

/**
 * Die Vermerke, deren zweite Beobachtung eine Berichtigung ist. Kenntnisnahme
 * und Erledigung gehören nicht dazu: Sie sind je Stelle und wechseln im
 * gewöhnlichen Lauf (erledigt, zurückgenommen, erledigt).
 */
const VERMERKARTEN: ReadonlySet<string> = new Set([
  "NachrichtAngenommen",
  "NachrichtUebermittlungVorgeschlagen",
  "NachrichtBefoerdert",
  "NachrichtNachgewiesen",
  "NachrichtWeitergegeben",
  "NachrichtGesichtet",
  "NachrichtVermerkt",
]);

/** Die Kennung der Nachricht, über die das Ereignis spricht — auch ein Tagebucheintrag mit Bezug NACHRICHT. */
export function nachrichtIdDer(ereignis: EingehendesEreignis): Id | undefined {
  const nutzlast = objekt(ereignis.nutzlast);
  if (ereignis.typ === "EtbEintragErfasst") {
    const bezug = objekt(nutzlast?.["bezug"]);
    return bezug?.["entitaet"] === "NACHRICHT" ? text(bezug["id"]) : undefined;
  }
  if (!NACHRICHTENARTEN.has(ereignis.typ)) return undefined;
  return text(nutzlast?.["nachrichtId"]);
}

function gleich(a: unknown, b: unknown): boolean {
  try {
    return kanonischeSerialisierung(a as KanonischerWert) === kanonischeSerialisierung(b as KanonischerWert);
  } catch {
    return false;
  }
}

/**
 * Ist die Zeile eine Berichtigung oder Rücknahme an einer Nachricht (ETB
 * P0-2)? Das Zurückziehen immer; ein Vermerk, der einen früheren Wert
 * (`vorher` gesetzt) durch einen anderen ersetzt oder löscht.
 */
export function istNachrichtenberichtigung(ereignis: EingehendesEreignis): boolean {
  if (ereignis.typ === "NachrichtZurueckgezogen") return true;
  if (!VERMERKARTEN.has(ereignis.typ) || !("vorher" in ereignis)) return false;
  const vorher = ereignis.vorher;
  if (vorher === null || vorher === undefined || vorher === "") return false;
  return !gleich(vorher, ereignis.neu);
}

/**
 * Das Handzeichen, das das Ereignis selbst trägt: im Wert eines Vermerks,
 * in der Nutzlast (Zeichen der Abfassung, Handzeichen der Aufnahme) oder
 * einer Funkprobe. Fehlt, wo die Art keines kennt — dann steht nichts da,
 * statt eines geratenen.
 */
export function handzeichenDer(ereignis: EingehendesEreignis): string | undefined {
  const nutzlast = objekt(ereignis.nutzlast);
  return (
    text(objekt(ereignis.neu)?.["handzeichen"]) ??
    text(nutzlast?.["handzeichen"]) ??
    text(objekt(nutzlast?.["aufnahme"])?.["handzeichen"]) ??
    text(nutzlast?.["zeichen"])
  );
}

interface Verlaufsstand {
  nummer: number | undefined;
  gesichtet: boolean;
}

/**
 * Der Verlauf je Ereignis einer Nachricht: die Nummer und die Sichtung, wie
 * sie **vor** dem Ereignis galten (bei der Nachweisung die Nummer, die sie
 * vergibt). Die Ereignisse kommen in beliebiger Ordnung; gerechnet wird in
 * HLC-Ordnung — das ist die Regel des Folds (LWW), also der Stand, den jeder
 * Arbeitsplatz zu diesem Zeitpunkt der Ordnung hatte.
 */
export function nachrichtenverlauf(
  aufsteigend: readonly EingehendesEreignis[],
): ReadonlyMap<EreignisId, Zeitstand> {
  const stand = new Map<Id, Verlaufsstand>();
  const verlauf = new Map<EreignisId, Zeitstand>();
  for (const ereignis of aufsteigend) {
    if (!NACHRICHTENARTEN.has(ereignis.typ)) continue;
    const id = nachrichtIdDer(ereignis);
    if (id === undefined) continue;
    const bisher = stand.get(id) ?? { nummer: undefined, gesichtet: false };
    const neueNummer = objekt(ereignis.neu)?.["nummer"];
    const nummer = ereignis.typ === "NachrichtNachgewiesen" && typeof neueNummer === "number" ? neueNummer : bisher.nummer;
    verlauf.set(ereignis.id, { ...(nummer === undefined ? {} : { nummer }), sichtungVorher: bisher.gesichtet });
    if (ereignis.typ === "NachrichtNachgewiesen") bisher.nummer = typeof neueNummer === "number" ? neueNummer : undefined;
    if (ereignis.typ === "NachrichtGesichtet") bisher.gesichtet = objekt(ereignis.neu) !== undefined;
    stand.set(id, bisher);
  }
  return verlauf;
}

/** Die additiven Felder einer Tagebuchzeile zur Nachricht (ETB P0-1, P0-2, P0-3). */
export interface Nachrichtenzeilenfelder {
  readonly nachrichtId?: Id;
  readonly nachrichtNummer?: string;
  readonly berichtigung?: boolean;
  readonly handzeichen?: string;
}

/** Die Felder für eine Zeile; die Nummer zur Zeit des Ereignisses, wo der Verlauf sie kennt. */
export function nachrichtenzeilenfelder(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  zeitstand: Zeitstand | undefined,
): Nachrichtenzeilenfelder {
  const handzeichen = handzeichenDer(ereignis);
  const nachrichtId = nachrichtIdDer(ereignis);
  const ergebnis = { ...(handzeichen === undefined ? {} : { handzeichen }) };
  if (nachrichtId === undefined) return ergebnis;
  const nachricht = zustand.nachrichten?.[nachrichtId];
  const heute = objekt(nachricht?.nachweis?.wert)?.["nummer"];
  const nummer = zeitstand === undefined ? heute : zeitstand.nummer;
  const richtung = nachricht?.richtung.wert ?? objekt(ereignis.nutzlast)?.["richtung"];
  return {
    ...ergebnis,
    nachrichtId,
    nachrichtNummer: nummernkurz(richtung, nummer),
    ...(istNachrichtenberichtigung(ereignis) ? { berichtigung: true } : {}),
  };
}
