/** R2-ETB P2-1: von Tagebuch und Nachweisung nur der jüngste Stand obenauf in der Akte. */

import { describe, expect, it } from "vitest";

import { mitFrueherenAusgaben } from "./fruehereausgaben.js";

describe("mitFrueherenAusgaben", () => {
  it("legt ältere Stände von Tagebuch, Nachweisung und Handzeichen unter fruehere/, alles andere bleibt", () => {
    const pfade = [
      "ausgaben/tagebuch_2026-11-17_2036.html",
      "ausgaben/tagebuch_2026-11-17_2040.html",
      "ausgaben/nachweisung_2026-11-17_2040.html",
      "ausgaben/nachweisung_2026-11-17_2036.html",
      "ausgaben/druck_2026-11-17_2036.html",
      "ausgaben/druck_2026-11-17_2040.html",
      "ausgaben/nachrichten/nachricht-E1-172019nov26.pdf",
      "ereignisse/a.jsonl",
    ];
    const ergebnis = mitFrueherenAusgaben(pfade.map((pfad) => ({ pfad, bytes: 1 }))).map((e) => e.pfad);
    expect(ergebnis).toEqual([
      "ausgaben/fruehere/tagebuch_2026-11-17_2036.html",
      "ausgaben/tagebuch_2026-11-17_2040.html",
      "ausgaben/nachweisung_2026-11-17_2040.html",
      "ausgaben/fruehere/nachweisung_2026-11-17_2036.html",
      "ausgaben/druck_2026-11-17_2036.html",
      "ausgaben/druck_2026-11-17_2040.html",
      "ausgaben/nachrichten/nachricht-E1-172019nov26.pdf",
      "ereignisse/a.jsonl",
    ]);
  });
});
