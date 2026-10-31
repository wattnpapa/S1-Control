import { describe, expect, it, vi } from "vitest";

import { KLARTEXT_PROGRAMMFEHLER, istProgrammfehler, klartextFehler } from "./klartextfehler.js";

describe("Klartext statt Rohmeldung", () => {
  it("ersetzt Laufzeitfehler durch einen Satz für Menschen", () => {
    const stumm = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let fehler: unknown;
    try {
      void (undefined as unknown as { wert: number }).wert;
    } catch (e) {
      fehler = e;
    }
    expect(istProgrammfehler(fehler)).toBe(true);
    const text = klartextFehler(fehler, "Takt");
    expect(text).toBe(KLARTEXT_PROGRAMMFEHLER);
    expect(text).not.toMatch(/Cannot read|undefined|wert/);
    stumm.mockRestore();
  });

  it("lässt gewollte Meldungen unverändert", () => {
    expect(klartextFehler(new Error("Der Share ist nicht erreichbar."), "Takt")).toBe(
      "Takt: Der Share ist nicht erreichbar.",
    );
    expect(klartextFehler(new Error("Bitte ein Grund."))).toBe("Bitte ein Grund.");
  });
});
