import { describe, expect, it } from "vitest";

import { fuehreAus } from "./index.js";

describe("s1-Kommandozeile", () => {
  it("zeigt ohne Argumente die Hilfe", () => {
    const ergebnis = fuehreAus([]);

    expect(ergebnis.code).toBe(0);
    expect(ergebnis.text).toContain("s1 diagnose");
  });

  it("erreicht in `diagnose` alle @s1-Pakete", () => {
    const ergebnis = fuehreAus(["diagnose", "/share/S1-Control"]);

    expect(ergebnis.code).toBe(0);
    expect(ergebnis.text).toContain("einsaetze");
    expect(ergebnis.text).toContain("47411");
  });

  it("meldet unbekannte Kommandos mit Exitcode 2", () => {
    expect(fuehreAus(["quatsch"]).code).toBe(2);
  });
});
