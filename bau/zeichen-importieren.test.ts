/**
 * Der Import der taktischen Zeichen (`bau/zeichen-importieren.mjs`).
 *
 * Geprüft wird der Lauf von außen: Quellordner hinein, Zielordner heraus. Was
 * dabei zählt, ist nicht die Form des Skripts, sondern seine Zusage — die
 * Schrift liegt **einmal** da und nicht in jeder Datei, die `viewBox` bleibt
 * unangetastet, und jedes Zeichen steht mit seinem ausgeschriebenen Titel im
 * Verzeichnis.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const WURZEL = path.resolve(import.meta.dirname, "..");
const SCHRIFT_BASE64 = Buffer.from("nicht wirklich eine Schrift").toString("base64");

function zeichen(titel: string, text: string): string {
  return [
    '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">',
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">',
    `\t<title>${titel}</title>`,
    "\t<defs>",
    '\t\t<style type="text/css">',
    "\t\t<![CDATA[",
    "    @font-face {",
    "        font-family: 'Roboto Slab';",
    `        src: url("data:application/font-woff;charset=utf-8;base64,${SCHRIFT_BASE64}");`,
    "    }",
    "]]>",
    "\t\t</style>",
    "\t</defs>",
    `\t<text x="128" y="150">${text}</text>`,
    "</svg>",
  ].join("\n");
}

let wegwerf: string;
let ziel: string;

beforeAll(() => {
  wegwerf = mkdtempSync(path.join(os.tmpdir(), "s1-zeichen-"));
  const quelle = path.join(wegwerf, "svg");
  ziel = path.join(wegwerf, "tz");
  mkdirSync(path.join(quelle, "Führungsstellen"), { recursive: true });
  writeFileSync(
    path.join(quelle, "Führungsstellen", "EAL.svg"),
    zeichen("Einsatzabschnittsleitung", "EAL"),
    "utf8",
  );
  writeFileSync(
    path.join(quelle, "Führungsstellen", "UEAL.svg"),
    zeichen("Untereinsatzabschnittsleitung", "UEAL"),
    "utf8",
  );
  // Ein Zeichen, das im Ziel schon liegt und oben nicht mehr vorkommt: Es muss
  // verschwinden, sonst wächst der Satz mit jeder Umbenennung.
  mkdirSync(path.join(ziel, "Führungsstellen"), { recursive: true });
  writeFileSync(path.join(ziel, "Führungsstellen", "Altes.svg"), "<svg/>", "utf8");

  execFileSync(
    process.execPath,
    [
      path.join(WURZEL, "bau", "zeichen-importieren.mjs"),
      "--quelle",
      quelle,
      "--ziel",
      ziel,
      "--commit",
      "abc1234",
      "--datum",
      "2026-09-11",
    ],
    { cwd: WURZEL },
  );
});

afterAll(() => {
  rmSync(wegwerf, { recursive: true, force: true });
});

describe("Der Zeichenimport", () => {
  it("legt die Schrift einmal ab und nimmt sie aus den Zeichen heraus", () => {
    const schrift = path.join(ziel, "schrift", "RobotoSlab-Bold.woff");
    expect(existsSync(schrift)).toBe(true);
    expect(readFileSync(schrift, "utf8")).toBe("nicht wirklich eine Schrift");

    const eal = readFileSync(path.join(ziel, "Führungsstellen", "EAL.svg"), "utf8");
    expect(eal).not.toContain("base64");
    expect(eal).not.toContain("<style");
    // Die Zeichenfläche ist die Norm und bleibt, wie sie ist.
    expect(eal).toContain('viewBox="0 0 256 256"');
    expect(eal).toContain("EAL");
  });

  it("führt jedes Zeichen mit Kategorie und ausgeschriebenem Titel", () => {
    const index = JSON.parse(readFileSync(path.join(ziel, "index.json"), "utf8")) as {
      commit: string;
      zeichen: { kennung: string; kategorie: string; titel: string; datei: string }[];
    };
    expect(index.commit).toBe("abc1234");
    expect(index.zeichen).toHaveLength(2);
    expect(index.zeichen[0]).toEqual({
      kennung: "Führungsstellen/EAL",
      kategorie: "Führungsstellen",
      name: "EAL",
      titel: "Einsatzabschnittsleitung",
      datei: "Führungsstellen/EAL.svg",
    });
  });

  it("räumt weg, was oben nicht mehr vorkommt", () => {
    expect(existsSync(path.join(ziel, "Führungsstellen", "Altes.svg"))).toBe(false);
  });

  it("schreibt die Herkunft mit Stand und Lizenzen auf", () => {
    const herkunft = readFileSync(path.join(ziel, "HERKUNFT.md"), "utf8");
    expect(herkunft).toContain("jonas-koeritz/Taktische-Zeichen");
    expect(herkunft).toContain("abc1234");
    expect(herkunft).toContain("CC0");
  });
});
