/**
 * Die Schreibweisen — geprüft an den Beispielen aus dem Entwurf.
 */

import { describe, expect, it } from "vitest";

import { gesamt, staerkeText, taktischeZeit } from "./formate.js";

describe("staerkeText", () => {
  it("schreibt Gliederung und Summe mit doppeltem Schrägstrich", () => {
    expect(staerkeText({ fuehrer: 24, unterfuehrer: 61, mannschaft: 183 })).toBe(
      "24/61/183 // 268",
    );
  });

  it("zählt die Summe selbst", () => {
    expect(gesamt({ fuehrer: 1, unterfuehrer: 2, mannschaft: 20 })).toBe(23);
  });
});

describe("taktischeZeit", () => {
  it("setzt Tag, Uhrzeit, Monat und Jahr ohne Zonenbuchstaben", () => {
    // Anzeigezone Europe/Berlin (SGL P3-16): dieselbe Zahl auf jedem Rechner, wie im Vordruck.
    expect(taktischeZeit(Date.parse("2026-09-10T12:43:12Z"))).toBe("101443SEP26");
    expect(taktischeZeit(Date.parse("2026-10-10T12:43:12Z"))).toBe("101443OKT26");
  });

  it("füllt einstellige Tage und Stunden auf", () => {
    expect(taktischeZeit(Date.parse("2027-01-03T03:05:00Z"))).toBe("030405JAN27");
  });

  it("nennt eine unlesbare Zeit nicht als Zahl", () => {
    expect(taktischeZeit(Number.NaN)).toBe("—");
  });
});
