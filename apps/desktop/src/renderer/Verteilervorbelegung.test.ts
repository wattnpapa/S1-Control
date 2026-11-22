/**
 * Stab-Review S5-1: Eine Gesprächsnotiz verteilte den Gesprächspartner als
 * Stelle mit grüner Kopie („NDR 1 Niedersachsen (grün), Hr. Petersen (grün)“).
 */

import { describe, expect, it } from "vitest";

import { verteilerVorbelegung } from "./Verteilerraster.js";

describe("Der vorbelegte Verteiler", () => {
  it("nimmt bei der Gesprächsnotiz den Gesprächspartner nicht als Stelle, sondern S2 rot und die verfassende Stelle grün", () => {
    const verteiler = verteilerVorbelegung({ anschrift: "Radio X, Fr. Y", gespraechsnotiz: true, funktion: "S5", absender: "S5" });
    expect(verteiler.map((v) => v.stelle)).not.toContain("Radio X");
    expect(verteiler.map((v) => v.stelle)).not.toContain("Fr. Y");
    expect(verteiler).toEqual([
      { stelle: "S2", kopie: "ROT" },
      { stelle: "S5", kopie: "GRUEN" },
    ]);
  });

  it("nimmt bei der Gesprächsnotiz eine eigene Stelle als Gesprächspartner grün, einen Externen daneben nicht", () => {
    const verteiler = verteilerVorbelegung({ anschrift: "S4, Radio X", gespraechsnotiz: true, funktion: "S5", absender: "S5" });
    expect(verteiler).toEqual([
      { stelle: "S2", kopie: "ROT" },
      { stelle: "S4", kopie: "GRUEN" },
    ]);
  });

  it("belegt bei einer gewöhnlichen Nachricht weiter aus der Anschrift vor", () => {
    const verteiler = verteilerVorbelegung({ anschrift: "S3, S4", gespraechsnotiz: false });
    expect(verteiler.map((v) => `${v.stelle}:${v.kopie}`)).toEqual(["S2:ROT", "S3:GRUEN", "S4:GRUEN"]);
  });
});
