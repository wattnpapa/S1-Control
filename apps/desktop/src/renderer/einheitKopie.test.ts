/**
 * Prüffälle zu „Zeile kopieren“ (einheitKopie.ts).
 *
 * Gemessen wird, was übernommen wird und was nicht. Dass die Maske die
 * Vorbelegung schreibt, misst `EinheitAnlegen.test.tsx`; dass die Kopie im
 * Aktendienst eine eigene Zeile wird, `szenarien-anlage.test.ts`.
 */

import { describe, expect, it } from "vitest";

import type { Tabellenzeile, Zelle } from "@s1/domaene";

import { kopierteBezeichnung, kopieVorbelegung } from "./einheitKopie.js";

function zelle(wert: unknown, text = typeof wert === "string" ? wert : ""): Zelle {
  return { text, wert, umstritten: false };
}

function quelle(teil: Partial<Tabellenzeile> = {}): Tabellenzeile {
  return {
    einheitId: "U1",
    abschnittId: "EO",
    abschnittName: "Deich Nord",
    reihenfolge: 3,
    anzeige: "B 1 OV Hude",
    staerke: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7 },
    gesamt: 9,
    entfernt: false,
    zaehlklasse: "ist",
    aufgegangen: false,
    hinweise: [],
    zellen: {
      bezeichnung: zelle("B 1"),
      organisation: zelle("THW"),
      ebene: zelle("GRUPPE"),
      status: zelle("IM_EINSATZ", "Einsatz"),
      eingetroffenAm: zelle("2026-10-30T08:00:00.000Z", "30.10.2026 09:00"),
      auftraege: zelle(undefined, "Deich sichern"),
      geraete: zelle(undefined, "GKW"),
    },
    herkunftName: "THW OV Hude",
    vorlageId: "thw-b",
    ...teil,
  };
}

describe("kopierteBezeichnung", () => {
  it("hängt an die erste Kopie „(2)“", () => {
    expect(kopierteBezeichnung("Bergungsgruppe", ["Bergungsgruppe", "Fachgruppe N"])).toBe("Bergungsgruppe (2)");
  });

  it("zählt über die vorhandenen Kopien weiter", () => {
    expect(kopierteBezeichnung("BtTr", ["BtTr", "BtTr (2)", "BtTr (4)"])).toBe("BtTr (5)");
  });

  it("hängt an die Kopie einer Kopie keinen zweiten Zähler", () => {
    expect(kopierteBezeichnung("BtTr (2)", ["BtTr", "BtTr (2)"])).toBe("BtTr (3)");
  });

  it("verwechselt ähnliche Namen nicht mit dem Stamm", () => {
    expect(kopierteBezeichnung("B", ["B 1 (7)", "B"])).toBe("B (2)");
  });
});

describe("kopieVorbelegung", () => {
  it("übernimmt Bauart, Herkunft, Stärke, Abschnitt und Vorlage", () => {
    expect(kopieVorbelegung(quelle(), ["B 1"])).toEqual({
      quelle: "B 1 OV Hude",
      bezeichnung: "B 1 (2)",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: { fuehrer: "0", unterfuehrer: "2", mannschaft: "7" },
      herkunft: "THW OV Hude",
      abschnittId: "EO",
      vorlageId: "thw-b",
    });
  });

  it("übernimmt weder Status noch Zeiten, Aufträge oder Fahrzeuge", () => {
    // Die Excel kopiert alles und zählt bis zur Korrektur doppelt
    // (excel-vba-workflows.md §3.4). Die Vorbelegung kennt diese Felder gar nicht.
    const belegt = kopieVorbelegung(quelle(), []);
    expect(Object.keys(belegt).sort()).toEqual(
      ["abschnittId", "bezeichnung", "ebene", "herkunft", "organisation", "quelle", "staerke", "vorlageId"].sort(),
    );
  });

  it("lässt die Vorlage weg, wenn die Quelle keine hatte, und die Herkunft leer", () => {
    const ohne: Tabellenzeile = { ...quelle() };
    delete (ohne as { vorlageId?: string }).vorlageId;
    delete (ohne as { herkunftName?: string }).herkunftName;
    const belegt = kopieVorbelegung(ohne, []);
    expect("vorlageId" in belegt).toBe(false);
    expect(belegt.herkunft).toBe("");
  });

  it("lässt eine unbekannte Organisation oder Ebene leer, statt sie zu raten", () => {
    const belegt = kopieVorbelegung(
      quelle({ zellen: { bezeichnung: zelle("X"), organisation: zelle("UNBEKANNT"), ebene: zelle(null) } }),
      [],
    );
    expect(belegt.organisation).toBe("");
    expect(belegt.ebene).toBe("");
  });

  it("nimmt die Anzeige, wenn die Zelle keine Bezeichnung trägt", () => {
    expect(kopieVorbelegung(quelle({ zellen: {} }), []).bezeichnung).toBe("B 1 OV Hude (2)");
  });
});
