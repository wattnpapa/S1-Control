/**
 * Die Kontrollsummen des Statusblatts in Klartext: keine nackte Differenz wie
 * „(-49)“, keine internen Kennungen, Namen statt Ids.
 */

import { describe, expect, it } from "vitest";

import type { Statusdaten } from "./status.js";
import { istZeile, kontrollzeilen, namenListe } from "./status-kontrolle.js";

const NULL = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function daten(teil: Partial<Statusdaten>): Statusdaten {
  return {
    einsatzName: "Test",
    fuestName: "FüSt",
    organisationen: [],
    organisationenSumme: {
      organisation: "Gesamt",
      staerke: NULL,
      gesamt: 0,
      maennlich: 0,
      weiblich: 0,
      divers: 0,
      vegetarisch: 0,
      vegan: 0,
      uebernachtungM: 0,
      uebernachtungW: 0,
      uebernachtungD: 0,
    },
    ist: { fuehrer: 1, unterfuehrer: 6, mannschaft: 42 },
    erwartet: 9,
    beendet: 0,
    status: [],
    statusSumme: 0,
    schichten: [],
    schichtenSumme: 0,
    probeStatus: 0,
    probeSchicht: 0,
    ohnePflichtangabe: [],
    ...teil,
  };
}

describe("Kontrollsummen in Klartext", () => {
  it("meldet ohne erfasste Schichten einen neutralen Hinweis statt einer roten Differenz", () => {
    const zeilen = kontrollzeilen(daten({ probeSchicht: -49 }));
    const schicht = zeilen[1];
    expect(schicht?.art).toBe("hinweis");
    expect(schicht?.text).toContain("keine Schichten erfasst");
    expect(schicht?.text).not.toContain("-49");
  });

  it("erklärt eine Abweichung mit Menge und Namen, nie mit Kennung", () => {
    const zeilen = kontrollzeilen(
      daten({
        probeSchicht: -3,
        schichtenSumme: 20,
        ohnePflichtangabe: [{ id: "E-05dfe66cdb46", bezeichnung: "ZTr" }],
      }),
    );
    expect(zeilen[1]?.art).toBe("fehler");
    expect(zeilen[1]?.text).toContain("fehlen 3 Kräfte");
    expect(zeilen[1]?.text).toContain("ZTr");
    expect(zeilen[1]?.text).not.toContain("E-05dfe66cdb46");
  });

  it("meldet o.k., wenn beide Proben aufgehen", () => {
    expect(kontrollzeilen(daten({})).map((z) => z.art)).toEqual(["ok", "ok"]);
  });

  it("kürzt lange Namenslisten", () => {
    const namen = Array.from({ length: 11 }, (_, i) => `E${String(i)}`);
    expect(namenListe(namen)).toBe("E0, E1, E2, E3, E4, E5, E6, E7 und 3 weitere");
  });

  it("die Zählzeile nennt Ist-Stärke und erwartete Köpfe wie das Kopfband", () => {
    expect(istZeile(daten({}))).toBe(
      "Ist-Stärke (vor Ort): 1/6/42 // 49 · +9 erwartet (angefordert/Anmarsch/Eingang)",
    );
  });
});
