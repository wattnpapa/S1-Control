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
    // Ortszeit: die Zahl im Kopfband ist die, auf die sich die
    // Führungsstelle im Raum verständigt.
    const zeitpunkt = new Date(2026, 8, 10, 14, 43, 12);
    expect(taktischeZeit(zeitpunkt.getTime())).toBe("101443SEP26");
  });

  it("füllt einstellige Tage und Stunden auf", () => {
    expect(taktischeZeit(new Date(2027, 0, 3, 4, 5).getTime())).toBe("030405JAN27");
  });

  it("nennt eine unlesbare Zeit nicht als Zahl", () => {
    expect(taktischeZeit(Number.NaN)).toBe("—");
  });
});
