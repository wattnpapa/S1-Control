/**
 * Der Funkplan am echten Aktendienst (F1): Rufgruppe anlegen, Hauptrufgruppe
 * setzen und die Prüfung der Werte, die der Katalog nicht sieht (`neu`).
 */

import { afterEach, describe, expect, it } from "vitest";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

describe("Der Funkplan im Worker", () => {
  it("legt eine Rufgruppe an, setzt sie an der Einheit und nimmt sie wieder weg", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const angelegt = await a.dienst.bediene({ typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE" } });
    expect(angelegt.art).toBe("geschrieben");
    expect((await a.dienst.bediene({ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "U1" }, vorher: null, neu: "R1" })).art).toBe("geschrieben");
    expect(a.dienst.zustand.einheiten["U1"]?.rufgruppeId?.wert).toBe("R1");
    expect((await a.dienst.bediene({ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "U1" }, vorher: "R1", neu: null })).art).toBe("geschrieben");
    expect(a.dienst.zustand.einheiten["U1"]?.rufgruppeId?.wert).toBeNull();
  });

  it("weist leere Namen, eine Reihenfolge als Text und eine Rufgruppe ohne Kennung ab", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    expect((await a.dienst.bediene({ typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: "R1", betriebsart: "TMO", name: "  " } })).art).toBe("abgewiesen");
    await a.dienst.bediene({ typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE" } });
    const name = await a.dienst.bediene({ typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId: "R1", feld: "name" }, vorher: "THW_OL_FUE", neu: "" });
    expect(name.art).toBe("abgewiesen");
    const reihe = await a.dienst.bediene({ typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId: "R1", feld: "reihenfolge" }, vorher: null, neu: "zwei" });
    expect(reihe.art).toBe("abgewiesen");
    const einheit = await a.dienst.bediene({ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "U1" }, vorher: null, neu: 7 });
    expect(einheit.art).toBe("abgewiesen");
    const zweck = await a.dienst.bediene({ typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId: "R1", feld: "zweck" }, vorher: null, neu: "Führung" });
    expect(zweck.art).toBe("geschrieben");
  });

  it("verlangt für das Auflösen einen Grund", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    await a.dienst.bediene({ typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: "R1", betriebsart: "DMO", name: "DMO 310" } });
    expect((await a.dienst.bediene({ typ: "RufgruppeAufgeloest", nutzlast: { rufgruppeId: "R1" }, vorher: null, neu: true })).art).toBe("abgewiesen");
    expect((await a.dienst.bediene({ typ: "RufgruppeAufgeloest", nutzlast: { rufgruppeId: "R1" }, vorher: null, neu: true, grund: "Netz wieder da" })).art).toBe("geschrieben");
    expect(a.dienst.zustand.rufgruppen?.["R1"]?.aufgeloest?.wert).toBe(true);
  });
});
