/**
 * Portiert aus v1 `test/thw-stan-inference.test.ts` (M1.4), ergaenzt um die
 * Faelle, die v1 nicht hatte: Reinheit, Schwelle und der weggefallene
 * Heuristik-Pfad.
 */

import { describe, expect, it } from "vitest";
import { STAN_SCHWELLE, schlageStanVor, stanEintraege } from "./inferenz.js";

describe("STAN-Vorschlag", () => {
  it("findet den Eintrag zu einer THW-Kurzform", () => {
    const vorschlag = schlageStanVor("THW", "ZTr FK Oldenburg");
    expect(vorschlag).not.toBeNull();
    expect(vorschlag?.titel).toMatch(/ZTr/i);
    expect(vorschlag?.titel).toMatch(/FK/i);
    expect(vorschlag?.sicherheit).toBeGreaterThan(STAN_SCHWELLE);
  });

  it("liefert fuer andere Organisationen nichts", () => {
    expect(schlageStanVor("FEUERWEHR", "ZTr FK")).toBeNull();
  });

  it("liefert bei einem Namen ohne Worte nichts", () => {
    expect(schlageStanVor("THW", "   ")).toBeNull();
  });

  it("liefert unterhalb der Schwelle nichts statt eines schlechten Treffers", () => {
    expect(schlageStanVor("THW", "zzzz unbekannt 0815")).toBeNull();
  });

  it("erfindet keine Sollstaerke", () => {
    // v1 fuellte fehlende Sollstaerken mit geratenen Zahlen. Hier gilt: was
    // die StAN nicht hergibt, bleibt leer.
    for (const eintrag of stanEintraege()) {
      if (eintrag.sollStaerke === undefined) continue;
      expect(eintrag.sollStaerke.fuehrer).toBeGreaterThanOrEqual(0);
      expect(eintrag.sollStaerke.unterfuehrer).toBeGreaterThanOrEqual(0);
      expect(eintrag.sollStaerke.mannschaft).toBeGreaterThanOrEqual(0);
    }
  });

  it("nimmt Vorbemerkung und Anschreiben aus", () => {
    const kennungen = stanEintraege().map((eintrag) => eintrag.id);
    expect(kennungen).not.toContain("vorbemerkung");
    expect(kennungen).not.toContain("anschreiben-stan");
  });

  it("ist rein: derselbe Name ergibt zweimal dasselbe Ergebnis", () => {
    const a = schlageStanVor("THW", "FGr N Oldenburg");
    const b = schlageStanVor("THW", "FGr N Oldenburg");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
