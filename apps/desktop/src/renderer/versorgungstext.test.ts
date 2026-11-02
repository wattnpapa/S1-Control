/** Tests zu den Wörtern und Zeitangaben der Versorgung (S4.1). */

import { describe, expect, it } from "vitest";

import { kurzzeit, mahlzeitText, nachtText, restzeitText, schichtText, tagText, uhrzeitText, vorzeichen } from "./versorgungstext.js";

const JETZT = new Date(2026, 8, 10, 14, 43).getTime();
const um = (tag: number, stunde: number, minute = 0): string => new Date(2026, 8, tag, stunde, minute).toISOString();

describe("Die Texte der Versorgung", () => {
  it("schreibt die Ausgabezeit vierstellig in Ortszeit", () => {
    expect(uhrzeitText(um(10, 18))).toBe("1800");
    expect(uhrzeitText(um(11, 0))).toBe("0000");
    expect(uhrzeitText("kaputt")).toBe("—");
  });

  it("nennt den Kalendertag relativ zu jetzt — auch über Mitternacht", () => {
    expect(tagText(um(10, 18), JETZT)).toBe("heute");
    expect(tagText(um(11, 0), JETZT)).toBe("morgen");
    expect(tagText(um(12, 6), JETZT)).toBe("übermorgen");
  });

  it("rechnet die Restzeit in Stunden und Minuten", () => {
    expect(restzeitText(um(10, 18), JETZT)).toBe("in 3 h 17 min");
    expect(restzeitText(um(10, 14, 55), JETZT)).toBe("in 12 min");
    expect(restzeitText(um(10, 14, 43), JETZT)).toBe("jetzt");
  });

  it("schreibt Zu- und Abgänge mit Vorzeichen und null als Strich", () => {
    expect(vorzeichen(24, "plus")).toBe("+24");
    expect(vorzeichen(14, "minus")).toBe("−14");
    expect(vorzeichen(0, "plus")).toBe("—");
  });

  it("kennt die Wörter für Mahlzeit, Schicht und Nacht", () => {
    expect(mahlzeitText("ABEND")).toBe("Abend");
    expect(mahlzeitText("ABEND", true)).toBe("Abendessen");
    expect(mahlzeitText("BRUNCH")).toBe("BRUNCH");
    expect(schichtText("SPAET")).toBe("Spät");
    expect(nachtText(JETZT)).toBe("Nacht 10./11. SEP");
    expect(kurzzeit(um(11, 6))).toBe("110600");
  });
});
