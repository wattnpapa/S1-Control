/**
 * Der Vordruck je Nachricht im Worker (KONZEPT-NACHRICHTEN.md §7, Schnitt N3).
 *
 * Der Worker hält den Zustand; er findet die Zeile, bildet sie mit
 * `nachrichtendruckAus` auf die Eingabe des Vordrucks ab und lässt
 * `@s1/ausgaben` die Bytes zeichnen (jsPDF, ADR-008). Hier steht nur, welche
 * Zeile, welches Blatt, ob Übung und wie die Datei heißt — geschrieben wird
 * vom Aufrufer, in `ausgaben\nachrichten` oder ins Verzeichnis des
 * Automatikdrucks.
 *
 * Kein DOM, kein Electron: Dieser Weg läuft so auch in der Web-Schale, der
 * `printToPDF` fehlt.
 */

import { nachrichtAlsVordruckPdf, nachrichtendateiname, nachrichtendruckAus } from "@s1/ausgaben";
import { projektion, type Nachrichtenzeile, type Zustand } from "@s1/domaene";

import type { VordruckBlatt } from "../kontrakt/index.js";

/** Der Unterordner von `ausgaben\` für die Vordrucke je Nachricht. */
export const ORDNER_NACHRICHTEN = "nachrichten";

/** Übung, wenn die Einsatzart es sagt — dann trägt der Vordruck das Wasserzeichen „ÜBUNG". */
export function istUebung(zustand: Zustand): boolean {
  return zustand.einsatz?.art.wert === "UEBUNG";
}

/** Die Zeile einer Nachricht; die Nachweisung ist die Sicht ohne Filter. */
export function nachrichtenzeile(zustand: Zustand, nachrichtId: string): Nachrichtenzeile | undefined {
  if (zustand.nachrichten?.[nachrichtId] === undefined) return undefined;
  return projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen.find((z) => z.id === nachrichtId);
}

/** Dateiname und Bytes des Vordrucks einer Zeile. */
export function vordruckDerZeile(zeile: Nachrichtenzeile, zustand: Zustand, blatt: VordruckBlatt): { dateiname: string; bytes: Uint8Array } {
  return {
    dateiname: nachrichtendateiname(zeile),
    bytes: nachrichtAlsVordruckPdf(nachrichtendruckAus(zeile, istUebung(zustand)), { blatt }),
  };
}

/** Wie {@link vordruckDerZeile}, aber nach Kennung; wirft mit einem Satz für den Bediener, wenn es sie nicht gibt. */
export function vordruckDerNachricht(
  zustand: Zustand,
  nachrichtId: string,
  blatt: VordruckBlatt,
  bezug?: projektion.Tagebuchbezug,
): { dateiname: string; bytes: Uint8Array } {
  const zeile = nachrichtenzeile(zustand, nachrichtId);
  if (zeile === undefined) throw new Error("Diese Nachricht gibt es in diesem Einsatz nicht.");
  // Additiv (ETB P1-2, P1-3): ETB-Nummer in Feld 20 und Stempel mit Grund.
  const mitBezug = bezug === undefined ? zeile : (projektion.mitTagebuchbezug([zeile], bezug)[0] ?? zeile);
  return vordruckDerZeile(mitBezug, zustand, blatt);
}
