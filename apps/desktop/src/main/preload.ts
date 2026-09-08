/**
 * Preload — die einzige Bruecke zwischen Schale und Renderer.
 *
 * Laeuft mit `contextIsolation: true`, `nodeIntegration: false` und
 * `sandbox: true`. In der Sandbox stehen nur `electron` und wenige
 * Polyfills zur Verfuegung; alles Fachliche wandert ab M2 als
 * zod-geprueftes IPC durch diese Datei, niemals als roher Node-Zugriff.
 *
 * Diese Datei wird als CommonJS gebaut (`out/preload.cjs`), weil Electron
 * Preload-Skripte in der Sandbox nur als CommonJS laedt.
 */

import { contextBridge } from "electron";

/** Was der Renderer von der Schale sehen darf. Bewusst winzig. */
const bruecke = {
  /** Plattform, auf der die Schale laeuft — reine Anzeigeinformation. */
  plattform: process.platform,
  /** Electron-Fassung, fuer die Diagnoseansicht ab V.3. */
  electron: process.versions.electron ?? "unbekannt",
} as const;

export type S1Bruecke = typeof bruecke;

contextBridge.exposeInMainWorld("s1", bruecke);
