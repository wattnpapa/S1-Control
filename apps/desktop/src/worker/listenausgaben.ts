/**
 * Die Listenausgaben des Workers: Anforderungen, Tagebuch, Papier-Vordruck
 * und der Funkplan.
 *
 * Aus `aktendienst.ts` herausgehalten, damit die Datei nicht mit jeder Seite
 * wächst: Hier steht, welche Zeilen in die Seite kommen; wie sie aussieht,
 * steht in `@s1/ausgaben`.
 */

import {
  anforderungenAlsHtml,
  funkplanAlsHtml,
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

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() !== "" ? wert : undefined;
}

/**
 * Der Funkplan als Seite (KONZEPT-FUNKPLAN.md §7): derselbe Plan wie im Blatt,
 * ohne Suche. Der Kopf nennt die Führungsstelle und die übergeordnete aus den
 * Stammdaten des Einsatzes und wer ihn erstellt hat — der Ausdruck hängt am
 * Platz und wird mit Stift weitergeführt; die Frage „von wann, von wem“ muss
 * er selbst beantworten. Der Dateiname steht im Fuß, damit ein Blatt auf dem
 * Tisch zu seiner Datei findet. Der letzte Kontakt ist gegen `jetzt`
 * gerechnet, die Zeit der Ausgabe.
 */
export function funkplanausgabe(
  zustand: Zustand,
  kopf: Ausgabekopf & { readonly erstelltVon?: string },
  marke: string,
  jetzt: string,
): { dateiname: string; html: string } {
  const dateiname = `funkplan_${marke}`;
  const fuestName = text(zustand.einsatz?.fuestName.wert);
  const uebergeordneteFuestName = text(zustand.einsatz?.uebergeordneteFuestName?.wert);
  const funkkopf = {
    ...kopf,
    ...(fuestName === undefined ? {} : { fuestName }),
    ...(uebergeordneteFuestName === undefined ? {} : { uebergeordneteFuestName }),
  };
  return { dateiname, html: funkplanAlsHtml(projektion.funkplan(zustand, jetzt), funkkopf, dateiname) };
}
