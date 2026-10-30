/**
 * Tests zu den Bedienschritten zwischen Anforderung und Einheit — die reine
 * Form der Entwürfe; die Wirkung steht in `szenarien-abloesung.test.ts`.
 */

import { describe, expect, it } from "vitest";

import { KATALOG } from "@s1/domaene";

import { abloesungNachtragen, anlageAusAnforderung } from "./anforderungsschritte.js";
import { anforderungErledigt } from "./bedienschritte.js";

describe("Einheit aus Anforderung", () => {
  const entwurf = anlageAusAnforderung({
    einheitId: "E9",
    abschnittId: "ANF",
    bezeichnung: "  BGr Varel ",
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    herkunft: "THW OV Varel",
    reihenfolge: 4,
  });

  it("ist ein EinheitGemeldet, das das Katalogschema annimmt", () => {
    expect(entwurf.typ).toBe("EinheitGemeldet");
    expect(KATALOG.get("EinheitGemeldet")?.schema.safeParse(entwurf.nutzlast).success).toBe(true);
  });

  it("trägt die Herkunft als Ortsverband und den Status „Angefordert“", () => {
    const nutzlast = entwurf.nutzlast as Record<string, unknown>;
    expect(nutzlast["bezeichnung"]).toBe("BGr Varel");
    expect(nutzlast["hierarchie"]).toEqual([{ art: "ORTSVERBAND", name: "THW OV Varel" }]);
    expect(nutzlast["status"]).toBe("ANGEFORDERT");
  });
});

describe("Eintreffen mit ablösender Einheit", () => {
  it("legt die Einheit in den Wert der Erledigung, nicht in ein neues Feld", () => {
    expect(anforderungErledigt("A1", "2026-10-30T10:00:00.000Z", "E9")).toEqual({
      typ: "AnforderungErledigt",
      nutzlast: { anforderungId: "A1" },
      vorher: null,
      neu: { erledigtAm: "2026-10-30T10:00:00.000Z", abloesendeEinheitId: "E9" },
    });
    expect(anforderungErledigt("A1", "2026-10-30T10:00:00.000Z").neu).toEqual({
      erledigtAm: "2026-10-30T10:00:00.000Z",
    });
  });

  it("trägt nach mit der geltenden Erledigung als vorher und behält die Eintreffzeit", () => {
    const nachtrag = abloesungNachtragen({ anforderungId: "A1", erledigtAm: "2026-10-30T10:00:00.000Z" }, "E9");
    expect(nachtrag.vorher).toEqual({ erledigtAm: "2026-10-30T10:00:00.000Z" });
    expect(nachtrag.neu).toEqual({ erledigtAm: "2026-10-30T10:00:00.000Z", abloesendeEinheitId: "E9" });
  });
});
