/**
 * Die Bedienschritte des Funkplans als reine Funktionen.
 *
 * Gemessen wird der Entwurf: welche Art, welcher Vorwert, ob geprüft wird —
 * und dass die Zelle im Blatt „Funkplan" denselben Entwurf baut wie die Zelle
 * der Einheitentabelle.
 */

import { describe, expect, it } from "vitest";

import { projektion } from "@s1/domaene";

import { inlineEntwurf } from "./bedienschritte.js";
import {
  rufgruppeAnlegen,
  rufgruppeAufgeloest,
  rufgruppeDerEinheit,
  rufgruppeGeaendert,
  rufgruppeWiederhergestellt,
  rufgruppenwahl,
} from "./funkschritte.js";
import { zEntwurf } from "./index.js";

describe("Die Bedienschritte des Funkplans", () => {
  it("legt eine Rufgruppe mit den angegebenen Feldern an", () => {
    const entwurf = rufgruppeAnlegen({ rufgruppeId: "RG-1", betriebsart: "DMO", name: "DMO 310", gateway: "Heros Varel 25/10" });
    expect(entwurf).toEqual({ typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: "RG-1", betriebsart: "DMO", name: "DMO 310", gateway: "Heros Varel 25/10" } });
    expect(zEntwurf.safeParse(entwurf).success).toBe(true);
  });

  it("ändert ein Feld mit gesehenem Vorwert und Prüfung", () => {
    expect(rufgruppeGeaendert("RG-1", "zweck", null, "Führung")).toEqual({
      typ: "RufgruppeGeaendert",
      nutzlast: { rufgruppeId: "RG-1", feld: "zweck" },
      vorher: null,
      neu: "Führung",
      vorwertPruefen: true,
    });
  });

  it("löst mit Grund auf und stellt wieder her", () => {
    expect(rufgruppeAufgeloest("RG-1", "Netz wieder da")).toMatchObject({ typ: "RufgruppeAufgeloest", neu: true, grund: "Netz wieder da" });
    expect(rufgruppeWiederhergestellt("RG-1")).toMatchObject({ typ: "RufgruppeWiederhergestellt", vorher: true, neu: false });
  });

  it("baut für die Rufgruppe der Einheit denselben Entwurf wie die Zelle der Einheitentabelle", () => {
    const spalte = projektion.spalte("rufgruppe");
    if (spalte === undefined) throw new Error("Spalte Rufgruppe fehlt");
    expect(rufgruppeDerEinheit("E1", "RG-1", "RG-2")).toEqual({ ...inlineEntwurf(spalte, "E1", "RG-1", "RG-2"), vorwertPruefen: true });
    expect(rufgruppeDerEinheit("E1", "RG-1", null)).toMatchObject({ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E1" }, neu: null });
  });

  it("macht aus einer Zellwahl Setzen, Leeren oder nichts", () => {
    expect(rufgruppenwahl("E1", undefined, "RG-1")).toMatchObject({ vorher: null, neu: "RG-1" });
    expect(rufgruppenwahl("E1", "RG-1", "")).toMatchObject({ vorher: "RG-1", neu: null });
    expect(rufgruppenwahl("E1", "RG-1", "RG-1")).toBeUndefined();
    expect(rufgruppenwahl("E1", undefined, "")).toBeUndefined();
  });
});
