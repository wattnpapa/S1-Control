/**
 * Blätter mit Umschalter (Entlastung E3): der Ort als Merker, der Altbestand
 * von vor E3 und das, was es nicht gibt.
 */

import { describe, expect, it } from "vitest";

import { aufschlagAus, blattort, orttitel, VORGABE_UNTERWAHL } from "./unterblaetter.js";

describe("Der Ort eines Blatts", () => {
  it("trägt bei Sammelblättern die Unteransicht, sonst nur das Blatt", () => {
    expect(blattort("lage", VORGABE_UNTERWAHL)).toBe("lage");
    expect(blattort("eingang", VORGABE_UNTERWAHL)).toBe("eingang.eingangskorb");
    expect(blattort("fuest", { ...VORGABE_UNTERWAHL, fuest: "fueorg" })).toBe("fuest.fueorg");
  });

  it("liest den Ort zurück", () => {
    expect(aufschlagAus("tagebuch")).toEqual({ blatt: "tagebuch" });
    expect(aufschlagAus("eingang.anforderungen")).toEqual({ blatt: "eingang", unterwahl: { eingang: "anforderungen" } });
    expect(aufschlagAus("eingang")).toEqual({ blatt: "eingang" });
    // Eine fremde Unteransicht fällt auf das Blatt zurück, nicht auf einen Fehler.
    expect(aufschlagAus("eingang.fueorg")).toEqual({ blatt: "eingang" });
    expect(aufschlagAus("lage.irgendwas")).toEqual({ blatt: "lage" });
  });

  it("bildet die Blätter von vor E3 auf ihr neues Blatt ab", () => {
    expect(aufschlagAus("anforderungen")).toEqual({ blatt: "eingang", unterwahl: { eingang: "anforderungen" } });
    expect(aufschlagAus("fueorg")).toEqual({ blatt: "fuest", unterwahl: { fuest: "fueorg" } });
  });

  it("kennt Unbekanntes nicht", () => {
    expect(aufschlagAus("gibtsnicht")).toBeUndefined();
    expect(aufschlagAus("")).toBeUndefined();
    expect(aufschlagAus(undefined)).toBeUndefined();
    expect(aufschlagAus(42)).toBeUndefined();
    expect(aufschlagAus("toString")).toBeUndefined();
  });

  it("nennt Blatt und Unteransicht", () => {
    expect(orttitel("eingang.anforderungen")).toBe("Eingang · Anforderungen");
    expect(orttitel("fuest.stammdaten")).toBe("Führungsstelle · Stammdaten und Schichtplan");
    expect(orttitel("tagebuch")).toBe("Einsatztagebuch");
  });
});
