/**
 * Der Funkplan am echten Aktendienst (F1): Rufgruppe anlegen, Hauptrufgruppe
 * setzen und die Prüfung der Werte, die der Katalog nicht sieht (`neu`);
 * dazu die Naht zum Renderer: der Ruf `funkplanAnfordern` mit Zeigerstand und
 * Suche, die Ausgabe „Funkplan", die Auswahl der Tabellenzelle, die Sperre
 * einer Rufgruppe über die Präsenz und die Vorwert-Prüfung ihrer Felder.
 */

import { afterEach, describe, expect, it } from "vitest";

import { CODE_VORWERT, lagebildMit, zRuf, type Lagebild } from "../kontrakt/index.js";
import { rufgruppeAnlegen, rufgruppeDerEinheit, rufgruppeGeaendert } from "../kontrakt/funkschritte.js";
import { grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";
import { funkplanbereiche } from "./funkplanprojektion.js";

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

function lageVon(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}

async function mitZweiGruppen(a: Platz): Promise<void> {
  await grundlage(a);
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE", zweck: "Führung", reihenfolge: 1 }));
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R2", betriebsart: "DMO", name: "DMO 310", abschnittId: "EO", reihenfolge: 2 }));
}

describe("Der Funkplan an der Naht zum Renderer", () => {
  it("liefert den Plan mit Zeigerstand, Zahlen und Bereichen zur Wahl", async () => {
    const a = await werkstattMitEinemPlatz();
    await mitZweiGruppen(a);
    await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
    const ansicht = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1" });
    expect(ansicht.lageZeiger).toBeGreaterThan(0);
    expect(ansicht.plan.rufgruppen.map((r) => r.name)).toEqual(["THW_OL_FUE", "DMO 310"]);
    expect(ansicht.plan.rufgruppen[0]?.teilnehmer.map((t) => t.einheit)).toEqual(["Bergungsgruppe Oldenburg"]);
    expect(ansicht.plan.zahlen).toEqual({ rufgruppen: 2, zugeordnet: 1, ohneRufgruppe: 0, dmoOderGateway: 1 });
    expect(ansicht.bereiche).toEqual([{ abschnittId: "EO", name: "Deich Nord", tiefe: 0 }]);
    expect(funkplanbereiche(a.dienst.zustand).some((b) => b.abschnittId === "EINGANG")).toBe(false);
  });

  it("schneidet mit der Suche die Teilnehmer zu und lässt die Zahlen stehen", async () => {
    const a = await werkstattMitEinemPlatz();
    await mitZweiGruppen(a);
    await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
    const nichts = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1", suche: "Brake" });
    expect(nichts.plan.rufgruppen.flatMap((r) => r.teilnehmer)).toEqual([]);
    expect(nichts.plan.jeBereich).toEqual([]);
    expect(nichts.plan.zahlen.zugeordnet).toBe(1);
    // Die Rufgruppe ist ein Suchwort: Ihr Name findet alle ihre Teilnehmer.
    const gruppe = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1", suche: "fue" });
    expect(gruppe.plan.rufgruppen[0]?.teilnehmer).toHaveLength(1);
    expect(gruppe.plan.jeBereich[0]?.teilnehmer).toHaveLength(1);
    const einheit = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1", suche: "bergung" });
    expect(einheit.plan.rufgruppen[0]?.teilnehmer).toHaveLength(1);
  });

  it("nimmt den Ruf im Kontrakt an und begrenzt die Suche", () => {
    expect(zRuf.safeParse({ art: "funkplanAnfordern", akteId: "akte-1" }).success).toBe(true);
    expect(zRuf.safeParse({ art: "funkplanAnfordern", akteId: "akte-1", suche: "x".repeat(201) }).success).toBe(false);
    expect(zRuf.safeParse({ art: "ausgabeErzeugen", akteId: "akte-1", ausgabe: "funkplan", format: "html" }).success).toBe(true);
  });

  it("rendert den Funkplan als Ausgabe mit Führungsstelle, Ersteller und Dateiname im Fuß", async () => {
    const a = await werkstattMitEinemPlatz();
    await mitZweiGruppen(a);
    await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R2"));
    const seite = a.dienst.ausgabeHtml("funkplan");
    expect(seite.dateiname).toMatch(/^funkplan_/);
    expect(seite.html).toContain("Führungsstelle FueSt Oldenburg");
    expect(seite.html).toContain("DMO 310");
    expect(seite.html).toContain("Bergungsgruppe Oldenburg");
    expect(seite.html).toContain("Erstellt");
    expect(seite.html).toContain(seite.dateiname);
  });

  it("liefert der Einheitentabelle die Rufgruppen zur Auswahl, mit Betriebsart", async () => {
    const a = await werkstattMitEinemPlatz();
    await mitZweiGruppen(a);
    await a.dienst.bediene({ typ: "RufgruppeAufgeloest", nutzlast: { rufgruppeId: "R1" }, vorher: null, neu: true, grund: "aufgegangen" });
    const tabelle = a.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1" });
    expect(tabelle.auswahlwerte).toEqual({ rufgruppe: [{ wert: "R2", titel: "DMO 310", betriebsart: "DMO" }] });
  });

  it("schreibt die Zelle der Einheitentabelle und die des Blattes als dasselbe Ereignis", async () => {
    const a = await werkstattMitEinemPlatz();
    await mitZweiGruppen(a);
    expect((await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R2"))).art).toBe("geschrieben");
    expect(a.dienst.zustand.einheiten["U1"]?.rufgruppeId?.wert).toBe("R2");
  });
});

describe("Sperre und Vorwert der Rufgruppe zwischen zwei Arbeitsplätzen", () => {
  it("zeigt dem Kollegen die gesperrte Rufgruppe und nimmt sie mit der Freigabe zurück", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await mitZweiGruppen(a);
    await takteBis([a, b]);
    a.dienst.sperre("R1", false);
    await takteBis([a, b]);
    expect(lageVon(b)?.peers[0]?.bearbeitet).toEqual(["R1"]);
    a.dienst.sperre("R1", true);
    await takteBis([a, b]);
    expect(lageVon(b)?.peers[0]?.bearbeitet ?? []).toEqual([]);
  });

  it("weist eine Änderung ab, deren Vorwert ein anderer Arbeitsplatz inzwischen überschrieben hat", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await mitZweiGruppen(a);
    await takteBis([a, b]);
    expect((await a.dienst.bediene(rufgruppeGeaendert("R1", "zweck", "Führung", "Führung und Lage"))).art).toBe("geschrieben");
    await takteBis([a, b]);
    const ergebnis = await b.dienst.bediene(rufgruppeGeaendert("R1", "zweck", "Führung", "Führung Nord"));
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: CODE_VORWERT });
    expect(b.dienst.zustand.rufgruppen?.["R1"]?.zweck?.wert).toBe("Führung und Lage");
  });

  it("weist eine Hauptrufgruppe ab, die ein Kollege inzwischen anders gesetzt hat", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await mitZweiGruppen(a);
    await takteBis([a, b]);
    await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
    await takteBis([a, b]);
    const ergebnis = await b.dienst.bediene(rufgruppeDerEinheit("U1", null, "R2"));
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: CODE_VORWERT });
  });
});
