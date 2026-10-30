/**
 * Der {@link Schreibtisch} in Electron — so dünn wie möglich.
 *
 * Welche Datei geöffnet werden darf, hat `ausgabezeiger.ts` vorher
 * entschieden; hier steht nur noch der Griff nach Electron.
 *
 * **Drucken in einem eigenen, sichtbaren Fenster.** Wie beim PDF-Weg
 * (`drucker.ts`) nicht im Arbeitsplatzfenster — wer dort druckt, druckt die
 * Lage. Anders als dort ist das Fenster sichtbar: Der Druckdialog gehört zu
 * ihm, und der Bediener soll sehen, was er druckt. Es schließt sich, sobald
 * der Dialog zu ist. Ohne Preload und in der Sandbox: Die Seite ist eine
 * Ausgabe und soll die Schale nicht erreichen.
 */

import { BrowserWindow, shell } from "electron";

import type { Schreibtisch } from "./ausgabezeiger.js";

export function elektronSchreibtisch(): Schreibtisch {
  return {
    async oeffne(pfad) {
      // `openPath` wirft nicht, sondern liefert die Fehlermeldung als Text.
      const fehler = await shell.openPath(pfad);
      if (fehler !== "") throw new Error(`Die Datei ließ sich nicht öffnen: ${fehler}`);
    },
    zeigeImOrdner(pfad) {
      shell.showItemInFolder(pfad);
    },
    async drucke(pfad) {
      const fenster = new BrowserWindow({
        title: "Drucken",
        webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
      });
      try {
        await fenster.loadFile(pfad);
        await new Promise<void>((fertig, gescheitert) => {
          fenster.webContents.print({ silent: false, printBackground: true }, (erfolg, grund) => {
            // „cancelled“ ist kein Fehler: Der Bediener hat den Dialog geschlossen.
            if (erfolg || grund === "cancelled") fertig();
            else gescheitert(new Error(`Der Druck ist nicht zustande gekommen: ${grund}`));
          });
        });
      } finally {
        if (!fenster.isDestroyed()) fenster.destroy();
      }
    },
  };
}
