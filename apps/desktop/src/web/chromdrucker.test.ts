/**
 * Der PDF-Weg der Web-Schale (2026-11-22). Ein Stellvertreter-Programm
 * prüft Aufruf und Aufräumen; der Lauf gegen ein echtes Chromium steht unten
 * und läuft, wo eins installiert ist.
 */

import { chmodSync, existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { chromDrucker, chromiumArgumente, findeChromium, mitAusrichtung } from "./chromdrucker.js";

/** Ein Programm, das sich wie Chromium beim Drucken verhält: Es schreibt die Datei aus `--print-to-pdf=`. */
function stellvertreter(): string {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-chromium-"));
  const datei = path.join(ordner, "chromium");
  writeFileSync(
    datei,
    `#!/usr/bin/env node
const ziel = process.argv.find((a) => a.startsWith("--print-to-pdf="));
const eingabe = process.argv[process.argv.length - 1];
if (ziel === undefined || !eingabe.startsWith("file://")) process.exit(2);
require("node:fs").writeFileSync(ziel.slice("--print-to-pdf=".length), "%PDF-1.7 stellvertreter");
`,
  );
  chmodSync(datei, 0o755);
  return datei;
}

describe("Der PDF-Weg der Web-Schale", () => {
  it("ruft Chromium ohne Fenster mit eigenem Profil und Ausgabedatei auf", () => {
    const argumente = chromiumArgumente("/tmp/a/seite.html", "/tmp/a/seite.pdf", "/tmp/a/profil");
    expect(argumente).toContain("--headless");
    expect(argumente).toContain("--print-to-pdf=/tmp/a/seite.pdf");
    expect(argumente).toContain("--user-data-dir=/tmp/a/profil");
    expect(argumente.at(-1)).toBe("file:///tmp/a/seite.html");
  });

  it("setzt Querformat nur als Vorgabe vor die Regeln der Vorlage", () => {
    expect(mitAusrichtung("<html><head><title>x</title></head></html>", true)).toBe(
      "<html><head><style>@page { size: A4 landscape; }</style><title>x</title></head></html>",
    );
    expect(mitAusrichtung("<p>x</p>", false)).toBe("<p>x</p>");
  });

  it.runIf(process.platform !== "win32")("liefert die Bytes und räumt sein Arbeitsverzeichnis weg", async () => {
    const vorher = readdirSync(os.tmpdir()).filter((n) => n.startsWith("s1-pdf-")).length;
    const bytes = await chromDrucker(stellvertreter()).alsPdf("<p>Stärke</p>", false);
    expect(Buffer.from(bytes).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(readdirSync(os.tmpdir()).filter((n) => n.startsWith("s1-pdf-")).length).toBe(vorher);
  });

  it("findet Chromium über S1_CHROMIUM oder den PATH und sonst keins", async () => {
    const programm = stellvertreter();
    expect(await findeChromium({ S1_CHROMIUM: programm })).toBe(programm);
    expect(await findeChromium({ S1_CHROMIUM: "/gibt/es/nicht" })).toBeUndefined();
    expect(await findeChromium({ PATH: path.dirname(programm) })).toBe(programm);
    expect(await findeChromium({ PATH: "" })).toBeUndefined();
  });
});

// Mit S1_CHROMIUM lässt sich der Lauf auf ein bestimmtes Programm lenken.
const ECHT = [process.env["S1_CHROMIUM"], "/usr/bin/chromium"].find((p): p is string => p !== undefined && existsSync(p));

describe.runIf(ECHT !== undefined)("Der PDF-Weg gegen ein echtes Chromium", () => {
  it("macht aus einer Seite mit Umlauten ein PDF", async () => {
    const bytes = await chromDrucker(ECHT as string).alsPdf("<!doctype html><meta charset=utf-8><h1>Stärkemeldung Übung</h1>", true);
    expect(Buffer.from(bytes).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1000);
  }, 60_000);
});
