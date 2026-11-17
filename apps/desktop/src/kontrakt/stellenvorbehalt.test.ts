/** Die Regel des Stellenvorbehalts, die Worker und Renderer teilen (R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2). */

import { describe, expect, it } from "vitest";

import { nachrichtAufnehmen } from "./fmzschritte.js";
import { nachrichtSichten, nachrichtVerfassen } from "./nachrichtenschritte.js";
import { STELLE_FMZ, STELLE_SICHTER, istErsatzsichter, stellenvorbehalt, vorbehaltsgrund } from "./stellenvorbehalt.js";

const sichten = nachrichtSichten("N1", null, { zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "X", verteiler: [] });
const ausgang = { nachrichtId: "N1", richtung: "AUSGANG" as const, anschrift: "OV", betreff: "B", inhalt: "I", absender: "S3" };

describe("stellenvorbehalt", () => {
  it("verlangt für Sichten ohne Stelle Sichter einen Grund, außer mit Grund oder als Ersatzsichter", () => {
    expect(stellenvorbehalt(sichten, { stellen: ["FACHBERATER"], sichterBesetzt: true })?.stelle).toBe(STELLE_SICHTER);
    expect(stellenvorbehalt(sichten, { stellen: ["SICHTER"], sichterBesetzt: true })).toBeUndefined();
    expect(stellenvorbehalt({ ...sichten, grund: "Eintrag durch Fachberater, nicht Sichter" }, { stellen: ["FACHBERATER"], sichterBesetzt: true })).toBeUndefined();
    // Ersatzregel: kein Sichter besetzt, die FmZ oder der LdF sichtet.
    expect(stellenvorbehalt(sichten, { stellen: ["FMZ"], sichterBesetzt: false })).toBeUndefined();
    expect(stellenvorbehalt(sichten, { stellen: ["LDF"], sichterBesetzt: false })).toBeUndefined();
    // Kein Sichter, aber eine Stelle ohne FmZ und LdF: kein Ersatz, also Grund.
    expect(stellenvorbehalt(sichten, { stellen: ["S3"], sichterBesetzt: false })?.stelle).toBe(STELLE_SICHTER);
    // Die eigene Gesprächsnotiz verteilt ihr Verfasser selbst (§5, Folie 28).
    expect(stellenvorbehalt(sichten, { stellen: ["S1"], sichterBesetzt: true, eigeneGespraechsnotiz: true })).toBeUndefined();
    // Die Rücknahme einer Sichtung ist kein Sichten.
    expect(stellenvorbehalt({ ...sichten, neu: null }, { stellen: ["S3"], sichterBesetzt: true })).toBeUndefined();
  });

  it("verlangt für Aufnahme und Nachtrag mit Werten der FmZ die Stelle FmZ, nicht für einen gewöhnlichen Ausgang", () => {
    const umfeld = { stellen: ["S3"], sichterBesetzt: true };
    expect(stellenvorbehalt(nachrichtVerfassen(ausgang), umfeld)).toBeUndefined();
    const aufnahme = nachrichtVerfassen({ ...ausgang, richtung: "EINGANG", aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" } });
    expect(stellenvorbehalt(aufnahme, umfeld)?.stelle).toBe(STELLE_FMZ);
    const nachtrag = nachrichtAufnehmen(ausgang, { nachweis: { nummer: 3, zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" }, nachtrag: true });
    expect(stellenvorbehalt(nachtrag, umfeld)?.stelle).toBe(STELLE_FMZ);
    expect(stellenvorbehalt(nachtrag, { stellen: ["FMZ"], sichterBesetzt: true })).toBeUndefined();
  });

  it("bildet den Grund wie die Masken und erkennt den Ersatzsichter", () => {
    expect(vorbehaltsgrund({ stelle: STELLE_FMZ }, ["S3", "S4"])).toBe("Eintrag durch S3, S4, nicht FmZ");
    expect(vorbehaltsgrund({ stelle: STELLE_SICHTER }, [])).toBe("Eintrag durch Arbeitsplatz ohne Stelle, nicht Sichter");
    expect(istErsatzsichter({ stellen: ["FMZ", "SICHTER"], sichterBesetzt: false })).toBe(false);
  });
});
