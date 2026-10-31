import { describe, expect, it } from "vitest";

import { ABSCHNITTSTYPEN, EINHEIT_STATUS, ORGANISATIONEN, SCHICHTEN, TAKTISCHE_EBENEN } from "./ereignis.js";
import {
  abschnittstypTitel,
  ebeneTitel,
  einsatzArtTitel,
  organisationTitel,
  schichtTitel,
  schichtmodellTitel,
  spaltenwertTitel,
  statusTitel,
  statusTon,
  vorlagenkatalogTitel,
} from "./beschriftungen.js";
import { VORLAGENKATALOGE } from "./vorlagen/katalog.js";

describe("Die Beschriftungen", () => {
  it("geben jedem Statuswert das Wort der Excel und einen Ton", () => {
    expect(statusTitel("IM_EINSATZ")).toBe("Einsatz");
    expect(statusTitel("NICHT_EINSATZBEREIT")).toBe("Nicht einsatzbereit");
    for (const status of EINHEIT_STATUS) {
      expect(statusTitel(status)).not.toContain("_");
      expect(statusTon(status)).not.toBe("neutral");
    }
  });

  it("kennen jede Schicht, Ebene, Organisation und jeden Abschnittstyp", () => {
    for (const wert of SCHICHTEN) expect(schichtTitel(wert)).not.toBe(wert);
    for (const wert of TAKTISCHE_EBENEN) expect(ebeneTitel(wert)).toMatch(/^[A-ZÄÖÜ]/);
    for (const wert of ABSCHNITTSTYPEN) expect(abschnittstypTitel(wert)).not.toContain("_");
    for (const wert of ORGANISATIONEN) expect(organisationTitel(wert)).not.toBe("");
    expect(abschnittstypTitel("ARCHIV")).toBe("Einsatz beendet");
    for (const wert of VORLAGENKATALOGE) expect(vorlagenkatalogTitel(wert)).not.toContain("_");
    expect(vorlagenkatalogTitel("KATS_STAN_NDS")).toBe("KatS-StAN Nds");
  });

  it("lassen unbekannte Werte sichtbar (§3.7) und beschriften je Spalte", () => {
    expect(statusTitel("WARTET")).toBe("WARTET");
    expect(statusTon("WARTET")).toBe("neutral");
    expect(spaltenwertTitel("status", "RUHE")).toBe("Ruhe");
    expect(spaltenwertTitel("schicht", "FRUEH")).toBe("Früh");
    expect(spaltenwertTitel("ebene", "ZUGTRUPP")).toBe("Zugtrupp");
    expect(spaltenwertTitel("organisation", "FEUERWEHR")).toBe("Feuerwehr");
    expect(spaltenwertTitel("einheitSchluessel", "EEB-7")).toBe("EEB-7");
    expect(spaltenwertTitel("personalErfassung", "NUR_STAERKE")).toBe("Nur Stärke");
    expect(spaltenwertTitel("personalErfassung", "VOLLSTAENDIG")).toBe("Mit Personen");
  });
});

describe("Die Beschriftungen der Stammdaten", () => {
  it("geben Einsatzart und Schichtmodell ein Wort und lassen Unbekanntes stehen", () => {
    expect(einsatzArtTitel("UEBUNG")).toBe("Übung");
    expect(einsatzArtTitel("VERANSTALTUNG")).toBe("Veranstaltung");
    expect(schichtmodellTitel("DREI_SCHICHT")).toBe("Drei Schichten");
    expect(schichtmodellTitel("VIER_SCHICHT")).toBe("VIER_SCHICHT");
  });
});
