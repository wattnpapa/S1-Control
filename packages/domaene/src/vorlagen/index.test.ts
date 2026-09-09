import { describe, expect, it } from "vitest";
import { gefuellteKataloge, vorlage, vorlagen, vorlagenAus } from "./index.js";

describe("Vorlagenkatalog", () => {
  it("fuehrt THW- und Feuerwehr-Vorlagen", () => {
    expect(vorlagenAus("THW_STAN").length).toBeGreaterThan(40);
    expect(vorlagenAus("FEUERWEHR").length).toBe(5);
  });

  it("hat den KatS-Nds-Katalog noch nicht", () => {
    // Die Arbeitsmappe liegt nicht vor; ein geratener Katalog waere ein
    // Platzhalter, der spaeter wie eine Festlegung aussieht.
    expect(vorlagenAus("KATS_STAN_NDS")).toHaveLength(0);
    expect(gefuellteKataloge()).toEqual(["FEUERWEHR", "THW_STAN"]);
  });

  it("vergibt jede Kennung genau einmal", () => {
    const kennungen = vorlagen().map((eintrag) => eintrag.id);
    expect(new Set(kennungen).size).toBe(kennungen.length);
  });

  it("erfindet keine Sollstaerke", () => {
    for (const eintrag of vorlagenAus("FEUERWEHR")) {
      expect(eintrag.sollStaerke).toBeUndefined();
    }
  });

  it("verweist mit `teilVon` nur auf vorhandene Vorlagen", () => {
    for (const eintrag of vorlagen()) {
      if (eintrag.teilVon === undefined) continue;
      expect(vorlage(eintrag.teilVon)).toBeDefined();
    }
  });

  it("findet eine Vorlage nach Kennung und meldet eine unbekannte", () => {
    expect(vorlage("fw-loeschzug")?.bezeichnung).toBe("LZ FW");
    expect(vorlage("gibt-es-nicht")).toBeUndefined();
  });
});
