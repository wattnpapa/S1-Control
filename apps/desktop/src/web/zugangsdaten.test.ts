/**
 * Der gemeinsame Zugang und die Bremse — ohne HTTP.
 */

import { describe, expect, it } from "vitest";

import { Bremse } from "./bremse.js";
import { baueZugangspruefer } from "./zugangsdaten.js";

describe("Zugangsprüfer", () => {
  it("nimmt genau Anmeldename und Passwort an", async () => {
    const pruefer = await baueZugangspruefer("fuest", "richtig-langes-passwort");
    expect(await pruefer.pruefe("fuest", "richtig-langes-passwort")).toBe(true);
    expect(await pruefer.pruefe("fuest", "falsches-passwort!!")).toBe(false);
    expect(await pruefer.pruefe("Fuest", "richtig-langes-passwort")).toBe(false);
    expect(await pruefer.pruefe("", "")).toBe(false);
    expect(await pruefer.pruefe("fuest", `richtig-langes-passwort${"x".repeat(2000)}`)).toBe(false);
  });

  it("hält den Klartext nicht im Prüfer", async () => {
    const pruefer = await baueZugangspruefer("fuest", "geheimes-passwort-123");
    expect(JSON.stringify(pruefer)).not.toContain("geheimes-passwort-123");
  });
});

describe("Bremse", () => {
  it("lässt fünf Fehlversuche je Absender zu und sperrt dann bis zum Ende des Fensters", () => {
    const uhr = { jetzt: 0 };
    const bremse = new Bremse({ zeit: () => uhr.jetzt });
    for (let i = 0; i < 5; i += 1) {
      expect(bremse.wartezeit("10.0.0.1")).toBe(0);
      bremse.fehlversuch("10.0.0.1");
      uhr.jetzt += 60_000;
    }
    // Der erste Fehlversuch lag bei 0, das Fenster ist 15 Minuten.
    expect(bremse.wartezeit("10.0.0.1")).toBe(15 * 60_000 - 5 * 60_000);
    expect(bremse.wartezeit("10.0.0.2")).toBe(0);
    uhr.jetzt = 15 * 60_000 + 1;
    expect(bremse.wartezeit("10.0.0.1")).toBe(0);
  });

  it("vergisst die Fehlversuche nach einer gelungenen Anmeldung", () => {
    const bremse = new Bremse({ zeit: () => 0 });
    for (let i = 0; i < 4; i += 1) bremse.fehlversuch("a");
    bremse.erfolg("a");
    bremse.fehlversuch("a");
    expect(bremse.wartezeit("a")).toBe(0);
  });
});
