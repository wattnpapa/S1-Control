/** Die Arbeitsplätze der FmZ (Stab-Review LdF-A1, Fm-A1). */

import { describe, expect, it } from "vitest";

import { fmzPlaetze, hoertPlatz } from "./fmzplaetze.js";
import type { Nachrichtenzeile } from "./nachrichtenzeile.js";

const zeile = (teil: Partial<Nachrichtenzeile>): Nachrichtenzeile => ({ id: "N", zurueckgezogen: false, ...teil }) as unknown as Nachrichtenzeile;
const vorschlag = (fernmelder: string, zeitpunkt: string) => ({ mittel: "FUNK", fernmelder, zeitpunkt, handzeichen: "Lf" });

describe("Die Arbeitsplätze der FmZ", () => {
  it("nennt je Platz Besetzung, offene Zuteilungen und abgehörte Rufgruppen", () => {
    const plaetze = fmzPlaetze({
      praesenz: [
        { anzeigename: "Yilmaz", stellen: ["FM1"], handzeichen: "Yi", wanduhr: "2026-11-22T10:00:00.000Z", veraltet: false },
        { anzeigename: "Alt", stellen: ["FM2"], veraltet: true },
        { anzeigename: "Becker", stellen: ["LDF"], veraltet: false },
      ],
      zeilen: [
        zeile({ id: "A1", vorschlag: vorschlag("Fm1", "2026-11-22T09:50:00.000Z") }),
        zeile({ id: "A2", vorschlag: vorschlag("Fm1", "2026-11-22T09:40:00.000Z"), annahme: { zeitpunkt: "x", handzeichen: "Yi" } as never }),
        zeile({ id: "A3", vorschlag: vorschlag("Fm1", "2026-11-22T09:00:00.000Z"), befoerderung: { mittel: "FUNK", zeitpunkt: "x", handzeichen: "Yi" } }),
        zeile({ id: "A4", vorschlag: vorschlag("Fm2", "2026-11-22T09:30:00.000Z"), zurueckgezogen: true }),
      ],
      rufgruppen: [{ name: "TMO 1", hoert: "Fm1, LdF" }, { name: "DMO 5", hoert: "Fm 2" }, { name: "Analog 12" }],
    });
    expect(plaetze.map((p) => p.name)).toEqual(["LdF", "Sichter", "Fm1", "Fm2", "Fm3"]);
    const fm1 = plaetze.find((p) => p.stelle === "FM1");
    expect(fm1).toMatchObject({ zugeteilt: 2, angenommen: 1, aeltesteSeit: "2026-11-22T09:40:00.000Z", rufgruppen: ["TMO 1"] });
    expect(fm1?.besetzt).toEqual([{ anzeigename: "Yilmaz", handzeichen: "Yi", zuletzt: "2026-11-22T10:00:00.000Z" }]);
    // Fm2: der Platz ist fortgegangen, die Rufgruppe hört er trotzdem.
    expect(plaetze.find((p) => p.stelle === "FM2")).toMatchObject({ besetzt: [], zugeteilt: 0, rufgruppen: ["DMO 5"] });
    expect(plaetze.find((p) => p.stelle === "LDF")?.rufgruppen).toEqual(["TMO 1"]);
  });

  it("liest „hört“ als Wort: Fm1 nicht in Fm12", () => {
    expect(hoertPlatz("Fm12", "Fm1")).toBe(false);
    expect(hoertPlatz("hört fm 1 und LdF", "Fm1")).toBe(true);
    expect(hoertPlatz(undefined, "Fm1")).toBe(false);
  });
});
