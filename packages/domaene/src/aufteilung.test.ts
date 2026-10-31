import { describe, expect, it } from "vitest";

import { aufteilungPruefen } from "./aufteilung.js";
import { StatusGesetzt } from "./katalog/schemata.js";

const quelle = { fuehrer: 0, unterfuehrer: 1, mannschaft: 11 };

describe("aufteilungPruefen", () => {
  it("lässt einen Abzug im Bestand zu, auch den ganzen", () => {
    expect(aufteilungPruefen(quelle, { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 })).toEqual({ ok: true });
    expect(aufteilungPruefen(quelle, quelle)).toEqual({ ok: true });
  });

  it("lehnt ab, wenn eine einzige Funktion den Bestand übersteigt, und nennt den Bestand", () => {
    const befund = aufteilungPruefen(quelle, { fuehrer: 1, unterfuehrer: 0, mannschaft: 0 });
    expect(befund.ok).toBe(false);
    if (!befund.ok) {
      expect(befund.meldung).toContain("Es sind nur 0/1/11");
      expect(befund.vorhanden).toEqual(quelle);
    }
  });

  it("lehnt den Fall „60 von 12“ ab", () => {
    const befund = aufteilungPruefen({ fuehrer: 1, unterfuehrer: 2, mannschaft: 9 }, { fuehrer: 5, unterfuehrer: 5, mannschaft: 50 });
    expect(befund.ok).toBe(false);
  });

  it("rechnet mit 0, wenn die Quelle rechnerisch negativ ist", () => {
    const befund = aufteilungPruefen({ fuehrer: -2, unterfuehrer: 0, mannschaft: 3 }, { fuehrer: 1, unterfuehrer: 0, mannschaft: 1 });
    expect(befund.ok).toBe(false);
    if (!befund.ok) expect(befund.vorhanden.fuehrer).toBe(0);
  });

  it("lehnt einen Abzug ohne jede Kraft ab", () => {
    const befund = aufteilungPruefen(quelle, { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 });
    expect(befund.ok).toBe(false);
  });
});

describe("StatusGesetzt.ereignisZeit", () => {
  it("ist optional und muss, wenn vorhanden, eine Zeitangabe sein", () => {
    expect(StatusGesetzt.safeParse({ einheitId: "U1" }).success).toBe(true);
    expect(StatusGesetzt.safeParse({ einheitId: "U1", ereignisZeit: "2026-09-08T10:15:00+02:00" }).success).toBe(true);
    expect(StatusGesetzt.safeParse({ einheitId: "U1", ereignisZeit: "gestern" }).success).toBe(false);
  });
});
