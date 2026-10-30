import { describe, expect, it } from "vitest";

import {
  ERNAEHRUNG_AUSWAHL,
  FAHRZEUGSTATUS_AUSWAHL,
  GESCHLECHT_AUSWAHL,
  ROLLEN_AUSWAHL,
  einheitsteilTitel,
} from "./beschriftungen-einheitsteile.js";

describe("Die Beschriftungen an Fahrzeug und Person", () => {
  it("geben jedem Katalogwert ein Wort statt eines Schlüssels", () => {
    for (const liste of [ROLLEN_AUSWAHL, GESCHLECHT_AUSWAHL, ERNAEHRUNG_AUSWAHL, FAHRZEUGSTATUS_AUSWAHL]) {
      expect(liste.length).toBeGreaterThan(0);
      for (const eintrag of liste) expect(eintrag.titel).not.toBe(eintrag.wert);
    }
  });

  it("nennen die Mannschaft Helfer, wie die Stärke „Fü/UFü/He“", () => {
    expect(ROLLEN_AUSWAHL.map((eintrag) => eintrag.titel)).toEqual(["Führer", "Unterführer", "Helfer"]);
  });

  it("lassen einen unbekannten Wert sichtbar stehen (§3.7)", () => {
    expect(einheitsteilTitel("NEUE_ROLLE")).toBe("NEUE_ROLLE");
  });
});
