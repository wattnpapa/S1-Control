/**
 * Der Datei-Weg gegen echte PDFs (`pruefdaten/eeb-pdf`, erzeugt mit pdfmake
 * wie in der Erfassungsbogen-App): Datei → Texte der Anhänge → Bögen.
 *
 * Die beiden Hälften liegen in verschiedenen Ringen — das Auspacken im
 * Renderer, die Deutung in Ring 2. Hier stehen sie hintereinander, weil erst
 * zusammen sichtbar wird, ob aus einer PDF der Bogen herauskommt, der
 * hineingelegt wurde.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { migriereBogen, type Erfassungsbogen } from "@bos/eeb-format";
import { describe, expect, it } from "vitest";

import { bogentexteAusPdf, istPdf } from "../../apps/desktop/src/renderer/pdfBogen.js";
import { boegenAusJsonTexten } from "../../packages/domaene/src/eeb/datei.js";

const WURZEL = path.resolve(import.meta.dirname, "..", "..", "pruefdaten");
const QUELLEN = ["001-albstadt-ztr-tz.json", "002-biberach-riss-fgr-o-b.json", "003-crailsheim-fgr-w-a.json"];

function pdf(name: string): Uint8Array {
  return new Uint8Array(readFileSync(path.join(WURZEL, "eeb-pdf", name)));
}

function quelle(name: string): Erfassungsbogen {
  return migriereBogen(JSON.parse(readFileSync(path.join(WURZEL, "eeb", "thw", name), "utf8")) as Erfassungsbogen);
}

describe("Erfassungsbögen aus PDFs der Erfassungsbogen-App", () => {
  it("liest den Bogen einer Einzel-PDF unverändert", async () => {
    const bytes = pdf("einzelbogen.pdf");
    expect(istPdf(bytes)).toBe(true);
    const boegen = boegenAusJsonTexten(await bogentexteAusPdf(bytes));
    expect(boegen).toEqual([quelle(QUELLEN[0] as string)]);
  });

  it("liest alle Bögen einer Sammel-PDF in der Reihenfolge der Datei", async () => {
    const boegen = boegenAusJsonTexten(await bogentexteAusPdf(pdf("sammelbogen.pdf")));
    expect(boegen).toEqual(QUELLEN.map(quelle));
  });
});
