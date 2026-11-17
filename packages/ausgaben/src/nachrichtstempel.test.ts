/** ETB-Nummer in Feld 20 und Stempel der zurückgezogenen Nachricht (Audits Nachrichten ETB P1-2, P1-3, P2-7). */

import { jsPDF } from "jspdf";
import { describe, expect, it } from "vitest";

import { nachrichtAlsVordruckPdf, vordruckDatenAus, type Nachrichtendruck } from "./nachricht.js";
import { etbVermerk, rueckzugText, zeichneRueckzugsstempel } from "./nachrichtstempel.js";

const GRUNDLAGE: Nachrichtendruck = {
  richtung: "AUSGANG",
  art: "",
  vorrang: "",
  gespraechsnotiz: false,
  uebermittlungswunsch: "FUNK",
  anschrift: "OV Brake",
  rufnummer: "",
  betreff: "Verpflegung",
  inhalt: "Bitte liefern.",
  absender: "S4",
  abfassungszeit: "2026-11-17T09:45:00Z",
  zeichen: "Ru",
  funktion: "S4",
  gegenstelle: "",
  sichtung: { zeitpunkt: "2026-11-17T09:50:00Z", handzeichen: "Si", verteiler: [{ stelle: "S2", kopie: false }], vermerke: "eilt" },
  uebung: false,
};

describe("ETB-Nummer in Feld 20 (ETB P1-2)", () => {
  it("steht vor den Vermerken der Sichtung", () => {
    expect(vordruckDatenAus({ ...GRUNDLAGE, etbNummer: "17" }).vermerke).toBe("ETB-Nr. 17 eilt");
    expect(vordruckDatenAus(GRUNDLAGE).vermerke).toBe("eilt");
    expect(etbVermerk(" ")).toBe("");
  });
});

describe("Stempel „ZURÜCKGEZOGEN“ (ETB P1-3, P2-7)", () => {
  const zurueck = { zeitpunkt: "2026-11-17T10:05:00Z", grund: "Doppelt aufgegeben" };

  it("setzt Prüfvermerk und Hinweis mit Datum-Zeit-Gruppe und Grund", () => {
    const daten = vordruckDatenAus({ ...GRUNDLAGE, zurueckgezogen: zurueck });
    expect(daten.pruefvermerk).toBe("ZURÜCKGEZOGEN");
    expect(daten.hinweis).toBe("ZURÜCKGEZOGEN 171105nov26: Doppelt aufgegeben");
    expect(rueckzugText({ zeitpunkt: zurueck.zeitpunkt, grund: "" })).toBe("ZURÜCKGEZOGEN 171105nov26");
    expect(vordruckDatenAus(GRUNDLAGE).pruefvermerk).toBe("");
  });

  it("zeichnet den Schriftzug quer über den Vordruck und macht das PDF größer", () => {
    const pdf = new jsPDF({ unit: "mm", format: "a5", compress: false });
    zeichneRueckzugsstempel(pdf, 0);
    expect(pdf.output()).toContain("ZUR");
    const ohne = nachrichtAlsVordruckPdf(GRUNDLAGE, { blatt: "a5" });
    const mit = nachrichtAlsVordruckPdf({ ...GRUNDLAGE, zurueckgezogen: zurueck }, { blatt: "a5" });
    expect(new TextDecoder().decode(mit.slice(0, 5))).toBe("%PDF-");
    expect(mit.length).toBeGreaterThan(ohne.length);
  });
});
