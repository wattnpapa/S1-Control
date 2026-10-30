/**
 * Welche Datei „Öffnen“ erreichen darf — die eine Regel vor Electron.
 */

import path from "node:path";

import { describe, expect, it } from "vitest";

import { ausgabePfad, zeigeAusgabe, type Schreibtisch } from "./ausgabezeiger.js";

const ORDNER = path.resolve("/share/einsaetze/2026-09-10_hochwasser");

describe("ausgabePfad", () => {
  it("lässt Ausgaben und die Einsatzakte im Einsatzordner zu", () => {
    for (const datei of ["ausgaben/druck_2026-09-10_1430.html", "ausgaben/status.pdf", "ausgaben/auswertung.xlsx", "akte.zip"]) {
      expect(ausgabePfad(ORDNER, path.join(ORDNER, datei), "oeffnen")).toBe(path.join(ORDNER, datei));
    }
  });

  it("weist einen Ausbruch mit „..“ ab, obwohl der Pfad mit dem Ordner beginnt", () => {
    expect(() => ausgabePfad(ORDNER, `${ORDNER}/ausgaben/../../fremd.html`, "oeffnen")).toThrow(/nicht zum geöffneten Einsatz/u);
    expect(() => ausgabePfad(ORDNER, `${ORDNER}-anders/druck.html`, "oeffnen")).toThrow(/nicht zum geöffneten Einsatz/u);
  });

  it("öffnet keine Programme, auch nicht im Einsatzordner", () => {
    expect(() => ausgabePfad(ORDNER, path.join(ORDNER, "ausgaben", "start.exe"), "oeffnen")).toThrow(/Endung „\.exe“/u);
    expect(() => ausgabePfad(ORDNER, path.join(ORDNER, "ausgaben", "ohne"), "ordner")).toThrow(/Endung/u);
  });

  it("druckt nur HTML", () => {
    expect(() => ausgabePfad(ORDNER, path.join(ORDNER, "ausgaben", "status.pdf"), "drucken")).toThrow(/nur für HTML/u);
  });
});

describe("zeigeAusgabe", () => {
  it("ruft genau die gewählte Handlung", async () => {
    const rufe: string[] = [];
    const schreibtisch: Schreibtisch = {
      oeffne: async (pfad) => void rufe.push(`oeffne ${pfad}`),
      zeigeImOrdner: (pfad) => void rufe.push(`ordner ${pfad}`),
      drucke: async (pfad) => void rufe.push(`drucke ${pfad}`),
    };
    const datei = path.join(ORDNER, "ausgaben", "druck.html");
    await zeigeAusgabe(schreibtisch, ORDNER, { pfad: datei, wie: "drucken" });
    expect(rufe).toEqual([`drucke ${datei}`]);
  });
});
