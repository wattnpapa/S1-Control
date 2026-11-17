import { describe, expect, it } from "vitest";

import { nachrichtBefoerdern, nachrichtVorschlagen } from "./fmzschritte.js";
import { nachrichtenentwurfFehler } from "./nachrichtenschritte.js";

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

describe("nachrichtVorschlagen", () => {
  const vorschlag = { mittel: "FUNK", zeitpunkt: "2026-11-17T08:29:00.000Z", handzeichen: " LdF ", fernmelder: " Fm2 ", gegenstelle: " HK " };

  it("schreibt Fernmelder, Mittel und Gegenstelle geputzt mit Vorwert-Prüfung", () => {
    const entwurf = nachrichtVorschlagen("N1", null, vorschlag);
    expect(entwurf.typ).toBe("NachrichtUebermittlungVorgeschlagen");
    expect(entwurf.neu).toEqual({ mittel: "FUNK", fernmelder: "Fm2", zeitpunkt: vorschlag.zeitpunkt, handzeichen: "LdF", gegenstelle: "HK" });
    expect(entwurf.vorwertPruefen).toBe(true);
    expect(nachrichtenentwurfFehler(entwurf)).toBeUndefined();
  });

  it("lässt die Gegenstelle weg, wenn sie leer ist", () => {
    const entwurf = nachrichtVorschlagen("N1", null, { ...vorschlag, gegenstelle: " " });
    expect(entwurf.neu).not.toHaveProperty("gegenstelle");
  });
});
