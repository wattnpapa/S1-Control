/** Wer im Fernmeldebetrieb besetzt ist: LdF und Fernmelder (2026-11-21). */

import { describe, expect, it } from "vitest";

import { fernmelderBesetzt, ldfBesetzt } from "./ldfschritte.js";

describe("fernmelderBesetzt", () => {
  it("zählt FM1 bis FM3 und den Altwert FMZ, in der eigenen Sitzung oder bei einem lebenden Platz", () => {
    expect(fernmelderBesetzt(["FM3"], [])).toBe(true);
    expect(fernmelderBesetzt(["S2"], [{ veraltet: false, stellen: ["FM1"] }])).toBe(true);
    expect(fernmelderBesetzt(["S2"], [{ veraltet: false, stellen: ["FMZ"] }])).toBe(true);
  });

  it("zählt keinen veralteten Platz und keinen LdF als Fernmelder", () => {
    expect(fernmelderBesetzt(["LDF"], [{ veraltet: true, stellen: ["FM2"] }])).toBe(false);
    expect(fernmelderBesetzt(undefined, [])).toBe(false);
    expect(ldfBesetzt(["LDF"], [])).toBe(true);
  });
});
