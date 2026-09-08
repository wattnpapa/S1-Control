import { describe, expect, it } from "vitest";

import { einsatzKennung, slugFuerEinsatz } from "./index.js";

// Diese Datei laeuft in zwei Vitest-Projekten: „domaene-node" und
// „domaene-jsdom". Genau das ist der maschinelle Nachweis der
// Plattformneutralitaet aus 02-ZIELBILD.md — der Fachkern darf weder
// Node-Globals noch ein DOM voraussetzen.
describe("Einsatzkennung", () => {
  it("schreibt Umlaute aus und zieht Trennzeichen zusammen", () => {
    expect(slugFuerEinsatz("Hochwasser Süd — Übung 2026")).toBe("hochwasser-sued-uebung-2026");
  });

  it("bildet einen stabilen Ordnernamen mit Kurz-Id aus dem geteilten Kern", () => {
    const erste = einsatzKennung("2026-09-08", "Hochwasser Süd");
    const zweite = einsatzKennung("2026-09-08", "Hochwasser Süd");

    expect(erste).toEqual(zweite);
    expect(erste.ordner).toBe(`2026-09-08_hochwasser-sued_${erste.kurzId}`);
    expect(erste.kurzId).toMatch(/^[0-9a-f]{6}$/);
  });

  it("unterscheidet gleichnamige Einsaetze an unterschiedlichen Tagen", () => {
    const montag = einsatzKennung("2026-09-07", "Hochwasser Süd");
    const dienstag = einsatzKennung("2026-09-08", "Hochwasser Süd");

    expect(montag.kurzId).not.toBe(dienstag.kurzId);
  });
});
