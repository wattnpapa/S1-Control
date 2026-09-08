import path from "node:path";

import { describe, expect, it } from "vitest";

import { einsatzOrdner, ereignisDatei, nutzlastHash } from "./index.js";

describe("Ablage auf dem Share", () => {
  it("legt den Einsatzordner unterhalb von einsaetze/ an", () => {
    const ordner = einsatzOrdner(path.join("/", "share", "S1-Control"), "2026-09-08", "Hochwasser Süd");

    expect(ordner).toMatch(/einsaetze[\\/]2026-09-08_hochwasser-sued_[0-9a-f]{6}$/);
  });

  it("benennt Ereignisdateien je Client und Segment", () => {
    const datei = ereignisDatei(path.join("/", "einsatz"), "fuest-01", 7);

    expect(path.basename(datei)).toBe("fuest-01.0007.jsonl");
  });

  it("hasht Nutzlasten stabil", () => {
    expect(nutzlastHash("abc")).toBe(nutzlastHash("abc"));
    expect(nutzlastHash("abc")).toHaveLength(64);
  });
});
