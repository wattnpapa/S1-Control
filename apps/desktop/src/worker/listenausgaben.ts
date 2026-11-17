/**
 * Die Listenausgaben des Workers: Anforderungen, Tagebuch, Papier-Vordruck,
 * der Funkplan und die Nachweisung.
 *
 * Aus `aktendienst.ts` herausgehalten, damit die Datei nicht mit jeder Seite
 * wächst: Hier steht, welche Zeilen in die Seite kommen; wie sie aussieht,
 * steht in `@s1/ausgaben`.
 */

import {
  anforderungenAlsHtml,
  funkplanAlsHtml,
  nachweisungAlsHtml,
  papierVordruckAlsHtml,
  tagebuchAlsHtml,
  type Ausgabekopf,
  type Tagebuchabschluss,
} from "@s1/ausgaben";
import { projektion, type EingehendesEreignis, type Zustand } from "@s1/domaene";

export type Listenausgabe = "anforderungen" | "tagebuch" | "papier";

export const LISTENAUSGABEN: ReadonlySet<string> = new Set<Listenausgabe>(["anforderungen", "tagebuch", "papier"]);

/**
 * Wie das gedruckte Tagebuch schließt (ETB P0-3): Ist der Einsatz beendet
 * oder archiviert, nennt die Schlusszeile Zeit und Akteur der jüngsten Zeile
 * „Einsatz beendet"; sonst gilt der Stand des Kopfes.
 */
export function tagebuchabschluss(zustand: Zustand, zeilen: readonly projektion.Tagebuchzeile[]): Tagebuchabschluss {
  const status = zustand.einsatz?.status;
  if (status !== "BEENDET" && status !== "ARCHIVIERT") return {};
  const ende = zeilen.find((z) => z.typ === "EinsatzBeendet");
  if (ende === undefined) return {};
  return { beendet: { zeit: ende.zeitpunkt ?? ende.wanduhr, akteur: ende.akteur } };
}

/** Das Tagebuch als HTML — auch für die Einsatzakte. */
export function tagebuchHtml(
  zustand: Zustand,
  ereignisse: readonly EingehendesEreignis[],
  kopf: Ausgabekopf,
): string {
  const ausschnitt = projektion.tagebuchausschnitt(zustand, ereignisse, {});
  return tagebuchAlsHtml(ausschnitt.zeilen, kopf, tagebuchabschluss(zustand, ausschnitt.zeilen));
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

/**
 * Die Nachweisung als Seite (KONZEPT-NACHRICHTEN.md §7, Schnitt N2): alle
 * Nachrichten nach Nummer, ohne Nummer zuletzt — dieselbe Ordnung wie die
 * Sicht im Blatt (`projektion.nachrichtenausschnitt`, Sicht „nachweisung").
 * Unten stehen Zeit und Akteur; der Name der Führungsstelle kommt aus den
 * Stammdaten, wie im Funkplan.
 */
export function nachweisungsausgabe(
  zustand: Zustand,
  kopf: Ausgabekopf & { readonly erstelltVon: string },
  marke: string,
): { dateiname: string; html: string } {
  const { erstelltVon, ...seitenkopf } = kopf;
  const zeilen = projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen;
  const fuestName = text(zustand.einsatz?.fuestName.wert) ?? "";
  return { dateiname: `nachweisung_${marke}`, html: nachweisungAlsHtml({ kopf: seitenkopf, fuestName, akteur: erstelltVon, zeilen }) };
}
