/**
 * Die Listenausgaben des Workers: Anforderungen, Tagebuch, Papier-Vordruck.
 *
 * Aus `aktendienst.ts` herausgehalten, damit die Datei nicht mit jeder Seite
 * wächst: Hier steht, welche Zeilen in die Seite kommen; wie sie aussieht,
 * steht in `@s1/ausgaben`.
 */

import {
  anforderungenAlsHtml,
  papierVordruckAlsHtml,
  tagebuchAlsHtml,
  type Ausgabekopf,
} from "@s1/ausgaben";
import { projektion, type EingehendesEreignis, type Zustand } from "@s1/domaene";

export type Listenausgabe = "anforderungen" | "tagebuch" | "papier";

export const LISTENAUSGABEN: ReadonlySet<string> = new Set<Listenausgabe>(["anforderungen", "tagebuch", "papier"]);

/** Das Tagebuch als HTML — auch für die Einsatzakte. */
export function tagebuchHtml(
  zustand: Zustand,
  ereignisse: readonly EingehendesEreignis[],
  kopf: Ausgabekopf,
): string {
  const ausschnitt = projektion.tagebuchausschnitt(zustand, ereignisse, {});
  return tagebuchAlsHtml(ausschnitt.zeilen, kopf);
}

/** Rendert eine der Listenausgaben; `marke` ist der Zeitstempel für den Dateinamen. */
export function listenausgabe(
  ausgabe: Listenausgabe,
  zustand: Zustand,
  ereignisse: readonly EingehendesEreignis[],
  kopf: Ausgabekopf,
  marke: string,
): { dateiname: string; html: string } {
  if (ausgabe === "papier") {
    return { dateiname: `papier-vordruck_${marke}`, html: papierVordruckAlsHtml(kopf) };
  }
  if (ausgabe === "tagebuch") {
    return { dateiname: `tagebuch_${marke}`, html: tagebuchHtml(zustand, ereignisse, kopf) };
  }
  const liste = projektion.anforderungsliste(zustand);
  return { dateiname: `anforderungen_${marke}`, html: anforderungenAlsHtml(liste.zeilen, liste.jeZustand, kopf) };
}
