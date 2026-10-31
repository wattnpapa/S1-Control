/**
 * Die Offline-Schale: Service Worker und Fallback-Seite (P0-3).
 *
 * Der Worker läuft hier in einem `vm`-Kontext mit Attrappen für `self`,
 * `caches` und `fetch`. Geprüft wird sein Verhalten: Nur Seitenaufrufe
 * werden umgeleitet, nur bei Netz- oder Gateway-Fehler, und er legt nichts
 * außer der Offline-Seite ab.
 */

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Arbeitsplaetze } from "./arbeitsplaetze.js";
import { Webdienst } from "./dienst.js";

const ORDNER = path.resolve(import.meta.dirname, "../renderer/public");
const SW = readFileSync(path.join(ORDNER, "sw.js"), "utf8");
const OFFLINE = readFileSync(path.join(ORDNER, "offline.html"), "utf8");

type Handler = (ereignis: unknown) => void;

interface Welt {
  readonly handler: Map<string, Handler>;
  readonly abgelegt: Map<string, Response>;
  netz: (anfrage: unknown) => Promise<Response>;
  rufe: unknown[];
}

function lade(): Welt {
  const welt: Welt = {
    handler: new Map(),
    abgelegt: new Map(),
    rufe: [],
    netz: async () => new Response("<html>App</html>", { status: 200 }),
  };
  const kontext = {
    self: {
      addEventListener: (name: string, h: Handler) => welt.handler.set(name, h),
      skipWaiting: async () => undefined,
      clients: { claim: async () => undefined },
    },
    caches: {
      open: async () => ({
        put: async (schluessel: string, antwort: Response) => void welt.abgelegt.set(schluessel, antwort),
      }),
      match: async (schluessel: string) => welt.abgelegt.get(schluessel)?.clone(),
      keys: async () => ["s1-offline-v0", "s1-offline-v1"],
      delete: async (name: string) => void welt.rufe.push(["delete", name]),
    },
    fetch: (anfrage: unknown) => {
      welt.rufe.push(anfrage);
      return welt.netz(anfrage);
    },
    Request: class {
      constructor(
        readonly url: string,
        readonly init?: unknown,
      ) {}
    },
    Response,
    Promise,
  };
  vm.runInNewContext(SW, kontext);
  return welt;
}

/** Löst ein `fetch`-Ereignis aus und liefert die Antwort des Workers (oder `undefined`, wenn er ablehnt). */
async function navigiere(welt: Welt, modus: string): Promise<Response | undefined> {
  let antwort: Promise<Response> | undefined;
  welt.handler.get("fetch")?.({
    request: { mode: modus, url: "https://fuest.example/" },
    respondWith: (p: Promise<Response>) => {
      antwort = p;
    },
  });
  return antwort;
}

describe("sw.js", () => {
  it("legt bei der Installation nur die Offline-Seite ab", async () => {
    const welt = lade();
    welt.netz = async () => new Response(OFFLINE, { status: 200 });
    let fertig: Promise<unknown> | undefined;
    welt.handler.get("install")?.({
      waitUntil: (p: Promise<unknown>) => {
        fertig = p;
      },
    });
    await fertig;
    expect([...welt.abgelegt.keys()]).toEqual(["offline.html"]);
  });

  it("legt keine Weiterleitung (etwa auf die Anmeldung) als Offline-Seite ab", async () => {
    const welt = lade();
    const umgeleitet = new Response("Anmeldung", { status: 200 });
    Object.defineProperty(umgeleitet, "redirected", { value: true });
    welt.netz = async () => umgeleitet;
    let fertig: Promise<unknown> | undefined;
    welt.handler.get("install")?.({
      waitUntil: (p: Promise<unknown>) => {
        fertig = p;
      },
    });
    await expect(fertig).rejects.toThrow();
    expect(welt.abgelegt.size).toBe(0);
  });

  it("räumt alte Stände beim Aktivieren auf", async () => {
    const welt = lade();
    let fertig: Promise<unknown> | undefined;
    welt.handler.get("activate")?.({
      waitUntil: (p: Promise<unknown>) => {
        fertig = p;
      },
    });
    await fertig;
    expect(welt.rufe).toEqual([["delete", "s1-offline-v0"]]);
  });

  it("lässt alles außer dem Laden der Seite unberührt", async () => {
    const welt = lade();
    expect(await navigiere(welt, "cors")).toBeUndefined();
    expect(await navigiere(welt, "same-origin")).toBeUndefined();
  });

  it("reicht die Seite durch, solange der Dienst antwortet", async () => {
    const welt = lade();
    const antwort = await navigiere(welt, "navigate");
    expect(await antwort?.text()).toBe("<html>App</html>");
  });

  it("zeigt ohne Netz die Offline-Seite statt einer weißen Seite", async () => {
    const welt = lade();
    welt.abgelegt.set("offline.html", new Response(OFFLINE));
    welt.netz = async () => {
      throw new TypeError("Failed to fetch");
    };
    const antwort = await navigiere(welt, "navigate");
    expect(await antwort?.text()).toContain("Dienst nicht erreichbar");
  });

  it("zeigt die Offline-Seite auch bei 502/503/504 des Proxys, nicht aber bei 404", async () => {
    const welt = lade();
    welt.abgelegt.set("offline.html", new Response(OFFLINE));
    welt.netz = async () => new Response("Bad Gateway", { status: 502 });
    expect(await (await navigiere(welt, "navigate"))?.text()).toContain("Dienst nicht erreichbar");
    welt.netz = async () => new Response("nix", { status: 404 });
    expect((await navigiere(welt, "navigate"))?.status).toBe(404);
  });

  it("hat eine eingebaute Notseite, falls die Offline-Seite fehlt", async () => {
    const welt = lade();
    welt.netz = async () => {
      throw new TypeError("x");
    };
    const antwort = await navigiere(welt, "navigate");
    expect(await antwort?.text()).toContain("es wird neu verbunden");
  });
});

describe("offline.html", () => {
  it("sagt auf Deutsch, was los ist, und verbindet selbst neu", () => {
    expect(OFFLINE).toContain('lang="de"');
    expect(OFFLINE).toContain("Dienst nicht erreichbar");
    expect(OFFLINE).toContain("Es wird neu verbunden");
    expect(OFFLINE).toContain('fetch("gesundheit"');
    expect(OFFLINE).toContain("location.reload()");
    expect(OFFLINE).not.toMatch(/src="http|href="http/);
  });

  it("nennt die Sperre der Eingabe und bietet den Papier-Vordruck zum Drucken an", () => {
    expect(OFFLINE).toContain("Eingabe gesperrt");
    expect(OFFLINE).not.toContain("Weiterarbeiten");
    for (const titel of ["Meldeblock", "Einheitenliste", "Funkprotokoll"]) {
      expect(OFFLINE).toContain(`Papier-Vordruck: ${titel}`);
    }
    expect(OFFLINE).toContain("window.print()");
    expect(OFFLINE).toContain("size: A4 portrait");
  });
});

describe("Auslieferung durch den Dienst", () => {
  let wurzel: string;
  let dienst: Webdienst;
  let adresse: string;

  beforeEach(async () => {
    wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-offline-"));
    mkdirSync(path.join(wurzel, "r"));
    writeFileSync(path.join(wurzel, "r", "sw.js"), SW);
    writeFileSync(path.join(wurzel, "r", "offline.html"), OFFLINE);
    dienst = new Webdienst({
      arbeitsplaetze: new Arbeitsplaetze({
        gnadenfristMs: 1000,
        fabrik: () => ({ beantworte: async () => ({ ok: true, wert: null }), schliesse: async () => undefined }),
      }),
      rendererOrdner: path.join(wurzel, "r"),
      protokolliere: () => undefined,
    });
    const { port } = await dienst.starte(0, "127.0.0.1");
    adresse = `http://127.0.0.1:${String(port)}`;
  });

  afterEach(async () => {
    await dienst.beende();
    rmSync(wurzel, { recursive: true, force: true });
  });

  it("liefert Worker und Offline-Seite frisch und mit dem richtigen Typ", async () => {
    const sw = await fetch(`${adresse}/sw.js`);
    expect(sw.headers.get("content-type")).toContain("text/javascript");
    expect(sw.headers.get("cache-control")).toBe("no-cache");
    const seite = await fetch(`${adresse}/offline.html`);
    expect(seite.headers.get("content-type")).toContain("text/html");
    expect(seite.headers.get("cache-control")).toBe("no-cache");
  });

  it("antwortet auf /gesundheit, worauf sich der Neuversuch der Offline-Seite stützt", async () => {
    expect(await (await fetch(`${adresse}/gesundheit`)).text()).toBe("ok");
  });
});
