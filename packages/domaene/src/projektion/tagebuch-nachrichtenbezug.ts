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
import { NACHRICHTENARTEN, istErsatzsichtung, istKopienNachBefoerderung, nummernkurz, stellenWort, type Zeitstand } from "./tagebuch-nachrichten.js";

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
  // Additiv (FM P2-7): die Berichtigung der Aufnahme ersetzt den Aufnahmevermerk der Anlage.
  "NachrichtAufnahmeBerichtigt",
  "NachrichtAngenommen",
  "NachrichtUebermittlungVorgeschlagen",
  "NachrichtBefoerdert",
  "NachrichtNachgewiesen",
  "NachrichtWeitergegeben",
  "NachrichtGesichtet",
  "NachrichtVermerkt",
]);

/** Arten außerhalb der Nachrichten, die eine Stelle in der Nutzlast tragen können (R2-ETB P2-2). */
const MIT_STELLE_AUSSERHALB: ReadonlySet<string> = new Set(["EinsatzBeendet", "EtbEintragErfasst"]);

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

/**
 * Die Stelle, die das Ereignis selbst nennt (ETB P1-7): `stelle` in der
 * Nutzlast (Kenntnis, Erledigung), die Funktion der Abfassung (Feld 15), und
 * bei Arten, die nur eine Station schreibt, diese Station — Sichtung (nicht
 * die Ersatzsichtung, die die FmZ schreibt) und Weitergabe/Vorschlag des LdF.
 * Die Präsenz zur Zeit des Ereignisses ist nicht aufbewahrt; ohne Angabe im
 * Ereignis fehlt die Stelle, statt geraten zu werden.
 */
export function stelleDer(ereignis: EingehendesEreignis): string | undefined {
  const nutzlast = objekt(ereignis.nutzlast);
  // R2-ETB P2-2: Einsatzende und Abschlussvermerk tragen die Stelle der Sitzung, die beendet.
  if (MIT_STELLE_AUSSERHALB.has(ereignis.typ)) return text(nutzlast?.["stelle"]);
  if (!NACHRICHTENARTEN.has(ereignis.typ)) return undefined;
  // R2-ETB P1-1: die Stelle der Sitzung, die der Worker seit dem zweiten Durchlauf mitschreibt.
  const genannt = text(nutzlast?.["stelle"]);
  if (genannt !== undefined) return genannt;
  if (ereignis.typ === "NachrichtVerfasst") {
    // Beim Eingang mit Aufnahmevermerk ist `funktion` die des Absenders draußen
    // („EL“, „Zugführer“), nicht die Stelle, die aufgenommen hat (R2-ETB P1-1).
    return objekt(nutzlast?.["aufnahme"]) === undefined ? text(nutzlast?.["funktion"]) : undefined;
  }
  // Die Kopien nach der Beförderung verteilt die FmZ, kein Sichter (R2-ETB P1-1, R2-SGL P3-4).
  if (istKopienNachBefoerderung(ereignis)) return "FMZ";
  if (ereignis.typ === "NachrichtGesichtet" && !istErsatzsichtung(ereignis) && objekt(ereignis.neu) !== undefined) return "SICHTER";
  if (ereignis.typ === "NachrichtWeitergegeben" || ereignis.typ === "NachrichtUebermittlungVorgeschlagen") return "LDF";
  return undefined;
}

/**
 * Der Akteur einer Tagebuchzeile für Bildschirm und Druck (ETB P1-7):
 * Stelle und Handzeichen, wo das Ereignis sie trägt („S4 · Ru“), sonst der
 * Anzeigename des Arbeitsplatzes aus dem Rahmen.
 */
export function akteurText(zeile: { readonly akteur: string; readonly stelle?: string | undefined; readonly handzeichen?: string | undefined }): string {
  const teile = [zeile.stelle === undefined ? "" : stellenWort(zeile.stelle), zeile.handzeichen ?? ""].filter((t) => t !== "");
  return teile.length === 0 ? zeile.akteur : teile.join(" · ");
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
  /** Additiv (ETB P1-7): die Stelle, die das Ereignis nennt (`stelleDer`). */
  readonly stelle?: string;
}

/** Die Felder für eine Zeile; die Nummer zur Zeit des Ereignisses, wo der Verlauf sie kennt. */
export function nachrichtenzeilenfelder(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  zeitstand: Zeitstand | undefined,
): Nachrichtenzeilenfelder {
  const handzeichen = handzeichenDer(ereignis);
  const stelle = stelleDer(ereignis);
  const nachrichtId = nachrichtIdDer(ereignis);
  const ergebnis = { ...(handzeichen === undefined ? {} : { handzeichen }), ...(stelle === undefined ? {} : { stelle }) };
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
