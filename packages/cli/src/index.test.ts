import { describe, expect, it } from "vitest";

import { fuehreAus } from "./index.js";

describe("s1-Kommandozeile", () => {
  it("zeigt ohne Argumente die Hilfe", async () => {
    const ergebnis = await fuehreAus([]);

    expect(ergebnis.code).toBe(0);
    expect(ergebnis.text).toContain("s1 diagnose");
  });

  it("erreicht in `diagnose` alle @s1-Pakete", async () => {
    const ergebnis = await fuehreAus(["diagnose", "/share/S1-Control"]);

    expect(ergebnis.code).toBe(0);
    expect(ergebnis.text).toContain("einsaetze");
    expect(ergebnis.text).toContain("47411");
  });

  it("meldet unbekannte Kommandos mit Exitcode 2", async () => {
    expect((await fuehreAus(["quatsch"])).code).toBe(2);
  });

  it("nennt `simuliere` in der Hilfe", async () => {
    expect((await fuehreAus([])).text).toContain("s1 simuliere");
  });

  it("weist unbekannte Optionen von `simuliere` ab, statt sie zu übergehen", async () => {
    const ergebnis = await fuehreAus(["simuliere", "--kommandi", "10"]);
    expect(ergebnis.code).toBe(2);
    expect(ergebnis.text).toContain("--kommandi");
  });

  it("weist einen Plan ab, der keinen Vergleich hergibt", async () => {
    const ergebnis = await fuehreAus(["simuliere", "--clients", "1"]);
    expect(ergebnis.code).toBe(2);
    expect(ergebnis.text).toContain("mindestens 2 Clients");
  });

  it("führt einen kleinen Lauf aus und meldet ihn mit Exitcode 0", async () => {
    // Auflage 18: Der Abnahmeschritt muss ohne Textauswertung entscheidbar
    // sein. Deshalb wird hier der Exitcode geprüft, nicht nur der Bericht.
    const ergebnis = await fuehreAus([
      "simuliere",
      "--clients", "2",
      "--kommandos", "20",
      "--phasen", "1",
      "--still",
    ]);
    expect(ergebnis.text).toContain("Konvergenzvergleich nach §7.6");
    expect(ergebnis.code).toBe(0);
  }, 60_000);
});
