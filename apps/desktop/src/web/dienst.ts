/**
 * Der HTTP-Dienst der Web-Schale.
 *
 * Er ist fuer den Browser, was der Main-Prozess fuer das Electron-Fenster
 * ist: Er liefert den gebauten Renderer aus, er prueft jeden Ruf gegen den
 * Kontrakt, bevor er einen Arbeitsplatz erreicht, und er schiebt die
 * Mitteilungen der Worker in die Fenster — hier als Server-Sent Events, weil
 * die Richtung ohnehin nur eine ist und `EventSource` das Wiederverbinden
 * selbst erledigt. Ein WebSocket haette eine Abhaengigkeit gebracht, die der
 * Baum sonst nicht braucht, und einen zweiten Kanal, den niemand braucht.
 *
 * Drei Wege, mehr nicht:
 *
 *  * `POST /ruf`           — ein Ruf, eine Antwort (wie `ipcRenderer.invoke`).
 *  * `GET  /mitteilungen`  — der Strom der Mitteilungen (wie `webContents.send`).
 *  * `GET  /...`           — der Renderer aus `out/renderer`.
 *
 * **Was der Dienst nicht ist: eine Anmeldung.** Er laeuft im Netz der
 * Fuehrungsstelle, und wer ihn erreicht, arbeitet mit — so wie auf dem Share
 * jeder schreibt, der das Verzeichnis sieht (Entscheidung 9: keine Rollen und
 * Rechte). Was er trotzdem tut: Er nimmt Rufe nur aus derselben Herkunft an
 * (`Origin`, `Sec-Fetch-Site`), damit eine fremde Seite im selben Browser
 * nicht ueber das Cookie mitarbeitet, und er liefert keine Datei ausserhalb
 * des Renderer-Ordners.
 *
 * Kein synchroner Aufruf hier, aus demselben Grund wie im Main (DoD M2.1):
 * Der Dienst bedient alle Browser aus einem Thread.
 */

import { randomBytes } from "node:crypto";
import * as fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";

import { zRuf } from "../kontrakt/index.js";
import { SCHLUESSEL_FORM, type Arbeitsplaetze } from "./arbeitsplaetze.js";

export const COOKIE = "s1-arbeitsplatz";
/** Mehr als das ist kein Ruf, sondern ein Versehen. */
export const RUF_MAX_BYTES = 1_000_000;
/** Herzschlag auf dem Strom, damit ein Proxy die Verbindung nicht fuer tot haelt. */
export const HERZSCHLAG_MS = 25_000;

const INHALTSTYPEN: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export interface WebdienstOptionen {
  readonly arbeitsplaetze: Arbeitsplaetze;
  /** Der gebaute Renderer (`out/renderer`). */
  readonly rendererOrdner: string;
  readonly protokolliere: (stufe: "info" | "warnung" | "fehler", text: string) => void;
  readonly herzschlagMs?: number;
}

export class Webdienst {
  readonly #o: WebdienstOptionen;
  readonly #server: http.Server;

  constructor(optionen: WebdienstOptionen) {
    this.#o = optionen;
    this.#server = http.createServer((anfrage, antwort) => {
      void this.#bediene(anfrage, antwort).catch((fehler: unknown) => {
        this.#o.protokolliere("fehler", `${anfrage.method ?? "?"} ${anfrage.url ?? "?"}: ${(fehler as Error).message}`);
        if (!antwort.headersSent) antwort.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        antwort.end("Interner Fehler.");
      });
    });
  }

  /** Lauscht; Port 0 laesst das System waehlen — fuer die Tests. */
  async starte(port: number, host: string): Promise<{ readonly port: number; readonly host: string }> {
    await new Promise<void>((aufloesen, ablehnen) => {
      this.#server.once("error", ablehnen);
      this.#server.listen(port, host, () => {
        this.#server.off("error", ablehnen);
        aufloesen();
      });
    });
    const adresse = this.#server.address();
    if (adresse === null || typeof adresse === "string") throw new Error("Keine Adresse.");
    return { port: adresse.port, host: adresse.address };
  }

  /** Beendet den Dienst; offene Stroeme werden getrennt, nicht abgewartet. */
  async beende(): Promise<void> {
    this.#server.closeAllConnections();
    await new Promise<void>((aufloesen) => {
      this.#server.close(() => aufloesen());
    });
  }

  async #bediene(anfrage: http.IncomingMessage, antwort: http.ServerResponse): Promise<void> {
    const url = new URL(anfrage.url ?? "/", "http://platzhalter");
    const methode = anfrage.method ?? "GET";

    if (url.pathname === "/gesundheit") {
      antwort.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      antwort.end("ok");
      return;
    }
    if (url.pathname === "/ruf") {
      if (methode !== "POST") return nichtErlaubt(antwort, "POST");
      return this.#ruf(anfrage, antwort);
    }
    if (url.pathname === "/mitteilungen") {
      if (methode !== "GET") return nichtErlaubt(antwort, "GET");
      return this.#mitteilungen(anfrage, antwort);
    }
    if (methode !== "GET" && methode !== "HEAD") return nichtErlaubt(antwort, "GET, HEAD");
    return this.#datei(url.pathname, anfrage, antwort);
  }

  async #ruf(anfrage: http.IncomingMessage, antwort: http.ServerResponse): Promise<void> {
    if (!gleicheHerkunft(anfrage)) {
      antwort.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      antwort.end("Rufe werden nur aus derselben Herkunft angenommen.");
      return;
    }
    if (!(anfrage.headers["content-type"] ?? "").startsWith("application/json")) {
      antwort.writeHead(415, { "content-type": "text/plain; charset=utf-8" });
      antwort.end("Ein Ruf ist JSON.");
      return;
    }
    let roh: unknown;
    try {
      roh = JSON.parse(await liesKoerper(anfrage, RUF_MAX_BYTES));
    } catch (fehler) {
      antwort.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      antwort.end(`Der Ruf ist nicht lesbar: ${(fehler as Error).message}`);
      return;
    }
    const schluessel = this.#schluessel(anfrage, antwort);
    // Geprueft wird **hier**, an der Grenze zum Browser — wie im Main. Ein
    // unbekannter Ruf ist kein Absturz, sondern eine Antwort.
    const geprueft = zRuf.safeParse(roh);
    const ergebnis = geprueft.success
      ? await this.#o.arbeitsplaetze.beantworte(schluessel, geprueft.data)
      : { ok: false as const, meldung: "Die Anfrage entspricht nicht dem Kontrakt." };
    if (!geprueft.success) this.#o.protokolliere("warnung", `Ungültiger Ruf: ${geprueft.error.message}`);
    antwort.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    antwort.end(JSON.stringify(ergebnis));
  }

  async #mitteilungen(anfrage: http.IncomingMessage, antwort: http.ServerResponse): Promise<void> {
    if (!gleicheHerkunft(anfrage)) {
      antwort.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      antwort.end("Der Strom wird nur aus derselben Herkunft geliefert.");
      return;
    }
    const schluessel = this.#schluessel(anfrage, antwort);
    antwort.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
      // Ein Reverse-Proxy soll den Strom nicht puffern; nginx liest diesen Kopf.
      "x-accel-buffering": "no",
    });
    antwort.write("retry: 2000\n\n");

    const abmelden = this.#o.arbeitsplaetze.hoere(schluessel, (mitteilung) => {
      antwort.write(`event: mitteilung\ndata: ${JSON.stringify(mitteilung)}\n\n`);
    });
    const herzschlag = setInterval(() => {
      antwort.write(": takt\n\n");
    }, this.#o.herzschlagMs ?? HERZSCHLAG_MS);
    herzschlag.unref();

    // `close` auf der Antwort, nicht auf der Anfrage: Die Anfrage ist bei
    // einem GET ohne Koerper schon zu Ende, bevor der Strom beginnt.
    antwort.once("close", () => {
      clearInterval(herzschlag);
      abmelden();
    });
  }

  async #datei(pfadname: string, anfrage: http.IncomingMessage, antwort: http.ServerResponse): Promise<void> {
    const wurzel = path.resolve(this.#o.rendererOrdner);
    const gewuenscht = pfadname === "/" ? "/index.html" : decodeURIComponent(pfadname);
    const datei = path.resolve(wurzel, `.${gewuenscht}`);
    // Nichts ausserhalb des Renderer-Ordners, gleichgueltig wie der Pfad lautet.
    if (datei !== wurzel && !datei.startsWith(wurzel + path.sep)) return nichtGefunden(antwort);

    let inhalt: Buffer;
    try {
      inhalt = await fsp.readFile(datei);
    } catch {
      return nichtGefunden(antwort);
    }
    const endung = path.extname(datei);
    const koepfe: http.OutgoingHttpHeaders = {
      "content-type": INHALTSTYPEN[endung] ?? "application/octet-stream",
      "content-length": inhalt.length,
      // Die Seite selbst immer frisch, damit ein neuer Bau sofort ankommt;
      // die Assets tragen einen Hash im Namen und duerfen liegen bleiben.
      "cache-control": endung === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
    };
    if (endung === ".html") this.#schluessel(anfrage, antwort);
    antwort.writeHead(200, koepfe);
    antwort.end(anfrage.method === "HEAD" ? undefined : inhalt);
  }

  /**
   * Der Arbeitsplatzschluessel aus dem Cookie — oder ein neuer, der mit der
   * Antwort gesetzt wird.
   *
   * `HttpOnly`, damit kein Skript im Browser ihn lesen kann; `SameSite=Strict`,
   * damit eine fremde Seite ihn nicht mitschickt. Kein `Secure`: Der Dienst
   * laeuft im Netz der Fuehrungsstelle ueber http, und ein Cookie, das dort
   * nie gesetzt wuerde, waere kein Schutz, sondern ein Ausfall.
   */
  #schluessel(anfrage: http.IncomingMessage, antwort: http.ServerResponse): string {
    const vorhanden = cookieWert(anfrage.headers.cookie, COOKIE);
    if (vorhanden !== undefined && SCHLUESSEL_FORM.test(vorhanden)) return vorhanden;
    const neu = randomBytes(24).toString("base64url");
    antwort.setHeader(
      "set-cookie",
      `${COOKIE}=${neu}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${String(365 * 24 * 3600)}`,
    );
    return neu;
  }
}

function nichtErlaubt(antwort: http.ServerResponse, erlaubt: string): void {
  antwort.writeHead(405, { allow: erlaubt, "content-type": "text/plain; charset=utf-8" });
  antwort.end("Methode nicht erlaubt.");
}

function nichtGefunden(antwort: http.ServerResponse): void {
  antwort.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  antwort.end("Nicht gefunden.");
}

/** Liest einen Cookie-Wert aus dem Kopf; ohne Bibliothek, weil es ein Name ist. */
export function cookieWert(kopf: string | undefined, name: string): string | undefined {
  if (kopf === undefined) return undefined;
  for (const teil of kopf.split(";")) {
    const [k, ...rest] = teil.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

/**
 * Stammt die Anfrage von der eigenen Seite?
 *
 * Ein Browser schickt bei einem `fetch` von einer fremden Seite `Origin` (und
 * moderne Browser `Sec-Fetch-Site`); beide muessen dann zur eigenen Herkunft
 * passen. Fehlen beide, ist es kein Browser — `curl`, ein Test — und der
 * Cookie-Weg, gegen den die Pruefung schuetzt, spielt keine Rolle.
 */
export function gleicheHerkunft(anfrage: http.IncomingMessage): boolean {
  const seite = anfrage.headers["sec-fetch-site"];
  if (typeof seite === "string" && seite !== "same-origin" && seite !== "none") return false;
  const herkunft = anfrage.headers.origin;
  if (typeof herkunft !== "string") return true;
  try {
    return new URL(herkunft).host === anfrage.headers.host;
  } catch {
    return false;
  }
}

function liesKoerper(anfrage: http.IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((aufloesen, ablehnen) => {
    const teile: Buffer[] = [];
    let groesse = 0;
    anfrage.on("data", (teil: Buffer) => {
      groesse += teil.length;
      if (groesse > maxBytes) {
        ablehnen(new Error(`Der Ruf ist größer als ${String(maxBytes)} Bytes.`));
        anfrage.destroy();
        return;
      }
      teile.push(teil);
    });
    anfrage.on("end", () => aufloesen(Buffer.concat(teile).toString("utf8")));
    anfrage.on("error", ablehnen);
  });
}
