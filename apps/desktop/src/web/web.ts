/**
 * Einstieg der Web-Schale — `node out/web.mjs`.
 *
 * Die Web-Schale ist die zweite Schale um denselben Kern: Vermittlung,
 * Arbeiterhof und Worker sind dieselben Dateien wie im Electron-Main, nur
 * dass hier ein HTTP-Dienst die Fenster bedient statt `BrowserWindow`. Sie
 * ist fuer die Rechner gedacht, auf denen sich nichts installieren laesst,
 * und laeuft im Mischbetrieb neben den Desktop-Arbeitsplaetzen auf demselben
 * Share (ADR-005).
 *
 * Alles, was der Dienst wissen muss, kommt aus der Umgebung:
 *
 *   S1_SHARE               Wurzel des Shares (Pflicht) — im Container der Einhaengepunkt
 *   S1_DATEN               Profile, Spiegel und Protokoll der Arbeitsplaetze
 *   S1_WEB_HOST            Adresse zum Lauschen, Vorgabe 127.0.0.1
 *   S1_WEB_PORT            Port, Vorgabe 8080
 *   S1_WEB_GNADENFRIST_S   wie lange ein Arbeitsplatz ohne Browser offen bleibt
 *   S1_APP_VERSION         Programmversion fuer Praesenz und Statuszeile
 */

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { knotenArbeiterFabrik } from "../main/knotenArbeiter.js";
import { knotenNetzholer } from "../main/netzholer.js";
import { Protokoll } from "../main/protokoll.js";
import { Arbeitsplaetze } from "./arbeitsplaetze.js";
import { Webdienst } from "./dienst.js";
import { webSchalenfabrik } from "./schale.js";

const hierher = path.dirname(fileURLToPath(import.meta.url));

export interface Webumgebung {
  readonly sharePfad: string;
  readonly datenwurzel: string;
  readonly host: string;
  readonly port: number;
  readonly gnadenfristMs: number;
  readonly programmversion: string;
}

/** Liest die Umgebung; ein fehlender Share ist ein Fehler, kein Standardwert. */
export function liesWebumgebung(umgebung: NodeJS.ProcessEnv): Webumgebung {
  const sharePfad = umgebung["S1_SHARE"]?.trim() ?? "";
  if (sharePfad.length === 0) {
    throw new Error("S1_SHARE fehlt: der Pfad, unter dem der Share eingehängt ist.");
  }
  const port = Number.parseInt(umgebung["S1_WEB_PORT"] ?? "8080", 10);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`S1_WEB_PORT ist kein Port: ${umgebung["S1_WEB_PORT"] ?? ""}`);
  }
  const gnadenfristS = Number.parseInt(umgebung["S1_WEB_GNADENFRIST_S"] ?? "120", 10);
  return {
    sharePfad,
    datenwurzel: umgebung["S1_DATEN"]?.trim() || path.join(os.homedir(), ".s1-control-web"),
    host: umgebung["S1_WEB_HOST"]?.trim() || "127.0.0.1",
    port,
    gnadenfristMs: (Number.isInteger(gnadenfristS) && gnadenfristS >= 0 ? gnadenfristS : 120) * 1000,
    programmversion: umgebung["S1_APP_VERSION"]?.trim() || "0.0.0",
  };
}

async function starte(): Promise<void> {
  const u = liesWebumgebung(process.env);
  const protokoll = new Protokoll(path.join(u.datenwurzel, "s1-control-web.log"));
  const protokolliere = (stufe: "info" | "warnung" | "fehler", text: string): void => {
    protokoll.schreibe(stufe, text);
    process.stderr.write(`${stufe.toUpperCase()}\t${text}\n`);
  };

  const arbeitsplaetze = new Arbeitsplaetze({
    fabrik: webSchalenfabrik({
      sharePfad: u.sharePfad,
      datenwurzel: u.datenwurzel,
      arbeiterFabrik: knotenArbeiterFabrik(path.join(hierher, "akte-worker.mjs")),
      programmversion: u.programmversion,
      rechnername: os.hostname(),
      protokolliere,
      protokolldatei: protokoll.datei,
      letzteMeldungen: () => protokoll.letzteMeldungen,
      netz: knotenNetzholer(),
    }),
    gnadenfristMs: u.gnadenfristMs,
    protokolliere,
  });

  const dienst = new Webdienst({
    arbeitsplaetze,
    rendererOrdner: path.join(hierher, "renderer"),
    protokolliere,
  });
  const adresse = await dienst.starte(u.port, u.host);
  protokolliere(
    "info",
    `Web-Schale lauscht auf http://${adresse.host}:${String(adresse.port)} — Share ${u.sharePfad}, Daten ${u.datenwurzel}`,
  );

  let beendet = false;
  const beende = (signal: string): void => {
    if (beendet) return;
    beendet = true;
    protokolliere("info", `${signal}: Arbeitsplätze werden geschlossen`);
    void (async () => {
      // Erst die Arbeitsplaetze: `upload-state.json` fortschreiben, Praesenz
      // liegen lassen (§6.4). Dann den Dienst, dann das Protokoll.
      await arbeitsplaetze.alleSchliessen();
      await dienst.beende();
      await protokoll.ruhe();
      process.exit(0);
    })();
  };
  process.on("SIGTERM", () => beende("SIGTERM"));
  process.on("SIGINT", () => beende("SIGINT"));
}

// Nur als Programm starten, nicht beim Import — die Tests holen sich
// `liesWebumgebung`, ohne dass ein Dienst lauscht.
if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  starte().catch((fehler: unknown) => {
    process.stderr.write(`S1-Control Web-Schale: ${(fehler as Error).message}\n`);
    process.exit(1);
  });
}
