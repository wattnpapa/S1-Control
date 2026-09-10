/**
 * Die Zahlen des Stärke-Monitors (M3.5).
 *
 * Geprüft wird jede der drei Funktionen an ihren Rändern, denn dort sitzen
 * die Fehler, die auf einem Monitor an der Wand niemandem auffallen: ein
 * Monatswechsel über Mitternacht, eine einstellige Stunde ohne führende Null,
 * ein Fenster, das für die Zahl zu schmal ist.
 *
 * Die Zeitzone des Prüfrechners kommt in keinem dieser Fälle vor — genau das
 * ist die Aussage von `natoZeit` (KONZEPT-EREIGNISSE.md §3.2: mit verstellten
 * und verschieden eingestellten Uhren ist zu rechnen).
 */

import { describe, expect, it } from "vitest";

import {
  SCHRIFT_MAX,
  SCHRIFT_MIN,
  ZEIT_UNBEKANNT,
  natoZeit,
  schriftgroesse,
  staerketext,
} from "./monitorZahlen.js";

describe("natoZeit", () => {
  it("schreibt die Gruppe in der Form TTHHMM<Zone> MMM JJ", () => {
    // 13:30 UTC sind 14:30 in der Zone A (UTC+1).
    expect(natoZeit(Date.parse("2026-09-10T13:30:00.000Z"))).toBe("101430A SEP 26");
  });

  it("nimmt einen Date ebenso wie eine Zahl", () => {
    const zeitpunkt = new Date("2026-09-10T13:30:00.000Z");
    expect(natoZeit(zeitpunkt)).toBe(natoZeit(zeitpunkt.getTime()));
  });

  it("füllt einstellige Tage, Stunden und Minuten auf", () => {
    // 08:05 UTC sind 09:05 in der Zone A; Tag 5, Monat März.
    expect(natoZeit(Date.parse("2026-03-05T08:05:00.000Z"))).toBe("050905A MRZ 26");
  });

  it("trägt den Monats- und Jahreswechsel mit, den der Zonenversatz auslöst", () => {
    // 23:30 UTC am 31. Dezember sind in der Zone A schon der 1. Januar.
    expect(natoZeit(Date.parse("2026-12-31T23:30:00.000Z"))).toBe("010030A JAN 27");
  });

  it("rechnet den Versatz aus dem Buchstaben, nicht aus dem Rechner", () => {
    const augenblick = Date.parse("2026-09-10T13:30:00.000Z");
    expect(natoZeit(augenblick, "Z")).toBe("101330Z SEP 26");
    expect(natoZeit(augenblick, "B")).toBe("101530B SEP 26");
    // N ist −1: derselbe Augenblick, ein Tagesrand weniger weit.
    expect(natoZeit(augenblick, "N")).toBe("101230N SEP 26");
  });

  it("nimmt den Buchstaben klein und mit Leerraum entgegen", () => {
    expect(natoZeit(Date.parse("2026-09-10T13:30:00.000Z"), " a ")).toBe("101430A SEP 26");
  });

  it("fällt bei einem unbekannten Buchstaben auf Z zurück, statt einen Versatz zu erfinden", () => {
    // „J“ ist die Ortszeit des Betrachters und wird bewusst nicht geführt.
    expect(natoZeit(Date.parse("2026-09-10T13:30:00.000Z"), "J")).toBe("101330Z SEP 26");
    expect(natoZeit(Date.parse("2026-09-10T13:30:00.000Z"), "")).toBe("101330Z SEP 26");
  });

  it("nennt einen unlesbaren Zeitpunkt beim Namen, statt abzustürzen", () => {
    expect(natoZeit(Number.NaN)).toBe(ZEIT_UNBEKANNT);
    expect(natoZeit(new Date("kein Zeitpunkt"))).toBe(ZEIT_UNBEKANNT);
  });

  it("schreibt jeden Monat mit seinem deutsch-neutralen Kürzel", () => {
    const kuerzel = Array.from({ length: 12 }, (_, index) =>
      // Der 15. um 12:00 UTC liegt in jeder Zone im selben Monat.
      natoZeit(Date.UTC(2026, index, 15, 12, 0), "Z").split(" ")[1],
    );
    expect(kuerzel).toEqual([
      "JAN",
      "FEB",
      "MRZ",
      "APR",
      "MAI",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OKT",
      "NOV",
      "DEZ",
    ]);
  });
});

describe("schriftgroesse", () => {
  it("nutzt die Breite aus, solange die Höhe reicht", () => {
    // 9 Zeichen in 1000 px: 1000 / (9 · 0,62) ≈ 179; die Höhe erlaubt 500.
    expect(schriftgroesse(9, 1000, 1000)).toBe(179);
  });

  it("lässt sich von der Höhe begrenzen, wenn das Fenster breit und flach ist", () => {
    // 4000 px breit ergäben aus der Breite rund 716 — die halbe Höhe sind 150.
    expect(schriftgroesse(9, 4000, 300)).toBe(150);
  });

  it("wird bei mehr Zeichen kleiner", () => {
    expect(schriftgroesse(14, 1000, 1000)).toBeLessThan(schriftgroesse(9, 1000, 1000));
  });

  it("klemmt ein sehr schmales Fenster auf das Minimum", () => {
    // Lieber ein Umbruch als eine Zahl, die aus drei Metern niemand liest.
    expect(schriftgroesse(9, 120, 800)).toBe(SCHRIFT_MIN);
    expect(schriftgroesse(9, 0, 0)).toBe(SCHRIFT_MIN);
  });

  it("klemmt ein sehr großes Fenster auf das Maximum", () => {
    expect(schriftgroesse(3, 20000, 20000)).toBe(SCHRIFT_MAX);
  });

  it("behandelt eine leere Zeile wie ein Zeichen, statt durch null zu teilen", () => {
    expect(schriftgroesse(0, 1000, 1000)).toBe(schriftgroesse(1, 1000, 1000));
    expect(Number.isFinite(schriftgroesse(0, 1000, 1000))).toBe(true);
  });

  it("liefert auch bei unsinnigen Maßen eine brauchbare Zahl", () => {
    expect(schriftgroesse(9, -500, 800)).toBe(SCHRIFT_MIN);
    expect(schriftgroesse(9, Number.NaN, 800)).toBe(SCHRIFT_MIN);
  });
});

describe("staerketext", () => {
  it("schreibt Fü/UFü/He und die Summe wie das Blatt Stärke", () => {
    expect(staerketext({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 })).toBe("0/1/8 = 9");
    expect(staerketext({ fuehrer: 1, unterfuehrer: 2, mannschaft: 20 })).toBe("1/2/20 = 23");
  });

  it("zeigt eine Stärke von null als Null und nicht als Leere", () => {
    // Ein leerer Monitor hiesse „keine Auskunft“; „0/0/0 = 0“ heisst „niemand
    // im Einsatz“. Das ist ein Unterschied, den die Führungsstelle sehen muss.
    expect(staerketext({ fuehrer: 0, unterfuehrer: 0, mannschaft: 0 })).toBe("0/0/0 = 0");
  });

  it("bleibt bei dreistelligen Zahlen lesbar", () => {
    expect(staerketext({ fuehrer: 12, unterfuehrer: 34, mannschaft: 456 })).toBe("12/34/456 = 502");
  });
});
