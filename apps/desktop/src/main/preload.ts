/**
 * Preload — die einzige Bruecke zwischen Schale und Renderer.
 *
 * Laeuft mit `contextIsolation: true`, `nodeIntegration: false` und
 * `sandbox: true`. Was hier steht, ist alles, was der Renderer von der Schale
 * je sehen wird — und es ist mit Absicht wenig: **zwei Funktionen und zwei
 * Zeichenketten.**
 *
 * Keine Datei, kein Pfad, kein `require`, kein `ipcRenderer` selbst. Der
 * Renderer bekommt nicht den Kanal, sondern eine Funktion, die auf ihm ruft;
 * er kann damit keinen anderen Kanal ansprechen und keinen eigenen oeffnen.
 * Das ist der Unterschied zwischen einer Bruecke und einem Loch.
 *
 * Diese Datei wird als CommonJS gebaut (`out/preload.cjs`), weil Electron
 * Preload-Skripte in der Sandbox nur als CommonJS laedt.
 */

import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

// Nur die Kanalnamen, nicht der ganze Kontrakt: siehe `kanaele.ts`.
import { BRUECKE, KANAL_MITTEILUNG, KANAL_RUF } from "../kontrakt/kanaele.js";
import type { Antwort, Mitteilung, Ruf } from "../kontrakt/index.js";

const bruecke = {
  /** Plattform, auf der die Schale laeuft — reine Anzeigeinformation. */
  plattform: process.platform,
  /** Electron-Fassung, fuer die Diagnoseansicht ab V.3. */
  electron: process.versions.electron ?? "unbekannt",

  /** Stellt eine Anfrage und wartet auf ihre Antwort. */
  async ruf(anfrage: Ruf): Promise<Antwort<unknown>> {
    return (await ipcRenderer.invoke(KANAL_RUF, anfrage)) as Antwort<unknown>;
  },

  /**
   * Hoert auf die Mitteilungen der Worker; liefert das Abmelden zurueck.
   *
   * Das Abmelden ist nicht Bequemlichkeit: React haengt den Hoerer in einem
   * Effekt ein, und ohne Rueckgabe bliebe bei jedem erneuten Lauf ein weiterer
   * stehen. Nach einer Weile bekaeme der Store dieselbe Mitteilung mehrfach.
   */
  aufMitteilung(hoerer: (mitteilung: Mitteilung) => void): () => void {
    const bruecke = (_ereignis: IpcRendererEvent, mitteilung: Mitteilung): void => {
      hoerer(mitteilung);
    };
    ipcRenderer.on(KANAL_MITTEILUNG, bruecke);
    return () => {
      ipcRenderer.off(KANAL_MITTEILUNG, bruecke);
    };
  },
} as const;

export type S1Bruecke = typeof bruecke;

contextBridge.exposeInMainWorld(BRUECKE, bruecke);
