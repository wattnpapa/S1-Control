/**
 * Die Beilagen der Einsatzakte zu den Nachrichten (ETB P1-5, 2026-11-17).
 *
 * Die Akte nahm Vordruck-PDFs nur mit, wenn jemand sie vorher von Hand
 * erzeugt hatte, und Nachweisung und Tagebuch nur, wenn sie vorher
 * ausgegeben worden waren. Vor dem Packen legt der Worker deshalb:
 *
 *  * für jede nicht zurückgezogene Nachricht den Vordruck als PDF in
 *    `ausgaben\nachrichten` — nur, wenn die Datei des heutigen Standes
 *    fehlt; ein vorhandenes PDF bleibt, wie es gedruckt wurde. Das PDF
 *    zeichnet jsPDF im Worker, ohne Schale — es entsteht auch in der
 *    Web-Schale;
 *  * die Nachweisung als HTML. Das Tagebuch legt `aktendienst.ts` wie
 *    bisher bei. Ein PDF dieser Listen kann nur die Desktop-Schale
 *    (`printToPDF`); die Akte bleibt deshalb beim HTML, das jeder Browser
 *    liest.
 *
 * Scheitert eine Beilage, entsteht die Akte trotzdem: Die Ereignisse sind
 * der Nachweis, die Beilagen die lesbare Fassung. Die Zahl der Fehlschläge
 * kommt zurück, damit der Aufrufer sie melden kann.
 */

import path from "node:path";

import { nachrichtendateiname, type Ausgabekopf } from "@s1/ausgaben";
import { projektion, type EingehendesEreignis, type Zustand } from "@s1/domaene";
import type { Dateisystem } from "@s1/speicher";

import { nachweisungsausgabe } from "./listenausgaben.js";
import { ORDNER_NACHRICHTEN, vordruckDerZeile } from "./nachrichtenvordruck.js";

/** Wohin die Beilagen gehen: der Ordner `ausgaben` des Einsatzes auf dem Share. */
export interface Beilagenziel {
  readonly dateisystem: Dateisystem;
  readonly ausgabenordner: string;
}

export interface Beilagenergebnis {
  /** Vordrucke, die jetzt erzeugt wurden. */
  readonly erzeugt: number;
  /** Vordrucke, die schon lagen. */
  readonly vorhanden: number;
  /** Beilagen, die nicht geschrieben werden konnten. */
  readonly fehlgeschlagen: number;
}

/** Legt die fehlenden Vordruck-PDFs aller nicht zurückgezogenen Nachrichten ab. */
export async function legeFehlendeVordrucke(ziel: Beilagenziel, zustand: Zustand, bezug?: projektion.Tagebuchbezug): Promise<Beilagenergebnis> {
  const ordner = path.join(ziel.ausgabenordner, ORDNER_NACHRICHTEN);
  const alle = projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen.filter((z) => !z.zurueckgezogen);
  // Additiv (ETB P1-2): mit ETB-Nummer in Feld 20, wo der Aufrufer die Ereignisse hat.
  const zeilen = bezug === undefined ? alle : projektion.mitTagebuchbezug(alle, bezug);
  let erzeugt = 0;
  let vorhanden = 0;
  let fehlgeschlagen = 0;
  if (zeilen.length === 0) return { erzeugt, vorhanden, fehlgeschlagen };
  await ziel.dateisystem.legeVerzeichnisAn(ordner);
  // `existiert` fragt nach Verzeichnissen; die Dateien stehen in der Liste des Ordners.
  const liegen = new Set(await ziel.dateisystem.listeVerzeichnis(ordner));
  for (const zeile of zeilen) {
    const name = nachrichtendateiname(zeile);
    try {
      if (liegen.has(name)) {
        vorhanden += 1;
        continue;
      }
      await ziel.dateisystem.schreibeUeberOhneSync(path.join(ordner, name), vordruckDerZeile(zeile, zustand, "a5").bytes);
      erzeugt += 1;
    } catch {
      fehlgeschlagen += 1;
    }
  }
  return { erzeugt, vorhanden, fehlgeschlagen };
}

/** Legt die Nachweisung als HTML in `ausgaben`; `false`, wenn das Schreiben scheiterte. */
export async function legeNachweisungBei(
  ziel: Beilagenziel,
  zustand: Zustand,
  kopf: Ausgabekopf & { readonly erstelltVon: string },
  marke: string,
  ereignisse?: readonly EingehendesEreignis[],
): Promise<boolean> {
  if (zustand.nachrichten === undefined || Object.keys(zustand.nachrichten).length === 0) return true;
  try {
    const { dateiname, html } = nachweisungsausgabe(zustand, kopf, marke, { ereignisse });
    await ziel.dateisystem.legeVerzeichnisAn(ziel.ausgabenordner);
    await ziel.dateisystem.schreibeUeberOhneSync(path.join(ziel.ausgabenordner, `${dateiname}.html`), new TextEncoder().encode(html));
    return true;
  } catch {
    return false;
  }
}
