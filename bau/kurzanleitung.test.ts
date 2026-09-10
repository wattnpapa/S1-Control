/**
 * Die Kurzanleitung ist mit der Störfallmatrix im Gleichstand (M7.3).
 *
 * **Warum das ein Test ist und keine Bitte im Kommentar.** Die DoD von M7.3
 * verlangt, dass die sechs Fälle von der Ansicht **und** der Kurzanleitung
 * gelesen werden. Ein Erzeugungsskript allein sichert das nicht: Niemand ruft
 * es auf, wenn ein Satz in Ring 2 geändert wird. Dieser Test scheitert dann,
 * und die Meldung nennt den Weg zurück.
 *
 * Er vergleicht **erzeugt gegen eingecheckt** und nicht umgekehrt: Der
 * Quelltext ist die Wahrheit, die Datei das Erzeugnis.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { STOERFAELLE } from "@s1/domaene";
import { mitStoerfallmatrix, stoerfallmatrixMarkdown } from "@s1/ausgaben";

const DATEI = path.resolve(import.meta.dirname, "..", "docs", "v2", "KURZANLEITUNG.md");
const INHALT = readFileSync(DATEI, "utf8");

describe("Kurzanleitung", () => {
  it("trägt den Stand der Matrix aus Ring 2", () => {
    expect(mitStoerfallmatrix(INHALT), "npm run doku:kurzanleitung ausführen").toBe(INHALT);
  });

  it("nennt jeden der sechs Fälle mit seinem Titel", () => {
    for (const fall of STOERFAELLE) {
      expect(INHALT, fall.kennung).toContain(fall.titel);
    }
  });

  it("weist ein Dokument ohne Marken zurück, statt es unverändert zu lassen", () => {
    expect(() => mitStoerfallmatrix("# Ohne Marken\n")).toThrow(/Marken/u);
  });

  it("erzeugt einen Block, der mit genau einem Zeilenumbruch endet", () => {
    // Sonst wüchse die Datei bei jedem Erneuern um eine Leerzeile, und der
    // Gleichstandstest oben schlüge beim zweiten Lauf fehl.
    const block = stoerfallmatrixMarkdown();
    expect(block.endsWith("\n")).toBe(true);
    expect(block.endsWith("\n\n")).toBe(false);
  });
});
