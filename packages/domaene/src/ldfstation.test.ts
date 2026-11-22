import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "./fold.js";
import { ldfStationAn, ldfStationWert } from "./ldfstation.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc, ldfAus } from "./pruefhilfen/ereignisbau.js";

const anlage = einsatzAngelegt(hlc(Date.parse("2026-11-22T08:00:00Z"), 0, "a"), 1, { einsatzId: "X", name: "H", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-11-22T08:00:00Z", schichtmodell: "ZWEI_SCHICHT" });
const ausgang = anlageEreignis(hlc(Date.parse("2026-11-22T08:01:00Z"), 0, "a"), 2, "NachrichtVerfasst", { nachrichtId: "A1", richtung: "AUSGANG", anschrift: "OV", absender: "S4", betreff: "B", inhalt: "I" });

describe("LdF als Station ist der Standard (FOLD_VERSION 17)", () => {
  it("gilt ohne Parameter als an, nur ein ausdrückliches Nein schaltet ab", () => {
    expect(ldfStationWert(undefined)).toBe(true);
    expect(ldfStationWert(true)).toBe(true);
    expect(ldfStationWert(false)).toBe(false);
  });

  it("führt einen Ausgang ohne Parameter zum LdF, abgeschaltet vor die FmZ", () => {
    const ohne = materialisiere(falteHinzu(leereFaltung(), [anlage, ausgang]));
    expect(ldfStationAn(ohne)).toBe(true);
    expect(ohne.nachrichten?.["A1"]?.laufzustand).toBe("VOR_LDF");
    const aus = materialisiere(falteHinzu(leereFaltung(), [ldfAus(), anlage, ausgang]));
    expect(ldfStationAn(aus)).toBe(false);
    expect(aus.nachrichten?.["A1"]?.laufzustand).toBe("VOR_FMZ");
    const wieder = materialisiere(falteHinzu(leereFaltung(), [ldfAus(), anlage, ausgang, feldEreignis(hlc(Date.parse("2026-11-22T08:02:00Z"), 0, "a"), 3, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "ldfStation" }, false, true)]));
    expect(wieder.nachrichten?.["A1"]?.laufzustand).toBe("VOR_LDF");
  });
});
