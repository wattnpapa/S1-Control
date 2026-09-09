import { describe, expect, it } from "vitest";

import { Zufall } from "./zufall.js";

describe("Zufall — die gesetzte Quelle aus der DoD von M0.4", () => {
  it("liefert aus demselben Startwert dieselbe Folge", () => {
    const a = new Zufall(4711);
    const b = new Zufall(4711);
    const links = Array.from({ length: 50 }, () => a.naechste());
    const rechts = Array.from({ length: 50 }, () => b.naechste());
    expect(links).toEqual(rechts);
  });

  it("liefert aus verschiedenen Startwerten verschiedene Folgen", () => {
    const a = Array.from({ length: 20 }, ((z) => () => z.naechste())(new Zufall(1)));
    const b = Array.from({ length: 20 }, ((z) => () => z.naechste())(new Zufall(2)));
    expect(a).not.toEqual(b);
  });

  it("bleibt mit `bis` innerhalb der Grenze und erreicht beide Enden", () => {
    const zufall = new Zufall(9);
    const werte = new Set<number>();
    for (let i = 0; i < 2000; i += 1) {
      const wert = zufall.bis(4);
      expect(wert).toBeGreaterThanOrEqual(0);
      expect(wert).toBeLessThan(4);
      werte.add(wert);
    }
    expect([...werte].sort()).toEqual([0, 1, 2, 3]);
  });

  it("schließt bei `zwischen` beide Enden ein", () => {
    const zufall = new Zufall(3);
    const werte = new Set<number>();
    for (let i = 0; i < 500; i += 1) werte.add(zufall.zwischen(5, 7));
    expect([...werte].sort()).toEqual([5, 6, 7]);
  });

  it("behandelt die Randwahrscheinlichkeiten ohne Ziehung", () => {
    const zufall = new Zufall(1);
    expect(zufall.trifft(0)).toBe(false);
    expect(zufall.trifft(1)).toBe(true);
  });

  it("trifft ungefähr so oft, wie die Wahrscheinlichkeit sagt", () => {
    const zufall = new Zufall(77);
    let treffer = 0;
    for (let i = 0; i < 10_000; i += 1) if (zufall.trifft(0.25)) treffer += 1;
    expect(treffer).toBeGreaterThan(2_200);
    expect(treffer).toBeLessThan(2_800);
  });

  it("gibt jedem Abzweig einen eigenen, aber reproduzierbaren Strom", () => {
    const eins = new Zufall(1234);
    const zwei = new Zufall(1234);
    expect(eins.abzweig("fs").startwert).toBe(zwei.abzweig("fs").startwert);
    expect(eins.abzweig("fs").startwert).not.toBe(eins.abzweig("takt").startwert);
    // Der Abzweig darf den Elternstrom nicht verbrauchen — sonst verschöbe eine
    // zusätzliche Störquelle die gesamte Folge aller anderen.
    const vorher = new Zufall(1234);
    vorher.abzweig("egal");
    expect(vorher.naechste()).toBe(new Zufall(1234).naechste());
  });

  it("weist unbrauchbare Startwerte und Grenzen ab", () => {
    expect(() => new Zufall(-1)).toThrow(RangeError);
    expect(() => new Zufall(1.5)).toThrow(RangeError);
    expect(() => new Zufall(1).bis(0)).toThrow(RangeError);
    expect(() => new Zufall(1).zwischen(5, 4)).toThrow(RangeError);
    expect(() => new Zufall(1).waehle([])).toThrow(RangeError);
  });
});
