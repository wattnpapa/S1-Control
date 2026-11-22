import { describe, expect, it } from "vitest";

import { FERNMELDER_STANDARD, NACHRICHT_STELLEN } from "./ereignis.js";
import { FERNMELDERSTELLEN, eigeneFernmelder, fernmeldername, hatFernmelderstelle, istFernmelderstelle, istZugeteilt } from "./fernmelderstellen.js";
import { stellenWort } from "./projektion/tagebuch-nachrichten.js";

describe("Fernmelder als eigene Stellen", () => {
  it("kennt FM1 bis FM3 und den Altwert FMZ als Fernmelder, sonst nichts", () => {
    expect(FERNMELDERSTELLEN.every(istFernmelderstelle)).toBe(true);
    expect(istFernmelderstelle("FMZ")).toBe(true);
    expect(["LDF", "SICHTER", "S2", "FM4", "fm1"].some(istFernmelderstelle)).toBe(false);
    expect(hatFernmelderstelle(["S4", "FM2"])).toBe(true);
    expect(hatFernmelderstelle(["LDF"])).toBe(false);
    expect(hatFernmelderstelle(undefined)).toBe(false);
  });

  it("stehen in der Liste der Stellen, ihr Wort ist der Name der Zuteilung", () => {
    for (const stelle of FERNMELDERSTELLEN) expect(NACHRICHT_STELLEN).toContain(stelle);
    expect(FERNMELDERSTELLEN.map((s) => fernmeldername(s))).toEqual([...FERNMELDER_STANDARD]);
    expect(FERNMELDERSTELLEN.map(stellenWort)).toEqual([...FERNMELDER_STANDARD]);
    expect(fernmeldername("FMZ")).toBeUndefined();
  });

  it("erkennt die eigene Zuteilung ohne Groß- und Kleinschreibung; FMZ bekommt keine", () => {
    expect(eigeneFernmelder(["S1", "FM3", "FM1"])).toEqual(["Fm3", "Fm1"]);
    expect(istZugeteilt("Fm2", ["FM2"])).toBe(true);
    expect(istZugeteilt(" fm2 ", ["FM2"])).toBe(true);
    expect(istZugeteilt("Fm1", ["FM2"])).toBe(false);
    expect(istZugeteilt("Fm1", ["FMZ"])).toBe(false);
    expect(istZugeteilt(undefined, ["FM1"])).toBe(false);
    expect(istZugeteilt("", ["FM1"])).toBe(false);
  });
});

describe("Offen für den Verfasser (Review 2026-11-21)", () => {
  it("bleibt offen, bis die grüne Kopie zurück ist, und erkennt „Leiter“ als Stelle LEITER", async () => {
    const { offenFuerStellen } = await import("./projektion/nachrichtenoffen.js");
    const basis = { zurueckgezogen: false, richtung: "AUSGANG", gespraechsnotiz: false, absender: "Leiter", funktion: "Leiter", verteiler: [], laufzustand: "VOR_SICHTER", befoerderung: { mittel: "FUNK", zeitpunkt: "2026-11-21T09:00:00.000Z", handzeichen: "Ka" }, nummer: 1 } as never;
    expect(offenFuerStellen(basis, ["LEITER"])).toBe(true);
    const zurueck = { ...(basis as object), laufzustand: "VERTEILT", verteiler: [{ stelle: "LEITER", kopie: "GRUEN", gelesen: true, erledigt: false, eigenerAusgang: true }] } as never;
    expect(offenFuerStellen(zurueck, ["LEITER"])).toBe(false);
  });
});
