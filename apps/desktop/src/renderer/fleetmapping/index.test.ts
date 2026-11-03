import { describe, expect, it } from "vitest";

import { fleetmapEintrag, ordnertext, sucheRufgruppen } from "./index.js";

describe("Fleetmapping der TMO-Rufgruppen", () => {
  it("findet den Namen genau wie im Fleetmapping und kennt seinen Ordner", () => {
    const eintrag = fleetmapEintrag("T_BC-GBIB-1");
    expect(eintrag?.kurzwahl).toBe(56);
    expect(eintrag && ordnertext(eintrag)).toBe("T_LV BW › Biberach");
    expect(eintrag?.laender).toHaveLength(5);
  });

  it("kennt abweichende Namen nicht — sie bleiben Freitext", () => {
    expect(fleetmapEintrag("Meine Gruppe")).toBeUndefined();
    expect(sucheRufgruppen("zzzzqq")).toEqual([]);
  });

  it("sucht ohne Beachtung von Groß-/Kleinschreibung und Trennern", () => {
    expect(sucheRufgruppen("t bund 01")[0]?.name).toBe("T_BUND-01");
    expect(sucheRufgruppen("t_bund-01")[0]?.name).toBe("T_BUND-01");
  });

  it("stellt genaue Treffer vor Anfangstreffer und diese vor Teiltreffer", () => {
    const namen = sucheRufgruppen("T_BUND-01").map((e) => e.name);
    expect(namen[0]).toBe("T_BUND-01");
  });

  it("liefert bei leerem Text nichts und begrenzt die Zahl", () => {
    expect(sucheRufgruppen("   ")).toEqual([]);
    expect(sucheRufgruppen("T_", 5)).toHaveLength(5);
  });

  it("zeigt Zusatzgruppen mit ihrem Landesverband, die nicht in allen Übersichten stehen", () => {
    const eintrag = fleetmapEintrag("HB_AS_1_Anruf");
    expect(eintrag?.laender).toEqual(["HBNI"]);
  });
});
