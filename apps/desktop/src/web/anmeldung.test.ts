/**
 * Die Anmeldung vor dem Dienst — ueber einen echten Port, mit echtem `fetch`.
 *
 * Hinter der Anmeldung steht dieselbe Attrappe der Arbeitsplaetze wie in
 * `dienst.test.ts`; geprueft wird nur, was die Anmeldung entscheidet: wer
 * weiter darf, wie das Cookie aussieht, was die Bremse tut und was ins
 * Protokoll gelangt. Der offene Betrieb ist `dienst.test.ts` und bleibt dort
 * unveraendert gruen.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { Anmeldung, FEHLER_ZUGANG, SITZUNG_COOKIE, zurAnmeldung } from "./anmeldung.js";
import { Arbeitsplaetze } from "./arbeitsplaetze.js";
import { Bremse } from "./bremse.js";
import { COOKIE, Webdienst, cookieWert } from "./dienst.js";
import { Sitzungen } from "./sitzungen.js";
import { baueZugangspruefer } from "./zugangsdaten.js";

const NAME = "fuest";
const PASSWORT = "sehr-geheimes-passwort";

interface Werkstatt {
  readonly adresse: string;
  readonly protokoll: string[];
  readonly dienst: Webdienst;
}

const laufend: Webdienst[] = [];
const wegwerf: string[] = [];
afterEach(async () => {
  for (const dienst of laufend.splice(0)) await dienst.beende();
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function ordner(): string {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-web-anmeldung-"));
  wegwerf.push(wurzel);
  mkdirSync(path.join(wurzel, "renderer", "assets"), { recursive: true });
  writeFileSync(path.join(wurzel, "renderer", "index.html"), "<!doctype html><title>S1</title>");
  writeFileSync(path.join(wurzel, "renderer", "assets", "a.js"), "console.log(1)");
  return wurzel;
}

async function baue(
  wurzel: string,
  einstellung: { hinterProxy?: boolean; sicher?: boolean } = {},
): Promise<Werkstatt> {
  const protokoll: string[] = [];
  const protokolliere = (stufe: string, text: string): void => {
    protokoll.push(`${stufe}\t${text}`);
  };
  const sitzungen = new Sitzungen({ datei: path.join(wurzel, "sitzungen.json"), lebensdauerMs: 3_600_000 });
  await sitzungen.lade();
  const arbeitsplaetze = new Arbeitsplaetze({
    gnadenfristMs: 60_000,
    fabrik: (schluessel) => ({
      async beantworte(ruf) {
        return { ok: true, wert: { schluessel, art: ruf.art } };
      },
      async schliesse() {
        // nichts zu tun
      },
    }),
  });
  const dienst = new Webdienst({
    arbeitsplaetze,
    rendererOrdner: path.join(wurzel, "renderer"),
    protokolliere,
    zugang: new Anmeldung({
      pruefer: await baueZugangspruefer(NAME, PASSWORT),
      sitzungen,
      bremse: new Bremse(),
      hinterProxy: einstellung.hinterProxy ?? false,
      sicher: einstellung.sicher ?? false,
      programmversion: "2.4.0",
      protokolliere,
    }),
  });
  laufend.push(dienst);
  const { port } = await dienst.starte(0, "127.0.0.1");
  return { adresse: `http://127.0.0.1:${String(port)}`, protokoll, dienst };
}

function melde(
  w: Werkstatt,
  name: string,
  passwort: string,
  koepfe: Record<string, string> = {},
): Promise<Response> {
  return fetch(`${w.adresse}/anmeldung`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded", ...koepfe },
    body: new URLSearchParams({ anmeldename: name, passwort }).toString(),
  });
}

function sitzungskopf(antwort: Response): string {
  return antwort.headers.getSetCookie().find((k) => k.startsWith(`${SITZUNG_COOKIE}=`)) ?? "";
}

async function anmelden(w: Werkstatt, koepfe: Record<string, string> = {}): Promise<string> {
  const antwort = await melde(w, NAME, PASSWORT, koepfe);
  expect(antwort.status).toBe(303);
  const wert = cookieWert(sitzungskopf(antwort).split(";")[0], SITZUNG_COOKIE);
  if (wert === undefined) throw new Error("Kein Sitzungscookie.");
  return wert;
}

function ruf(w: Werkstatt, cookie?: string): Promise<Response> {
  return fetch(`${w.adresse}/ruf`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(cookie === undefined ? {} : { cookie }) },
    body: JSON.stringify({ art: "umgebung" }),
  });
}

describe("ohne Sitzung", () => {
  it("leitet Seiten auf die Anmeldung und vergibt keinen Arbeitsplatz", async () => {
    const w = await baue(ordner());
    const seite = await fetch(`${w.adresse}/`, { redirect: "manual" });
    expect(seite.status).toBe(303);
    expect(seite.headers.get("location")).toBe("anmeldung");
    expect(seite.headers.get("set-cookie")).toBeNull();
    const asset = await fetch(`${w.adresse}/assets/a.js`, { redirect: "manual" });
    expect(asset.headers.get("location")).toBe("../anmeldung");
  });

  it("antwortet bei Ruf und Strom mit 401 und JSON", async () => {
    const w = await baue(ordner());
    const antwort = await ruf(w);
    expect(antwort.status).toBe(401);
    expect(await antwort.json()).toEqual({ ok: false, meldung: "Nicht angemeldet." });
    const strom = await fetch(`${w.adresse}/mitteilungen`);
    expect(strom.status).toBe(401);
  });

  it("lässt die Gesundheitsprüfung durch", async () => {
    const w = await baue(ordner());
    expect(await (await fetch(`${w.adresse}/gesundheit`)).text()).toBe("ok");
  });

  it("liefert die Anmeldeseite ohne Skript, mit Feldern und Programmversion", async () => {
    const w = await baue(ordner());
    const antwort = await fetch(`${w.adresse}/anmeldung`);
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get("cache-control")).toBe("no-store");
    const html = await antwort.text();
    for (const text of ["Anmeldename", "Passwort", "Anmelden", "S1-Control 2.4.0", 'action="anmeldung"']) {
      expect(html).toContain(text);
    }
    expect(html).not.toContain("<script");
    // Regressionsschutz: Mit `no-referrer` schickt Chromium beim Formular
    // `Origin: null`, und die Herkunftspruefung wiese jede Anmeldung ab.
    expect(antwort.headers.get("referrer-policy")).not.toBe("no-referrer");
  });

  it("weist `Origin: null` ab, wie es ein Browser bei falscher Referrer-Policy schickt", async () => {
    const w = await baue(ordner());
    expect((await melde(w, NAME, PASSWORT, { origin: "null" })).status).toBe(403);
  });

  it("berechnet den relativen Weg zur Anmeldung", () => {
    expect(zurAnmeldung("/")).toBe("anmeldung");
    expect(zurAnmeldung("/index.html")).toBe("anmeldung");
    expect(zurAnmeldung("/a/b/c.js")).toBe("../../anmeldung");
  });
});

describe("Anmelden und Abmelden", () => {
  it("weist falsche Angaben ohne Unterscheidung ab", async () => {
    const w = await baue(ordner());
    for (const [name, passwort] of [[NAME, "falsch-falsch-falsch"], ["fremd", PASSWORT]] as const) {
      const antwort = await melde(w, name, passwort);
      expect(antwort.status).toBe(401);
      expect(await antwort.text()).toContain(FEHLER_ZUGANG);
      expect(sitzungskopf(antwort)).toBe("");
    }
  });

  it("legt bei Erfolg eine Sitzung an, und mit ihr geht alles wie offen", async () => {
    const w = await baue(ordner());
    const antwort = await melde(w, NAME, PASSWORT);
    expect(antwort.status).toBe(303);
    expect(antwort.headers.get("location")).toBe("./");
    const kopf = sitzungskopf(antwort);
    expect(kopf).toContain("HttpOnly");
    expect(kopf).toContain("SameSite=Strict");
    expect(kopf).toContain("Path=/");
    expect(kopf).not.toContain("Secure");

    const sitzung = `${SITZUNG_COOKIE}=${await anmelden(w)}`;
    const seite = await fetch(`${w.adresse}/`, { headers: { cookie: sitzung } });
    expect(seite.status).toBe(200);
    const platz = cookieWert(seite.headers.get("set-cookie")?.split(";")[0], COOKIE);
    expect(platz).toMatch(/^[A-Za-z0-9_-]{32}$/);

    const umgebung = await ruf(w, `${sitzung}; ${COOKIE}=${platz ?? ""}`);
    expect(await umgebung.json()).toEqual({
      ok: true,
      wert: { schluessel: platz, art: "umgebung", anmeldung: true },
    });
    const nochmal = await fetch(`${w.adresse}/anmeldung`, { headers: { cookie: sitzung }, redirect: "manual" });
    expect(nochmal.status).toBe(303);
    expect(nochmal.headers.get("location")).toBe("./");
  });

  it("beendet die Sitzung beim Abmelden", async () => {
    const w = await baue(ordner());
    const sitzung = `${SITZUNG_COOKIE}=${await anmelden(w)}`;
    const ab = await fetch(`${w.adresse}/abmeldung`, {
      method: "POST",
      headers: { cookie: sitzung },
      redirect: "manual",
    });
    expect(ab.status).toBe(303);
    expect(ab.headers.get("location")).toBe("anmeldung");
    expect(sitzungskopf(ab)).toContain("Max-Age=0");
    expect((await ruf(w, sitzung)).status).toBe(401);
  });

  it("prüft die Herkunft bei Anmelden und Abmelden", async () => {
    const w = await baue(ordner());
    expect((await melde(w, NAME, PASSWORT, { origin: "http://boese.example" })).status).toBe(403);
    expect((await melde(w, NAME, PASSWORT, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    const sitzung = `${SITZUNG_COOKIE}=${await anmelden(w)}`;
    const fremd = await fetch(`${w.adresse}/abmeldung`, {
      method: "POST",
      headers: { cookie: sitzung, origin: "http://boese.example" },
    });
    expect(fremd.status).toBe(403);
    expect((await ruf(w, sitzung)).status).toBe(200);
    expect((await fetch(`${w.adresse}/abmeldung`)).status).toBe(405);
  });

  it("verlangt ein Formular", async () => {
    const w = await baue(ordner());
    const antwort = await fetch(`${w.adresse}/anmeldung`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ anmeldename: NAME, passwort: PASSWORT }),
    });
    expect(antwort.status).toBe(415);
  });

  it("behält die Sitzung über einen Neustart des Dienstes", async () => {
    const wurzel = ordner();
    const erster = await baue(wurzel);
    const sitzung = `${SITZUNG_COOKIE}=${await anmelden(erster)}`;
    await erster.dienst.beende();
    laufend.splice(laufend.indexOf(erster.dienst), 1);
    const zweiter = await baue(wurzel);
    expect((await ruf(zweiter, sitzung)).status).toBe(200);
  });

  it("schreibt weder Passwort noch Cookie-Wert ins Protokoll", async () => {
    const w = await baue(ordner());
    await melde(w, NAME, "falsches-passwort-xyz");
    const wert = await anmelden(w);
    const text = w.protokoll.join("\n");
    expect(text).toContain("Anmeldung abgewiesen");
    expect(text).not.toContain("falsches-passwort-xyz");
    expect(text).not.toContain(PASSWORT);
    expect(text).not.toContain(wert);
  });
});

describe("Bremse", () => {
  it("sperrt nach fünf Fehlversuchen auch das richtige Passwort, mit Wartezeit", async () => {
    const w = await baue(ordner());
    for (let i = 0; i < 5; i += 1) expect((await melde(w, NAME, `falsch-${String(i)}-xxxxxxx`)).status).toBe(401);
    const gesperrt = await melde(w, NAME, PASSWORT);
    expect(gesperrt.status).toBe(429);
    expect(Number(gesperrt.headers.get("retry-after"))).toBeGreaterThan(14 * 60);
    expect(await gesperrt.text()).toContain("Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.");
    expect(sitzungskopf(gesperrt)).toBe("");
    expect(w.protokoll.filter((z) => z.includes("Anmeldung abgewiesen: Name „fuest“ von"))).toHaveLength(5);
  });

  it("ignoriert x-forwarded-for, wenn kein Proxy davor steht", async () => {
    const w = await baue(ordner());
    for (let i = 0; i < 5; i += 1) {
      await melde(w, NAME, "falsch-falsch-falsch", { "x-forwarded-for": `10.0.0.${String(i)}` });
    }
    expect((await melde(w, NAME, PASSWORT, { "x-forwarded-for": "10.0.0.99" })).status).toBe(429);
  });

  it("unterscheidet hinter dem Proxy die Absender nach x-forwarded-for", async () => {
    const w = await baue(ordner(), { hinterProxy: true });
    for (let i = 0; i < 5; i += 1) {
      await melde(w, NAME, "falsch-falsch-falsch", { "x-forwarded-for": "203.0.113.7, 10.0.0.1" });
    }
    expect((await melde(w, NAME, PASSWORT, { "x-forwarded-for": "203.0.113.7" })).status).toBe(429);
    expect((await melde(w, NAME, PASSWORT, { "x-forwarded-for": "198.51.100.2" })).status).toBe(303);
    expect(w.protokoll.join("\n")).toContain("von 203.0.113.7");
  });
});

describe("Secure", () => {
  it("setzt Secure hinter dem Proxy, wenn er HTTPS meldet", async () => {
    const w = await baue(ordner(), { hinterProxy: true });
    expect(sitzungskopf(await melde(w, NAME, PASSWORT, { "x-forwarded-proto": "https" }))).toContain("Secure");
    expect(sitzungskopf(await melde(w, NAME, PASSWORT, { "x-forwarded-proto": "http" }))).not.toContain("Secure");
  });

  it("traut x-forwarded-proto ohne Proxy nicht, setzt Secure aber, wenn es erzwungen ist", async () => {
    const offen = await baue(ordner());
    expect(sitzungskopf(await melde(offen, NAME, PASSWORT, { "x-forwarded-proto": "https" }))).not.toContain("Secure");
    const sicher = await baue(ordner(), { sicher: true });
    expect(sitzungskopf(await melde(sicher, NAME, PASSWORT))).toContain("Secure");
  });
});
