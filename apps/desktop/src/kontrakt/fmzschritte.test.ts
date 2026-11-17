import { describe, expect, it } from "vitest";

import { nachrichtBefoerdern } from "./fmzschritte.js";

const vermerk = { mittel: "FUNK", zeitpunkt: "2026-11-17T08:29:00.000Z", handzeichen: " ABV ", gegenstelle: " HK " };

describe("nachrichtBefoerdern", () => {
  it("schreibt den Vermerk geputzt und ohne Kontakt-Folge, wenn keine Einheit gewählt ist", () => {
    const entwurf = nachrichtBefoerdern("N1", null, vermerk);
    expect(entwurf.neu).toEqual({ mittel: "FUNK", zeitpunkt: vermerk.zeitpunkt, handzeichen: "ABV", gegenstelle: "HK" });
    expect(entwurf.nachrichtenfolge).toBeUndefined();
  });

  it("verlangt den Kontakt im Funkplan, wenn die Gegenstelle eine Einheit ist", () => {
    expect(nachrichtBefoerdern("N1", null, vermerk, "E7").nachrichtenfolge).toEqual({ kontaktEinheitId: "E7" });
  });
});
