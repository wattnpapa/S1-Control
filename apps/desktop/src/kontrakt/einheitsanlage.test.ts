/**
 * Die eine Bauweise der Anlage: frei und aus Vorlage ergeben dasselbe Ereignis.
 */

import { describe, expect, it } from "vitest";

import { vorlage } from "@s1/domaene";

import { anlageAusVorlage } from "./bedienschritte.js";
import { STATUS_VORBELEGUNG, einheitsanlage } from "./einheitsanlage.js";

describe("einheitsanlage", () => {
  it("baut ohne Vorlage ein EinheitGemeldet ohne vorlageId", () => {
    const entwurf = einheitsanlage({
      einheitId: "E1",
      abschnittId: "EO",
      bezeichnung: "  Pumpengruppe  ",
      organisation: "FEUERWEHR",
      ebene: "GRUPPE",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 },
      reihenfolge: 4,
      herkunft: " FF Musterstadt ",
    });
    expect(entwurf.typ).toBe("EinheitGemeldet");
    const nutzlast = entwurf.nutzlast as Record<string, unknown>;
    expect(nutzlast["bezeichnung"]).toBe("Pumpengruppe");
    expect(nutzlast["status"]).toBe(STATUS_VORBELEGUNG);
    expect(nutzlast["hierarchie"]).toEqual([{ art: "ORTSVERBAND", name: "FF Musterstadt" }]);
    expect("vorlageId" in nutzlast).toBe(false);
  });

  it("ergibt mit den Werten einer Vorlage dieselbe Nutzlast wie der Vorlagenweg, bis auf vorlageId", () => {
    const zsb = vorlage("kats-z-sb");
    expect(zsb).toBeDefined();
    if (zsb === undefined) return;
    const ausVorlage = anlageAusVorlage({ einheitId: "E1", abschnittId: "EO", vorlage: zsb, reihenfolge: 2, organisation: "JUH" });
    const frei = einheitsanlage({
      einheitId: "E1",
      abschnittId: "EO",
      bezeichnung: zsb.bezeichnung,
      organisation: "JUH",
      ebene: zsb.ebene,
      staerke: zsb.sollStaerke ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
      reihenfolge: 2,
    });
    const { vorlageId, ...rest } = ausVorlage.nutzlast as Record<string, unknown>;
    expect(vorlageId).toBe("kats-z-sb");
    expect(rest).toEqual(frei.nutzlast);
    expect(rest["organisation"]).toBe("JUH");
  });
});
