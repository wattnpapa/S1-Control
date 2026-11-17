/**
 * Druck und Automatikdruck im Main (KONZEPT-NACHRICHTEN.md §7,
 * Entscheidungen 7 und 9; Schnitt N3).
 *
 * **Eine Naht wie `Drucker` und `Schreibtisch`.** Ein PDF an einen Drucker
 * geben, die Drucker des Rechners auflisten und einen Ordner per Dialog
 * wählen geht nur über Electron, und die Vermittlung kennt kein Electron.
 * Hier steht deshalb die Schnittstelle und alles, was ohne Electron zu
 * entscheiden ist: welches Ziel der Worker bekommt, wie der Probedruck läuft
 * und dass ein scheiternder Drucker sich einmal je Sitzung meldet. Die
 * Web-Schale hat keinen Druckausgang; dort gibt es nur das Verzeichnis.
 */

import path from "node:path";

import { leererNachrichtenvordruckPdf } from "@s1/ausgaben";
import type { Dateisystem } from "@s1/speicher";

import type { Automatikdruckziel, Druckerangabe, Einstellungen, Mitteilung, Probedruckergebnis } from "../kontrakt/index.js";
import type { Automatikdruckeinstellung } from "../worker/automatikdruck.js";
import { verzeichnisFehltText } from "./druckverzeichnis.js";

/** Was der Main zum Drucken braucht — im Betrieb Electron (`elektronDruckausgang.ts`), im Test eine Attrappe. */
export interface Druckausgang {
  /** Die Drucker des Rechners (`webContents.getPrintersAsync`). */
  drucker(): Promise<readonly Druckerangabe[]>;
  /** Gibt ein PDF ohne Dialog an den Drucker mit diesem Systemnamen. */
  druckePdf(bytes: Uint8Array, drucker: string): Promise<void>;
  /** Der Ordnerdialog; `undefined` bei Abbruch. */
  ordnerWaehlen(titel: string): Promise<string | undefined>;
}

/** Der Dateiname des leeren Vordrucks neben dem Papier-Vordruck (Entscheidung 9). */
export const LEERER_VORDRUCK_DATEI = "vordruck-nachricht-leer.pdf";

/**
 * Die Felder des Druckens aus den Einstellungen — mitgelesen und
 * zurückgegeben wie die übrigen Gerätefelder, sonst fielen sie beim nächsten
 * Start aus der Datei.
 */
export function druckfelder(e: Einstellungen): Partial<Einstellungen> {
  return {
    ...(e.vordruckBlatt === undefined ? {} : { vordruckBlatt: e.vordruckBlatt }),
    ...(e.vorschau === undefined ? {} : { vorschau: e.vorschau }),
    ...(e.automatikdruck === undefined ? {} : { automatikdruck: e.automatikdruck }),
    ...(e.automatikdruckAn === undefined ? {} : { automatikdruckAn: e.automatikdruckAn }),
  };
}

/** Ob ein Ziel benutzbar ist: ein Verzeichnis mit Pfad, ein Drucker mit Namen und einem Druckausgang. */
function zielTaugt(ziel: Automatikdruckziel, kannDrucken: boolean): boolean {
  if (ziel.ziel === "verzeichnis") return ziel.pfad.trim() !== "";
  return kannDrucken && ziel.name.trim() !== "";
}

/**
 * Was der Worker über den Automatikdruck erfährt (Entscheidung 7): nur mit
 * eingeschaltetem Schalter und einem benutzbaren Ziel, sonst nichts — „ohne
 * Ziel ist der automatische Druck aus".
 */
export function automatikdruckAus(e: Einstellungen, kannDrucken: boolean): Automatikdruckeinstellung | undefined {
  const ziel = e.automatikdruck;
  if (e.automatikdruckAn !== true || ziel === undefined || !zielTaugt(ziel, kannDrucken)) return undefined;
  const geputzt: Automatikdruckziel = ziel.ziel === "verzeichnis" ? { ziel: "verzeichnis", pfad: ziel.pfad.trim() } : { ziel: "drucker", name: ziel.name };
  return { ziel: geputzt, blatt: e.vordruckBlatt ?? "a5" };
}

export interface Probedruckumfeld {
  readonly dateisystem: Dateisystem;
  readonly druckausgang?: Druckausgang | undefined;
  /** Der Zeitstempel im Dateinamen, damit ein zweiter Probedruck den ersten nicht überschreibt. */
  readonly marke: string;
  /** Additiv (FM P2-11): ein fehlendes Verzeichnis anlegen — nur nach ausdrücklicher Rückfrage. */
  readonly anlegen?: boolean | undefined;
}

/**
 * Der Probedruck (Entscheidung 7): der leere Vordruck (A4 quer, zwei
 * Vordrucke) an das Ziel, das die Maske gerade zeigt — auch vor dem
 * Übernehmen, damit niemand ein falsches Ziel erst speichert, um es zu prüfen.
 */
export async function probedruck(ziel: Automatikdruckziel, u: Probedruckumfeld): Promise<Probedruckergebnis> {
  const bytes = leererNachrichtenvordruckPdf();
  if (ziel.ziel === "drucker") {
    if (u.druckausgang === undefined) throw new Error("Drucken geht nur in der Desktop-App. Im Browser ein Verzeichnis als Ziel wählen.");
    if (ziel.name.trim() === "") throw new Error("Es ist kein Drucker gewählt.");
    await u.druckausgang.druckePdf(bytes, ziel.name);
    return { art: "drucker", name: ziel.name };
  }
  const ordner = ziel.pfad.trim();
  if (ordner === "") throw new Error("Es ist kein Verzeichnis eingetragen.");
  const pfad = path.join(ordner, `probedruck-vordruck_${u.marke}.pdf`);
  // FM P2-11: Ein fehlendes Verzeichnis wird nicht still angelegt; der
  // Renderer fragt „anlegen?“ und ruft dann mit `anlegen: true` erneut.
  if (!(await u.dateisystem.existiert(ordner))) {
    if (u.anlegen !== true) return { art: "verzeichnisFehlt", pfad: ordner, meldung: verzeichnisFehltText(ordner), anlegen: true };
    await u.dateisystem.legeVerzeichnisAn(ordner);
  }
  await u.dateisystem.schreibeUeberOhneSync(pfad, bytes);
  return { art: "verzeichnis", pfad, bytes: bytes.length };
}

/** Ein Druckauftrag des Workers (Ziel Drucker). */
export interface Druckauftragsangabe {
  readonly akteId: string;
  readonly bytes: Uint8Array;
  readonly drucker: string;
  readonly dateiname: string;
}

/**
 * Nimmt die Druckaufträge der Worker an und gibt sie nacheinander an den
 * Drucker. Ein Fehler steht im Protokoll und einmal je Akte als Hinweis
 * „warnung" in den Fenstern — dieselbe Regel wie im Worker für das
 * Verzeichnis: Ein Drucker ohne Papier soll nicht jede Nachricht mit einer
 * Meldung beantworten.
 */
export function druckauftraegeAnnehmen(
  druckausgang: Druckausgang,
  sende: (mitteilung: Mitteilung) => void,
  protokolliere: (stufe: "info" | "warnung" | "fehler", text: string) => void,
): (auftrag: Druckauftragsangabe) => Promise<void> {
  const gemeldet = new Set<string>();
  let kette: Promise<void> = Promise.resolve();
  const einer = async (a: Druckauftragsangabe): Promise<void> => {
    try {
      await druckausgang.druckePdf(a.bytes, a.drucker);
      protokolliere("info", `Automatikdruck: ${a.dateiname} an ${a.drucker}`);
    } catch (fehler) {
      const grund = fehler instanceof Error ? fehler.message : String(fehler);
      protokolliere("warnung", `Automatikdruck: ${a.dateiname} an ${a.drucker} gescheitert: ${grund}`);
      if (gemeldet.has(a.akteId)) return;
      gemeldet.add(a.akteId);
      sende({
        art: "hinweis",
        akteId: a.akteId,
        stufe: "warnung",
        text: `Automatikdruck: Der Vordruck ließ sich nicht an den Drucker „${a.drucker}“ geben (${grund}). Die Nachricht steht im Blatt und lässt sich dort drucken; dieser Hinweis kommt einmal je Sitzung.`,
      });
    }
  };
  return (auftrag) => {
    kette = kette.then(() => einer(auftrag));
    return kette;
  };
}
