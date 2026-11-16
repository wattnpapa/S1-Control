/**
 * Der Druckausgang der Desktop-Schale (KONZEPT-NACHRICHTEN.md Entscheidung 7,
 * Schnitt N3): Druckerliste, stiller Druck eines PDF, Ordnerdialog.
 *
 * **Ein PDF drucken.** Electron hat kein „drucke diese Datei"; es druckt
 * Webinhalte. Das PDF wird deshalb in ein unsichtbares Wegwerf-Fenster
 * geladen, wo Chromiums eingebauter PDF-Betrachter es zeichnet, und dieses
 * Fenster druckt `webContents.print({ silent: true, deviceName })`. Gemessen
 * mit Electron 43.6.0 unter Linux (xvfb): Ein so geladenes PDF kommt mit
 * allen Seiten in die Druckpipeline (`printToPDF` desselben Fensters enthält
 * den Text beider Seiten), auch als `data:`-Adresse und in mehreren
 * Fenstern nacheinander. Ein echter Drucker ließ sich dort nicht prüfen; der
 * Weg braucht den Nachweis am Windows-Arbeitsplatz (ADR-008, Folgen).
 * Darum wartet der Druck nach dem Laden kurz, bis der Betrachter das
 * Dokument gesetzt hat, und meldet jeden Fehlschlag mit dem Grund aus
 * Chromium, statt still zu verschlucken.
 *
 * Wie beim PDF-Weg (`drucker.ts`): kein Preload, keine Brücke, Sandbox —
 * dieses Fenster ist ein Ausdruck und kein Fenster der Anwendung.
 */

import { BrowserWindow, dialog } from "electron";

import type { Druckerangabe } from "../kontrakt/index.js";
import type { Druckausgang } from "./druckausgang.js";

/** Wie lange das PDF laden darf (wie `drucker.ts`). */
const LADEFRIST_MS = 10_000;
/** Der Betrachter setzt das Dokument nach dem Laden der Hülle; so lange wird gewartet. */
const SETZZEIT_MS = 1_000;
/** Wie lange Chromium für einen Druckauftrag bekommt, bevor er als gescheitert gilt. */
const DRUCKFRIST_MS = 60_000;

function wegwerfFenster(): BrowserWindow {
  return new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, plugins: true },
  });
}

function mitFrist<T>(versprechen: Promise<T>, ms: number, was: string): Promise<T> {
  let zeitgeber: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    versprechen,
    new Promise<never>((_, ablehnen) => {
      zeitgeber = setTimeout(() => ablehnen(new Error(`${was} dauerte länger als ${String(ms / 1000)} s.`)), ms);
    }),
  ]).finally(() => {
    if (zeitgeber !== undefined) clearTimeout(zeitgeber);
  });
}

function drucke(fenster: BrowserWindow, drucker: string): Promise<void> {
  return new Promise((fertig, scheitert) => {
    fenster.webContents.print({ silent: true, deviceName: drucker, printBackground: true }, (ok, grund) => {
      if (ok) fertig();
      else scheitert(new Error(grund === "" ? "Druckauftrag gescheitert" : grund));
    });
  });
}

async function druckePdf(bytes: Uint8Array, drucker: string): Promise<void> {
  const fenster = wegwerfFenster();
  try {
    const adresse = `data:application/pdf;base64,${Buffer.from(bytes).toString("base64")}`;
    await mitFrist(fenster.loadURL(adresse), LADEFRIST_MS, "Das Laden des Vordrucks");
    await new Promise((weiter) => setTimeout(weiter, SETZZEIT_MS));
    await mitFrist(drucke(fenster, drucker), DRUCKFRIST_MS, "Der Druck");
  } finally {
    if (!fenster.isDestroyed()) fenster.destroy();
  }
}

async function druckerliste(): Promise<readonly Druckerangabe[]> {
  // `getPrintersAsync` hängt an einem WebContents; ein leeres Wegwerf-Fenster
  // genügt und lässt das Arbeitsplatzfenster unberührt.
  const fenster = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true } });
  try {
    const liste = await fenster.webContents.getPrintersAsync();
    return liste.map((d) => ({ name: d.name, anzeigename: d.displayName === "" ? d.name : d.displayName }));
  } finally {
    if (!fenster.isDestroyed()) fenster.destroy();
  }
}

export function elektronDruckausgang(): Druckausgang {
  // Nacheinander: Zwei gleichzeitige Wegwerf-Fenster gewinnen nichts, und der
  // Drucker nimmt die Aufträge ohnehin der Reihe nach.
  let kette: Promise<unknown> = Promise.resolve();
  return {
    drucker: druckerliste,
    druckePdf(bytes, drucker) {
      const lauf = kette.then(() => druckePdf(bytes, drucker));
      kette = lauf.catch(() => undefined);
      return lauf;
    },
    async ordnerWaehlen(titel) {
      const eltern = BrowserWindow.getFocusedWindow();
      const optionen = { title: titel, properties: ["openDirectory", "createDirectory"] as ("openDirectory" | "createDirectory")[] };
      const wahl = eltern === null ? await dialog.showOpenDialog(optionen) : await dialog.showOpenDialog(eltern, optionen);
      return wahl.canceled ? undefined : wahl.filePaths[0];
    },
  };
}
