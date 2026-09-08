import path from "node:path";

import { describe, expect, it } from "vitest";

import { einsatzOrdner, ereignisDateiname, sha256Hex } from "./index.js";

describe("Ablage auf dem Share", () => {
  it("legt den Einsatzordner unterhalb von einsaetze/ an", () => {
    const ordner = einsatzOrdner(path.join("/", "share", "S1-Control"), "2026-09-08", "Hochwasser Süd");

    expect(ordner).toMatch(/einsaetze[\\/]2026-09-08_hochwasser-sued_[0-9a-f]{6}$/);
  });

  it("benennt Ereignisdateien je Client und Segment (§4.1)", () => {
    expect(ereignisDateiname("9f3c1a20aaaa", 7)).toBe("9f3c1a20.0007.jsonl");
  });

  it("stellt `@s1/domaene` die SHA-256-Funktion für §7.6 bereit", () => {
    // Die vorgesehene Naht: `zustandsHash` nimmt sie als Parameter entgegen,
    // weil der Fachkern `node:crypto` nicht sehen darf.
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).toMatch(/^[0-9a-f]{64}$/);
  });
});
