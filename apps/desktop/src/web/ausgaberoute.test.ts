/**
 * Die Ausgaberoute: liefert Dateien aus `einsaetze/<einsatz>/ausgaben/` und
 * sonst nichts. Das Pfad-Traversal ist der Kern der Prüfung.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Arbeitsplaetze } from "./arbeitsplaetze.js";
import { loeseAusgabePfad, mitDruckknopf } from "./ausgaberoute.js";
import { Webdienst } from "./dienst.js";

let wurzel: string;
let share: string;
let html: string;
let dienst: Webdienst;
let adresse: string;

beforeEach(async () => {
  wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-ausgabe-"));
  share = path.join(wurzel, "share");
  const ausgaben = path.join(share, "einsaetze", "E1", "ausgaben");
  mkdirSync(ausgaben, { recursive: true });
  html = path.join(ausgaben, "einheitenliste.html");
  writeFileSync(html, "<!doctype html><html><head><title>x</title></head><body><p>Liste</p></body></html>");
  writeFileSync(path.join(ausgaben, "a.pdf"), "%PDF-1.4");
  writeFileSync(path.join(ausgaben, "b.txt"), "kein Ausgabetyp");
  writeFileSync(path.join(share, "einsaetze", "E1", "einsatz.json"), "{}");
  writeFileSync(path.join(wurzel, "geheim.html"), "<p>geheim</p>");
  symlinkSync(path.join(wurzel, "geheim.html"), path.join(ausgaben, "link.html"));
  mkdirSync(path.join(wurzel, "renderer"));

  dienst = new Webdienst({
    arbeitsplaetze: new Arbeitsplaetze({
      gnadenfristMs: 60_000,
      fabrik: () => ({ beantworte: async () => ({ ok: true, wert: null }), schliesse: async () => undefined }),
    }),
    rendererOrdner: path.join(wurzel, "renderer"),
    sharePfad: share,
    protokolliere: () => undefined,
  });
  const a = await dienst.starte(0, "127.0.0.1");
  adresse = `http://${a.host}:${String(a.port)}`;
});

afterEach(async () => {
  await dienst.beende();
  rmSync(wurzel, { recursive: true, force: true });
});

const hole = (pfad: string, zusatz = ""): Promise<Response> =>
  fetch(`${adresse}/ausgabe?pfad=${encodeURIComponent(pfad)}${zusatz}`);

describe("GET /ausgabe", () => {
  it("liefert HTML inline mit Drucken-Knopf und Ansichtsfenster", async () => {
    const antwort = await hole(html);
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(antwort.headers.get("content-disposition")).toMatch(/^inline/u);
    const text = await antwort.text();
    expect(text).toContain("window.print()");
    expect(text).toContain("width=device-width");
    expect(text).toContain("<p>Liste</p>");
  });

  it("liefert mit laden=1 die unveränderte Datei als Download", async () => {
    const antwort = await hole(html, "&laden=1");
    expect(antwort.headers.get("content-disposition")).toMatch(/^attachment/u);
    expect(await antwort.text()).not.toContain("window.print()");
  });

  it("liefert ein PDF mit dem passenden Typ", async () => {
    const antwort = await hole(path.join(path.dirname(html), "a.pdf"));
    expect(antwort.status).toBe(200);
    expect(antwort.headers.get("content-type")).toBe("application/pdf");
  });

  it.each([
    ["Traversal über ..", () => path.join(path.dirname(html), "..", "..", "..", "..", "geheim.html")],
    ["Datei außerhalb des Share", () => path.join(wurzel, "geheim.html")],
    ["Einsatzdatei statt Ausgabe", () => path.join(share, "einsaetze", "E1", "einsatz.json")],
    ["falsche Endung", () => path.join(path.dirname(html), "b.txt")],
    ["Symlink aus dem Share heraus", () => path.join(path.dirname(html), "link.html")],
    ["fehlende Datei", () => path.join(path.dirname(html), "nein.html")],
    ["leerer Pfad", () => ""],
    ["Verzeichnis", () => path.dirname(html)],
  ])("weist ab: %s", async (_name, pfad) => {
    expect((await hole(pfad())).status).toBe(404);
  });

  it("löst nur Pfade der Form einsaetze/<einsatz>/ausgaben/<datei> auf", async () => {
    expect(await loeseAusgabePfad(share, html)).toBe(html);
    expect(await loeseAusgabePfad(share, `${html}\0.pdf`)).toBeUndefined();
    expect(await loeseAusgabePfad(share, path.join(share, "einsaetze", "E1", "tief", "x", "a.html"))).toBeUndefined();
  });

  it("setzt den Knopf nur in die Bildschirmansicht", () => {
    expect(mitDruckknopf("<head></head><body class=x>t</body>")).toContain("@media print{.druckleiste{display:none}}");
  });
});
