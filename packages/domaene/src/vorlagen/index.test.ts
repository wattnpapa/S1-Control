import { describe, expect, it } from "vitest";
import { ORGANISATIONEN, TAKTISCHE_EBENEN } from "../ereignis.js";
import { gefuellteKataloge, vorlage, vorlagen, vorlagenAus } from "./index.js";
import { VORLAGENKATALOGE } from "./katalog.js";

describe("Vorlagenkatalog", () => {
  it("fuehrt THW- und Feuerwehr-Vorlagen", () => {
    expect(vorlagenAus("THW_STAN").length).toBeGreaterThan(40);
    expect(vorlagenAus("FEUERWEHR").length).toBe(5);
  });

  it("fuehrt alle 39 Zeilen des KatS-Nds-Blocks der Excel", () => {
    expect(vorlagenAus("KATS_STAN_NDS")).toHaveLength(39);
    expect(gefuellteKataloge()).toEqual([...VORLAGENKATALOGE].sort());
    expect(vorlage("kats-z-sb")?.lang).toBe("Zug Sanität und Betreuung");
  });

  it("gibt jeder Vorlage gueltige Organisation, Ebene und Staerke", () => {
    for (const eintrag of vorlagen()) {
      expect(ORGANISATIONEN, eintrag.id).toContain(eintrag.organisation);
      expect(TAKTISCHE_EBENEN, eintrag.id).toContain(eintrag.ebene);
      expect(VORLAGENKATALOGE, eintrag.id).toContain(eintrag.katalog);
      expect(eintrag.bezeichnung.trim(), eintrag.id).not.toBe("");
      for (const traeger of eintrag.traeger ?? []) expect(ORGANISATIONEN, eintrag.id).toContain(traeger);
      const soll = eintrag.sollStaerke;
      if (soll === undefined) continue;
      for (const zahl of [soll.fuehrer, soll.unterfuehrer, soll.mannschaft]) {
        expect(Number.isInteger(zahl) && zahl >= 0, eintrag.id).toBe(true);
      }
      expect(soll.fuehrer + soll.unterfuehrer + soll.mannschaft, eintrag.id).toBeGreaterThan(0);
    }
  });

  it("kennzeichnet jede KatS-Sollstaerke als Annahme und belegt mit dem ersten Traeger vor", () => {
    // Die Staerke-Spalten des KatS-Blocks sind in der Excel leer: Was dort
    // steht, ist eine Grundgliederung und muss sich in der Maske so nennen.
    for (const eintrag of vorlagenAus("KATS_STAN_NDS")) {
      expect(eintrag.sollStaerke, eintrag.id).toBeDefined();
      expect(eintrag.sollStaerkeAnnahme, eintrag.id).toBe(true);
      expect(eintrag.traeger?.[0], eintrag.id).toBe(eintrag.organisation);
    }
    for (const eintrag of vorlagenAus("THW_STAN")) expect(eintrag.sollStaerkeAnnahme).toBeUndefined();
  });

  it("summiert einen Fachzug aus seinem Block", () => {
    // FZ BS = ZTr 1/1/2 + Tr 0/1/2 + 2 x LG 0/1/8.
    expect(vorlage("kats-fz-bs")?.sollStaerke).toEqual({ fuehrer: 1, unterfuehrer: 4, mannschaft: 20 });
    expect(vorlage("kats-z-sb")?.sollStaerke).toEqual({ fuehrer: 1, unterfuehrer: 3, mannschaft: 18 });
    expect(vorlage("kats-fz-bs")?.fahrzeuge).toContainEqual({ typ: "LF KatS", anzahl: 2 });
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
