/**
 * Electron-Main von S1-Control v2 — Ring 4.
 *
 * Der Main-Prozess haelt bewusst keinen Fachzustand (02-ZIELBILD.md). In
 * diesem Arbeitspaket oeffnet er genau ein leeres Fenster; ab M2 kommen
 * IPC-Kontrakt und ein `worker_thread` je offener Akte dazu.
 *
 * Rauchprobe: Mit gesetzter Umgebungsvariable `S1_SMOKE=1` schliesst sich die
 * Anwendung selbst, sobald das Fenster sichtbar ist und der Renderer geladen
 * hat. Sie schreibt vorher eine Zeile mit dem tatsaechlichen Fensterzustand
 * nach stdout und beendet sich mit Exitcode 0. Damit ist ein Start ohne
 * Zuschauer nachweisbar.
 */

import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow } from "electron";

import { einsatzKennung } from "@s1/domaene";

const hierher = path.dirname(fileURLToPath(import.meta.url));
const rauchprobe = process.env["S1_SMOKE"] === "1";

/** Erzeugt das Arbeitsplatzfenster. */
function fensterOeffnen(): BrowserWindow {
  const fenster = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    title: "S1-Control",
    webPreferences: {
      preload: path.join(hierher, "preload.cjs"),
      // Die drei Schalter sind nicht verhandelbar: der Renderer bekommt
      // weder Node noch direkten Zugriff auf Electron.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  fenster.once("ready-to-show", () => {
    fenster.show();
  });

  void fenster.loadFile(path.join(hierher, "renderer", "index.html"));
  return fenster;
}

void app.whenReady().then(() => {
  const fenster = fensterOeffnen();

  if (rauchprobe) {
    fenster.webContents.once("did-finish-load", () => {
      void (async () => {
        // Erst sichtbar schalten, dann berichten: sonst meldet die Rauchprobe
        // einen Zustand, den das Fenster noch gar nicht hat.
        fenster.show();
        // Eine echte Fachfunktion aufrufen, damit die Rauchprobe auch die
        // Verdrahtung ueber alle Ringe belegt und nicht nur Electron selbst.
        const kennung = einsatzKennung("2026-09-08", "Rauchprobe");
        // Aus dem Renderer zuruecklesen. Das belegt mehr als „geladen": das
        // Modul-Skript ist unter der Content-Security-Policy tatsaechlich
        // gelaufen und hat den Wurzelknoten gefuellt.
        const text: unknown = await fenster.webContents.executeJavaScript(
          "document.getElementById('wurzel')?.textContent ?? ''",
        );
        process.stdout.write(
          [
            "S1_SMOKE: Fenster erzeugt",
            `S1_SMOKE: sichtbar=${String(fenster.isVisible())}`,
            `S1_SMOKE: titel=${fenster.getTitle()}`,
            `S1_SMOKE: groesse=${fenster.getBounds().width}x${fenster.getBounds().height}`,
            `S1_SMOKE: kennung=${kennung.ordner}`,
            `S1_SMOKE: renderer=${String(text)}`,
            "S1_SMOKE: beende Anwendung",
            "",
          ].join("\n"),
        );
        app.exit(0);
      })();
    });
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) fensterOeffnen();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
