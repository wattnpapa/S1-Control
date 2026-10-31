import { describe, expect, it } from "vitest";

import { Bearbeitungssperren, SPERRE_MS } from "./bearbeitungssperren.js";

describe("Bearbeitungssperren", () => {
  it("setzt, verlängert und gibt frei", () => {
    const s = new Bearbeitungssperren();
    expect(s.setze("U1", 0)).toBe(true);
    expect(s.setze("U1", 10_000)).toBe(false);
    expect(s.aktive(SPERRE_MS + 5_000)).toEqual(["U1"]);
    expect(s.gib("U1")).toBe(true);
    expect(s.aktive(0)).toEqual([]);
  });

  it("lässt eine nicht verlängerte Sperre von selbst ablaufen (abgestürzter Browser)", () => {
    const s = new Bearbeitungssperren();
    s.setze("U1", 0);
    s.setze("F2", 1_000);
    expect(s.aktive(SPERRE_MS - 1)).toEqual(["F2", "U1"]);
    expect(s.aktive(SPERRE_MS + 500)).toEqual(["F2"]);
    expect(s.aktive(SPERRE_MS + 1_001)).toEqual([]);
  });

  it("begrenzt die Zahl der Sperren", () => {
    const s = new Bearbeitungssperren();
    for (let i = 0; i < 80; i += 1) s.setze(`U${String(i)}`, 0);
    expect(s.aktive(1)).toHaveLength(50);
  });
});
