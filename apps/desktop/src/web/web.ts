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
 *
 * Fuer die Bereitstellung im Internet (ADR-006), sonst ohne Bedeutung:
 *
 *   S1_WEB_ZUGANG          `offen` (Vorgabe, Netz der Fuehrungsstelle) oder `anmeldung`
 *   S1_WEB_ANMELDENAME     der gemeinsame Anmeldename (Pflicht bei `anmeldung`)
 *   S1_WEB_PASSWORT        das gemeinsame Passwort, mind. 12 Zeichen (Pflicht bei `anmeldung`)
 *   S1_WEB_SITZUNG_H       Lebensdauer einer Sitzung ab letzter Nutzung, Vorgabe 12
 *   S1_WEB_HINTER_PROXY    `1`: Absender und HTTPS aus `x-forwarded-*` des Reverse-Proxys
 *   S1_WEB_SICHER          `1`: Sitzungscookie immer mit `Secure`
 */

import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { knotenArbeiterFabrik } from "../main/knotenArbeiter.js";
import { knotenNetzholer } from "../main/netzholer.js";
import { Protokoll } from "../main/protokoll.js";
import { Anmeldung } from "./anmeldung.js";
import { Arbeitsplaetze } from "./arbeitsplaetze.js";
import { Bremse } from "./bremse.js";
import { Webdienst } from "./dienst.js";
import { webSchalenfabrik } from "./schale.js";
import { Sitzungen } from "./sitzungen.js";
import { PASSWORT_MIN_LAENGE, baueZugangspruefer } from "./zugangsdaten.js";

const hierher = path.dirname(fileURLToPath(import.meta.url));

/** Offen wie im Netz der Fuehrungsstelle, oder hinter dem gemeinsamen Zugang. */
export type Zugang =
  | { readonly art: "offen" }
  | {
      readonly art: "anmeldung";
      readonly anmeldename: string;
      /** Nur bis zum Start: `starte` macht daraus sofort einen Hash. */
      readonly passwort: string;
      readonly sitzungMs: number;
    };

export interface Webumgebung {
  readonly sharePfad: string;
  readonly datenwurzel: string;
  readonly host: string;
  readonly port: number;
  readonly gnadenfristMs: number;
  readonly programmversion: string;
  readonly zugang: Zugang;
  readonly hinterProxy: boolean;
  readonly sicher: boolean;
}

/** Wie oft abgelaufene Sitzungen aus der Datei fallen. */
const AUFRAEUMEN_MS = 15 * 60_000;

/**
 * Liest den Zugang. Jede Unklarheit ist ein Startfehler: Ein Dienst, der
 * wegen eines Tippfehlers in `S1_WEB_ZUGANG` still offen im Internet stuende,
 * waere der schlimmste Ausgang.
 */
function liesZugang(umgebung: NodeJS.ProcessEnv): Zugang {
  const art = umgebung["S1_WEB_ZUGANG"]?.trim() || "offen";
  if (art === "offen") return { art };
  if (art !== "anmeldung") {
    throw new Error(`S1_WEB_ZUGANG ist „${art}“: erlaubt sind „offen“ und „anmeldung“.`);
  }
  const anmeldename = umgebung["S1_WEB_ANMELDENAME"]?.trim() ?? "";
  const passwort = umgebung["S1_WEB_PASSWORT"] ?? "";
  if (anmeldename.length === 0) throw new Error("S1_WEB_ANMELDENAME fehlt: der gemeinsame Anmeldename.");
  if (passwort.length === 0) throw new Error("S1_WEB_PASSWORT fehlt: das gemeinsame Passwort.");
  if (passwort.length < PASSWORT_MIN_LAENGE) {
    throw new Error(`S1_WEB_PASSWORT ist zu kurz: mindestens ${String(PASSWORT_MIN_LAENGE)} Zeichen.`);
  }
  const stunden = Number(umgebung["S1_WEB_SITZUNG_H"]?.trim() || "12");
  if (!Number.isFinite(stunden) || stunden <= 0) {
    throw new Error(`S1_WEB_SITZUNG_H ist keine Stundenzahl: ${umgebung["S1_WEB_SITZUNG_H"] ?? ""}`);
  }
  return { art, anmeldename, passwort, sitzungMs: stunden * 3_600_000 };
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
    zugang: liesZugang(umgebung),
    hinterProxy: umgebung["S1_WEB_HINTER_PROXY"]?.trim() === "1",
    sicher: umgebung["S1_WEB_SICHER"]?.trim() === "1",
  };
}

type Protokolliere = (stufe: "info" | "warnung" | "fehler", text: string) => void;

/**
 * Baut die Anmeldung, wenn sie verlangt ist, und meldet den Modus.
 */
async function baueAnmeldung(
  u: Webumgebung,
  protokolliere: Protokolliere,
): Promise<{ readonly zugang?: Anmeldung; readonly beende: () => void }> {
  if (u.zugang.art === "offen") {
    protokolliere("info", "Zugang offen: keine Anmeldung (Netz der Führungsstelle, ADR-005)");
    return { beende: () => undefined };
  }
  const sitzungen = new Sitzungen({
    datei: path.join(u.datenwurzel, "sitzungen.json"),
    lebensdauerMs: u.zugang.sitzungMs,
  });
  await sitzungen.lade();
  const takt = setInterval(() => {
    sitzungen.raeumeAuf().catch((fehler: unknown) => {
      protokolliere("warnung", `Sitzungen aufräumen: ${(fehler as Error).message}`);
    });
  }, AUFRAEUMEN_MS);
  takt.unref();
  const zugang = new Anmeldung({
    pruefer: await baueZugangspruefer(u.zugang.anmeldename, u.zugang.passwort),
    sitzungen,
    bremse: new Bremse(),
    hinterProxy: u.hinterProxy,
    sicher: u.sicher,
    programmversion: u.programmversion,
    protokolliere,
  });
  protokolliere("info", `Zugang mit Anmeldung (ADR-006): ${String(sitzungen.anzahl)} gültige Sitzungen`);
  if (!u.hinterProxy && !u.sicher) {
    protokolliere(
      "warnung",
      "Anmeldung ohne HTTPS-Kennzeichen: Passwort und Sitzung gehen unverschlüsselt über das Netz. Im Internet gehört ein Reverse-Proxy mit TLS davor (S1_WEB_HINTER_PROXY=1).",
    );
  }
  return { zugang, beende: () => clearInterval(takt) };
}

async function starte(): Promise<void> {
  const u = liesWebumgebung(process.env);
  // Das Passwort hat ausserhalb dieses Prozessteils nichts zu suchen: Die
  // Worker-Threads erben `process.env`, und sie brauchen es nicht.
  delete process.env["S1_WEB_PASSWORT"];
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

  const anmeldung = await baueAnmeldung(u, protokolliere);
  const dienst = new Webdienst({
    arbeitsplaetze,
    rendererOrdner: path.join(hierher, "renderer"),
    protokolliere,
    ...(anmeldung.zugang === undefined ? {} : { zugang: anmeldung.zugang }),
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
      anmeldung.beende();
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
