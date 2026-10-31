import { describe, expect, it } from "vitest";

import { LEERE_ANFORDERUNG } from "./Anforderungsformular.js";
import { anforderungEingabeFehler } from "./anforderungseingabepruefung.js";

describe("Pflichtangaben einer Anforderung", () => {
  it("verlangt bei der Ablösung mehr als die vorbelegte Einheit", () => {
    const vorbelegt = { ...LEERE_ANFORDERUNG, abzuloesendeEinheitId: "E1" };
    expect(anforderungEingabeFehler(vorbelegt, true)).toMatch(/Bitte angeben/);
    expect(anforderungEingabeFehler({ ...vorbelegt, vorgeseheneEinheitText: "  " }, true)).toBeDefined();
    expect(anforderungEingabeFehler({ ...vorbelegt, vorgeseheneEinheitText: "BGr" }, true)).toBeUndefined();
    expect(anforderungEingabeFehler({ ...vorbelegt, kennung: "ANF-1" }, true)).toBeUndefined();
  });

  it("verlangt im Blatt irgendeine Angabe", () => {
    expect(anforderungEingabeFehler(LEERE_ANFORDERUNG, false)).toMatch(/Einheit, Kennung oder Auftrag/);
    expect(anforderungEingabeFehler({ ...LEERE_ANFORDERUNG, abzuloesendeEinheitId: "E1" }, false)).toBeUndefined();
  });
});
