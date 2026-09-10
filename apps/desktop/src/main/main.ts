/**
 * Electron-Main von S1-Control v2 — Ring 4.
 *
 * Der Main haelt keinen Fachzustand (02-ZIELBILD.md). Was er tut, ist in vier
 * Saetzen gesagt: Er oeffnet Fenster, er haelt den Single-Instance-Lock, er
 * prueft jeden Ruf des Renderers gegen den Kontrakt und reicht ihn an die
 * {@link Vermittlung} weiter, und er schiebt die Mitteilungen der Worker in
 * die Fenster. Faltung, Dateizugriff und Takt liegen im Worker.
 *
 * **Kein synchroner Datei- oder Netzaufruf** (DoD M2.1). Die Regel ist in
 * `eslint.config.mjs` erzwungen und nicht bloss notiert: `node:fs` ohne
 * `promises` ist hier verboten. Ein blockierender Aufruf im Main friert jedes
 * Fenster ein, auch das, das gerade nichts damit zu tun hat.
 *
 * Rauchprobe: Mit `S1_SMOKE=1` schliesst sich die Anwendung selbst, sobald das
 * Fenster geladen hat, und schreibt vorher eine Zeile mit dem tatsaechlichen
 * Fensterzustand nach stdout. Damit ist ein Start ohne Zuschauer nachweisbar.
 */

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, ipcMain, screen, type IpcMainInvokeEvent } from "electron";

import { knotenDateisystem } from "@s1/speicher";

import { Arbeiterhof } from "./arbeiterhof.js";
import { elektronDrucker } from "./drucker.js";
import { Protokoll } from "./protokoll.js";
import { Vermittlung, type Fenstersteuerung } from "./vermittlung.js";
import { knotenArbeiterFabrik } from "./knotenArbeiter.js";
import { KANAL_MITTEILUNG, KANAL_RUF, zRuf, type Bildschirm, type Mitteilung } from "../kontrakt/index.js";

const hierher = path.dirname(fileURLToPath(import.meta.url));
const rauchprobe = process.env["S1_SMOKE"] === "1";
/**
 * Die zweite Stufe der Rauchprobe: die Kernausgaben (M4.1).
 *
 * `S1_SMOKE=ausgaben` legt in einem Wegwerf-Share einen Einsatz an, erzeugt
 * Druck und Status als HTML **und** als PDF und schreibt heraus, was dabei
 * herausgekommen ist. Das ist der einzige Weg, `printToPDF` ohne Zuschauer
 * nachzuweisen: Ein Komponententest kann es nicht, weil es eine
 * Rendering-Engine braucht.
 */
const ausgabenprobe = process.env["S1_SMOKE"] === "ausgaben";

/**
 * §4.4: **Ein** Schreiber je Profil.
 *
 * Zwei Instanzen desselben Profils schrieben mit derselben `clientId` in
 * dasselbe Segment — genau die Lage, die §4.5 Fall 2 als „fremde Schreibspur"
 * erkennt und mit einem Kennungswechsel beantwortet. Sie zu vermeiden ist
 * billiger, als sie zu reparieren. Der zweite Start hebt stattdessen das
 * vorhandene Fenster.
 */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  starte();
}

function starte(): void {
  const protokoll = new Protokoll(path.join(app.getPath("logs"), "s1-control.log"));
  const fenster = new Set<BrowserWindow>();

  const hof = new Arbeiterhof({
    fabrik: knotenArbeiterFabrik(path.join(hierher, "akte-worker.mjs")),
    sende: (mitteilung: Mitteilung) => {
      for (const f of fenster) {
        if (!f.isDestroyed()) f.webContents.send(KANAL_MITTEILUNG, mitteilung);
      }
    },
  });

  // Der Staerke-Monitor ist ein **zweites** Fenster auf dieselbe Anwendung
  // (M3.5). Es bekommt dieselben Mitteilungen wie das Arbeitsplatzfenster —
  // der Arbeiterhof schickt an alle —, laedt aber dieselbe Seite mit dem
  // Fragment `#monitor` und zeigt dort die Monitoransicht. Ein eigener
  // Einstiegspunkt waere ein zweites Buendel fuer dieselben zwanzig Zeilen.
  let monitor: BrowserWindow | undefined;
  const fenstersteuerung: Fenstersteuerung = {
    bildschirme: () =>
      screen.getAllDisplays().map(
        (anzeige): Bildschirm => ({
          id: String(anzeige.id),
          name: anzeige.label === "" ? `Bildschirm ${String(anzeige.id)}` : anzeige.label,
          breite: anzeige.bounds.width,
          hoehe: anzeige.bounds.height,
          primaer: anzeige.id === screen.getPrimaryDisplay().id,
        }),
      ),
    monitorOeffnen: (bildschirmId?: string) => {
      if (monitor !== undefined && !monitor.isDestroyed()) {
        monitor.focus();
        return;
      }
      const anzeigen = screen.getAllDisplays();
      // Ohne Angabe der **zweite** Bildschirm, nicht der erste: Der Monitor
      // haengt an der Wand, der Arbeitsplatz steht auf dem Tisch. Gibt es nur
      // einen, oeffnet er dort — ein Fenster, das nirgends aufgeht, waere
      // schlechter als eines am falschen Platz.
      const ziel =
        anzeigen.find((anzeige) => String(anzeige.id) === bildschirmId) ??
        anzeigen.find((anzeige) => anzeige.id !== screen.getPrimaryDisplay().id) ??
        screen.getPrimaryDisplay();
      monitor = new BrowserWindow({
        x: ziel.bounds.x,
        y: ziel.bounds.y,
        width: ziel.bounds.width,
        height: ziel.bounds.height,
        fullscreen: anzeigen.length > 1,
        title: "S1-Control — Stärke",
        backgroundColor: "#000000",
        webPreferences: {
          preload: path.join(hierher, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      fenster.add(monitor);
      monitor.on("closed", () => {
        if (monitor !== undefined) fenster.delete(monitor);
        monitor = undefined;
      });
      void monitor.loadFile(path.join(hierher, "renderer", "index.html"), { hash: "monitor" });
    },
    monitorSchliessen: () => {
      if (monitor !== undefined && !monitor.isDestroyed()) monitor.close();
      monitor = undefined;
    },
  };

  const vermittlung = new Vermittlung({
    hof,
    fenstersteuerung,
    drucker: elektronDrucker(),
    dateisystem: knotenDateisystem(),
    einstellungsdatei: path.join(app.getPath("userData"), "einstellungen.json"),
    spiegelwurzel: path.join(app.getPath("userData"), "spiegel"),
    plattform: process.platform,
    electron: process.versions.electron ?? "unbekannt",
    programmversion: app.getVersion(),
    rechnername: os.hostname(),
    benutzer: os.userInfo().username,
    protokolliere: (stufe, text) => {
      protokoll.schreibe(stufe, text);
    },
  });

  ipcMain.handle(KANAL_RUF, async (_ereignis: IpcMainInvokeEvent, roh: unknown) => {
    // Geprueft wird **hier** und nicht im Worker: Der Main ist die Grenze zum
    // Renderer, und was sie passiert, soll dahinter nicht mehr in Frage
    // stehen. Ein unbekannter Ruf ist kein Absturz, sondern eine Antwort.
    const geprueft = zRuf.safeParse(roh);
    if (!geprueft.success) {
      protokoll.schreibe("warnung", `Ungültiger Ruf: ${geprueft.error.message}`);
      return { ok: false, meldung: "Die Anfrage entspricht nicht dem Kontrakt." };
    }
    return vermittlung.beantworte(geprueft.data);
  });

  app.on("second-instance", () => {
    const erstes = [...fenster][0];
    if (erstes === undefined) return;
    if (erstes.isMinimized()) erstes.restore();
    erstes.focus();
  });

  void app.whenReady().then(() => {
    protokoll.schreibe("info", `Start, Electron ${process.versions.electron ?? "?"}`);
    const erstes = fensterOeffnen(fenster);
    if (rauchprobe) rauchprobeFahren(erstes, vermittlung, fenstersteuerung, () => monitor);
    if (ausgabenprobe) ausgabenprobeFahren(erstes, vermittlung);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) fensterOeffnen(fenster);
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    // Die Worker schliessen ihre Akten geordnet: `upload-state.json` wird
    // fortgeschrieben, die Praesenzdatei bleibt mit ihrem letzten Stand
    // liegen (§6.4 — sie altert dann sichtbar, statt zu luegen).
    void hof.alleSchliessen();
    void protokoll.ruhe();
  });
}

/** Erzeugt das Arbeitsplatzfenster. */
function fensterOeffnen(fenster: Set<BrowserWindow>): BrowserWindow {
  const neu = new BrowserWindow({
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
  fenster.add(neu);
  neu.on("closed", () => fenster.delete(neu));
  neu.once("ready-to-show", () => {
    neu.show();
  });
  void neu.loadFile(path.join(hierher, "renderer", "index.html"));
  return neu;
}

/**
 * Die Rauchprobe — ein Start ohne Zuschauer, nachweisbar.
 *
 * Seit M3.5 prueft sie **zwei** Fenster. Der Staerke-Monitor ist der einzige
 * Teil von M3, der ohne echte Hardware sonst gar nicht laeuft: Ob ein zweites
 * `BrowserWindow` mit dem Fragment `#monitor` die Monitoransicht zeigt und
 * nicht den Arbeitsplatz, sagt kein Komponententest. Auf einem Rechner mit
 * einer Anzeige geht er auf dieser auf — das ist die dokumentierte Reaktion
 * und genau der Fall, den die Rauchprobe hier vorfindet.
 *
 * Was sie **nicht** ersetzt, ist der Nachweis auf einem echten
 * Zweitbildschirm; der bleibt offen wie M2.4.
 */
function rauchprobeFahren(
  fenster: BrowserWindow,
  vermittlung: Vermittlung,
  fenstersteuerung: Fenstersteuerung,
  monitorFenster: () => BrowserWindow | undefined,
): void {
  fenster.webContents.once("did-finish-load", () => {
    void (async () => {
      fenster.show();
      // Eine echte Fachfunktion ueber alle Ringe: Die Vermittlung liest die
      // Einstellungen, legt dabei die Client-Kennung an und beweist damit,
      // dass Ring 4 den Weg nach innen findet.
      const platz = await vermittlung.arbeitsplatz();
      const text: unknown = await fenster.webContents.executeJavaScript(
        "document.getElementById('wurzel')?.textContent ?? ''",
      );
      // Der Monitor: oeffnen, laden lassen, ansehen, schliessen.
      const bildschirme = fenstersteuerung.bildschirme();
      fenstersteuerung.monitorOeffnen();
      const monitor = monitorFenster();
      const monitortext =
        monitor === undefined
          ? "(kein Fenster)"
          : await new Promise<string>((fertig) => {
              monitor.webContents.once("did-finish-load", () => {
                void monitor.webContents
                  .executeJavaScript("document.getElementById('wurzel')?.textContent ?? ''")
                  .then((inhalt: unknown) => {
                    fertig(String(inhalt));
                  });
              });
            });

      process.stdout.write(
        [
          "S1_SMOKE: Fenster erzeugt",
          `S1_SMOKE: sichtbar=${String(fenster.isVisible())}`,
          `S1_SMOKE: titel=${fenster.getTitle()}`,
          `S1_SMOKE: groesse=${fenster.getBounds().width}x${fenster.getBounds().height}`,
          `S1_SMOKE: clientId=${platz.clientId.slice(0, 8)}…`,
          `S1_SMOKE: renderer=${String(text)}`,
          `S1_SMOKE: bildschirme=${String(bildschirme.length)}`,
          `S1_SMOKE: monitor=${monitor === undefined ? "nein" : monitor.getTitle()}`,
          `S1_SMOKE: monitorinhalt=${monitortext}`,
          "S1_SMOKE: beende Anwendung",
          "",
        ].join("\n"),
      );
      fenstersteuerung.monitorSchliessen();
      app.exit(0);
    })();
  });
}

/**
 * Erzeugt Druck und Status als HTML und als PDF und meldet das Ergebnis.
 *
 * Der Share liegt in einem Wegwerf-Verzeichnis, das der Aufrufer setzt
 * (`S1_SMOKE_SHARE`); ohne Angabe im Temp-Ordner. Der Einsatz ist leer bis
 * auf sein Anlegeereignis — geprueft wird hier der **Weg**, nicht die Zahlen;
 * die pruefen die Goldfiles gegen die Prueflage.
 */
function ausgabenprobeFahren(fenster: BrowserWindow, vermittlung: Vermittlung): void {
  fenster.webContents.once("did-finish-load", () => {
    void (async () => {
      const zeilen: string[] = [];
      try {
        const share = process.env["S1_SMOKE_SHARE"] ?? path.join(os.tmpdir(), `s1-ausgaben-${String(Date.now())}`);
        await vermittlung.beantworte({
          art: "einstellungenSetzen",
          einstellungen: { sharePfad: share, anzeigename: "Rauchprobe" },
        });
        const angelegt = await vermittlung.beantworte({
          art: "einsatzAnlegen",
          name: "Rauchprobe Ausgaben",
          datum: "2026-09-10",
          einsatzArt: "UEBUNG",
          fuestName: "FueSt Rauchprobe",
          beginn: new Date().toISOString(),
          schichtmodell: "ZWEI_SCHICHT",
        });
        if (!angelegt.ok) throw new Error(angelegt.meldung);
        const akteId = (angelegt.wert as { akteId: string }).akteId;
        zeilen.push(`S1_SMOKE: share=${share}`);

        for (const ausgabe of ["druck", "status"] as const) {
          for (const format of ["html", "pdf"] as const) {
            const antwort = await vermittlung.beantworte({
              art: "ausgabeErzeugen",
              akteId,
              ausgabe,
              format,
            });
            if (!antwort.ok) throw new Error(`${ausgabe}/${format}: ${antwort.meldung}`);
            const ergebnis = antwort.wert as { pfad: string; bytes: number };
            zeilen.push(
              `S1_SMOKE: ${ausgabe}.${format}=${path.basename(ergebnis.pfad)} bytes=${String(ergebnis.bytes)}`,
            );
          }
        }
        zeilen.push("S1_SMOKE: Ausgaben erzeugt");
      } catch (fehler) {
        zeilen.push(`S1_SMOKE: FEHLER ${(fehler as Error).message}`);
      }
      process.stdout.write(`${zeilen.join("\n")}\n`);
      app.exit(zeilen.some((zeile) => zeile.includes("FEHLER")) ? 1 : 0);
    })();
  });
}
