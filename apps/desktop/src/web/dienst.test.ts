/**
 * Der HTTP-Dienst gegen eine Attrappe der Arbeitsplaetze — ueber einen
 * echten Port, mit echtem `fetch`.
 *
 * Geprueft wird die Grenze zum Browser: das Cookie, die Herkunftspruefung,
 * die Kontraktpruefung, der Strom und der Renderer-Ordner. Was hinter der
 * Grenze geschieht, prueft `schale.test.ts`.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Arbeitsplaetze } from "./arbeitsplaetze.js";
import { COOKIE, Webdienst, cookieWert, gleicheHerkunft } from "./dienst.js";
import type { Mitteilung, Ruf } from "../kontrakt/index.js";

interface Werkstatt {
  readonly adresse: string;
  readonly rufe: Map<string, Ruf[]>;
  readonly sender: Map<string, (mitteilung: Mitteilung) => void>;
  readonly dienst: Webdienst;
  readonly wurzel: string;
}

let werkstatt: Werkstatt;

beforeEach(async () => {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-web-dienst-"));
  const renderer = path.join(wurzel, "renderer");
  mkdirSync(path.join(renderer, "assets"), { recursive: true });
  writeFileSync(path.join(renderer, "index.html"), "<!doctype html><title>S1</title>");
  writeFileSync(path.join(renderer, "assets", "a.js"), "console.log(1)");
  writeFileSync(path.join(wurzel, "geheim.txt"), "nicht ausliefern");

  const rufe = new Map<string, Ruf[]>();
  const sender = new Map<string, (mitteilung: Mitteilung) => void>();
  const arbeitsplaetze = new Arbeitsplaetze({
    gnadenfristMs: 60_000,
    fabrik: (schluessel, sende) => {
      rufe.set(schluessel, []);
      sender.set(schluessel, sende);
      return {
        async beantworte(ruf) {
          rufe.get(schluessel)?.push(ruf);
          return { ok: true, wert: { schluessel, art: ruf.art } };
        },
        async schliesse() {
          // nichts zu tun
        },
      };
    },
  });
  const dienst = new Webdienst({
    arbeitsplaetze,
    rendererOrdner: renderer,
    protokolliere: () => undefined,
    herzschlagMs: 50,
  });
  const { port } = await dienst.starte(0, "127.0.0.1");
  werkstatt = { adresse: `http://127.0.0.1:${String(port)}`, rufe, sender, dienst, wurzel };
});

afterEach(async () => {
  await werkstatt.dienst.beende();
  rmSync(werkstatt.wurzel, { recursive: true, force: true });
});

function keksAus(antwort: Response): string {
  const kopf = antwort.headers.get("set-cookie") ?? "";
  const wert = cookieWert(kopf.split(";")[0], COOKIE);
  if (wert === undefined) throw new Error(`Kein Cookie gesetzt: ${kopf}`);
  return wert;
}

async function rufe(ruf: unknown, keks?: string, koepfe: Record<string, string> = {}): Promise<Response> {
  return fetch(`${werkstatt.adresse}/ruf`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(keks === undefined ? {} : { cookie: `${COOKIE}=${keks}` }),
      ...koepfe,
    },
    body: JSON.stringify(ruf),
  });
}

describe("Renderer ausliefern", () => {
  it("liefert die Seite und setzt dabei den Arbeitsplatzschlüssel", async () => {
    const antwort = await fetch(`${werkstatt.adresse}/`);
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await antwort.text()).toContain("<title>S1</title>");
    const kopf = antwort.headers.get("set-cookie") ?? "";
    expect(kopf).toContain("HttpOnly");
    expect(kopf).toContain("SameSite=Strict");
    expect(keksAus(antwort)).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("setzt kein neues Cookie, wenn ein gültiges mitkommt", async () => {
    const keks = keksAus(await fetch(`${werkstatt.adresse}/`));
    const antwort = await fetch(`${werkstatt.adresse}/`, { headers: { cookie: `${COOKIE}=${keks}` } });
    expect(antwort.headers.get("set-cookie")).toBeNull();
  });

  it("liefert Assets mit Typ und langer Haltbarkeit", async () => {
    const antwort = await fetch(`${werkstatt.adresse}/assets/a.js`);
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect(antwort.headers.get("cache-control")).toContain("immutable");
  });

  it("liefert nichts außerhalb des Renderer-Ordners", async () => {
    // `%2e%2e` ist `..`, das `fetch` nicht selbst wegnormalisiert.
    const antwort = await fetch(`${werkstatt.adresse}/assets/%2e%2e/%2e%2e/geheim.txt`);
    expect(antwort.status).toBe(404);
    expect(await antwort.text()).not.toContain("nicht ausliefern");
  });

  it("antwortet auf HEAD ohne Körper", async () => {
    const antwort = await fetch(`${werkstatt.adresse}/`, { method: "HEAD" });
    expect(antwort.status).toBe(200);
    expect(await antwort.text()).toBe("");
  });

  it("meldet sich gesund", async () => {
    expect(await (await fetch(`${werkstatt.adresse}/gesundheit`)).text()).toBe("ok");
  });

  it("weist andere Methoden ab", async () => {
    const antwort = await fetch(`${werkstatt.adresse}/`, { method: "DELETE" });
    expect(antwort.status).toBe(405);
  });
});

describe("Rufe", () => {
  it("prüft gegen den Kontrakt und reicht an den Arbeitsplatz des Cookies durch", async () => {
    const keks = keksAus(await fetch(`${werkstatt.adresse}/`));
    const antwort = await rufe({ art: "umgebung" }, keks);
    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toEqual({ ok: true, wert: { schluessel: keks, art: "umgebung" } });
    expect(werkstatt.rufe.get(keks)?.map((r) => r.art)).toEqual(["umgebung"]);
  });

  it("vergibt beim ersten Ruf ohne Cookie einen Schlüssel", async () => {
    const antwort = await rufe({ art: "umgebung" });
    const keks = keksAus(antwort);
    expect(werkstatt.rufe.has(keks)).toBe(true);
  });

  it("beantwortet einen Ruf außerhalb des Kontrakts mit ok: false, nicht mit einem Fehler", async () => {
    const antwort = await rufe({ art: "gibtEsNicht" });
    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toEqual({ ok: false, meldung: "Die Anfrage entspricht nicht dem Kontrakt." });
    expect([...werkstatt.rufe.values()].flat()).toEqual([]);
  });

  it("weist Rufe aus fremder Herkunft ab", async () => {
    const keks = keksAus(await fetch(`${werkstatt.adresse}/`));
    const fremd = await rufe({ art: "umgebung" }, keks, { origin: "http://boese.example" });
    expect(fremd.status).toBe(403);
    const cross = await rufe({ art: "umgebung" }, keks, { "sec-fetch-site": "cross-site" });
    expect(cross.status).toBe(403);
    const eigen = await rufe({ art: "umgebung" }, keks, {
      origin: werkstatt.adresse,
      "sec-fetch-site": "same-origin",
    });
    expect(eigen.status).toBe(200);
  });

  it("verlangt JSON", async () => {
    const antwort = await fetch(`${werkstatt.adresse}/ruf`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "umgebung",
    });
    expect(antwort.status).toBe(415);
    const kaputt = await fetch(`${werkstatt.adresse}/ruf`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });
    expect(kaputt.status).toBe(400);
  });
});

describe("Mitteilungen", () => {
  /** Öffnet den Strom und liefert eine Funktion, die die nächste Mitteilung liefert. */
  function strom(keks: string): Promise<{ naechste(): Promise<Mitteilung>; schliesse(): void }> {
    return new Promise((aufloesen, ablehnen) => {
      const anfrage = http.get(
        `${werkstatt.adresse}/mitteilungen`,
        { headers: { cookie: `${COOKIE}=${keks}` } },
        (antwort) => {
          expect(antwort.statusCode).toBe(200);
          expect(antwort.headers["content-type"]).toBe("text/event-stream; charset=utf-8");
          let puffer = "";
          const wartend: ((m: Mitteilung) => void)[] = [];
          const fertige: Mitteilung[] = [];
          antwort.setEncoding("utf8");
          antwort.on("data", (teil: string) => {
            puffer += teil;
            let ende = puffer.indexOf("\n\n");
            while (ende >= 0) {
              const block = puffer.slice(0, ende);
              puffer = puffer.slice(ende + 2);
              const daten = block.split("\n").find((z) => z.startsWith("data: "));
              if (daten !== undefined) {
                const m = JSON.parse(daten.slice(6)) as Mitteilung;
                const hoerer = wartend.shift();
                if (hoerer === undefined) fertige.push(m);
                else hoerer(m);
              }
              ende = puffer.indexOf("\n\n");
            }
          });
          aufloesen({
            naechste: () =>
              new Promise((gib) => {
                const da = fertige.shift();
                if (da === undefined) wartend.push(gib);
                else gib(da);
              }),
            schliesse: () => anfrage.destroy(),
          });
        },
      );
      anfrage.on("error", ablehnen);
    });
  }

  it("schiebt die Mitteilungen des eigenen Arbeitsplatzes, nicht die eines fremden", async () => {
    const keksA = keksAus(await fetch(`${werkstatt.adresse}/`));
    const keksB = keksAus(await fetch(`${werkstatt.adresse}/`));
    const stromA = await strom(keksA);
    const stromB = await strom(keksB);
    // Die Fabrik ist erst nach dem ersten Kontakt gelaufen; der Strom ist einer.
    await new Promise((r) => setTimeout(r, 20));
    werkstatt.sender.get(keksA)?.({ art: "hinweis", stufe: "info", text: "für A" });
    werkstatt.sender.get(keksB)?.({ art: "hinweis", stufe: "warnung", text: "für B" });
    expect(await stromA.naechste()).toEqual({ art: "hinweis", stufe: "info", text: "für A" });
    expect(await stromB.naechste()).toEqual({ art: "hinweis", stufe: "warnung", text: "für B" });
    stromA.schliesse();
    stromB.schliesse();
  });

  it("weist den Strom aus fremder Herkunft ab", async () => {
    const antwort = await fetch(`${werkstatt.adresse}/mitteilungen`, {
      headers: { origin: "http://boese.example" },
    });
    expect(antwort.status).toBe(403);
  });
});

describe("Hilfen", () => {
  it("liest einen Cookie-Wert aus dem Kopf", () => {
    expect(cookieWert("a=1; s1-arbeitsplatz=xyz=; b=2", COOKIE)).toBe("xyz=");
    expect(cookieWert("a=1", COOKIE)).toBeUndefined();
    expect(cookieWert(undefined, COOKIE)).toBeUndefined();
  });

  it("erkennt die eigene Herkunft", () => {
    const anfrage = (koepfe: http.IncomingHttpHeaders): http.IncomingMessage =>
      ({ headers: { host: "fuest:8080", ...koepfe } }) as http.IncomingMessage;
    expect(gleicheHerkunft(anfrage({}))).toBe(true);
    expect(gleicheHerkunft(anfrage({ origin: "http://fuest:8080" }))).toBe(true);
    expect(gleicheHerkunft(anfrage({ origin: "http://fremd:8080" }))).toBe(false);
    expect(gleicheHerkunft(anfrage({ origin: "kein url" }))).toBe(false);
    expect(gleicheHerkunft(anfrage({ "sec-fetch-site": "none" }))).toBe(true);
    expect(gleicheHerkunft(anfrage({ "sec-fetch-site": "same-site" }))).toBe(false);
  });
});
