/**
 * Funkprobe und Schwelle „kein Kontakt" am echten Aktendienst (Funkplan F3).
 *
 * Geprüft wird, was nur der Worker weiß: der Pflichtgrund bei „kein Kontakt",
 * die Funkzeit nicht in der Zukunft, die Schwelle als ganze Zahl ab 1, die
 * Rücknahme ohne neuen Grund — und die Naht zum Renderer: `funkplanAnfordern`
 * mit Uhr, Schwelle, Zahlen und der Folge der Funkproben, die Suche darin und
 * die Spalte „Letzter Kontakt" der Ausgabe. Der Worker läuft mit der echten
 * Uhr; die Anlage der Einheit ist deshalb ihre jüngste Statusmeldung.
 */

import { afterEach, describe, expect, it } from "vitest";

import { funkprobe, funkSchwelleSetzen, rufgruppeAnlegen, rufgruppeDerEinheit } from "../kontrakt/funkschritte.js";
import { EINSATZ_ID, grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const ZIEL = { einheitId: "U1", rufgruppeId: "R1", rufgruppeAufgeloest: false } as const;

async function mitGruppe(): Promise<Platz> {
  const a = await werkstattMitEinemPlatz();
  await grundlage(a);
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_EA2" }));
  await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
  return a;
}

function vorMinuten(minuten: number): string {
  return new Date(Date.now() - minuten * 60_000).toISOString();
}

describe("Die Funkprobe im Worker", () => {
  it("schreibt „Kontakt“ über die Hauptrufgruppe und führt die Probe im Zustand", async () => {
    const a = await mitGruppe();
    const zeit = vorMinuten(1);
    expect((await a.dienst.bediene(funkprobe(ZIEL, "KONTAKT", zeit))).art).toBe("geschrieben");
    expect(a.dienst.zustand.einheiten["U1"]?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: zeit, rufgruppeId: "R1" });
  });

  it("verlangt bei „kein Kontakt“ einen Grund", async () => {
    const a = await mitGruppe();
    const ohne = await a.dienst.bediene(funkprobe(ZIEL, "KEIN_KONTAKT", vorMinuten(1), "  "));
    expect(ohne).toMatchObject({ art: "abgewiesen", meldung: expect.stringMatching(/Grund Pflicht/) });
    expect((await a.dienst.bediene(funkprobe(ZIEL, "KEIN_KONTAKT", vorMinuten(1), "keine Antwort"))).art).toBe("geschrieben");
    expect(a.dienst.zustand.einheiten["U1"]?.letzteFunkprobe?.KEIN_KONTAKT?.wert).toMatchObject({ grund: "keine Antwort" });
  });

  it("weist eine Funkzeit in der Zukunft und eine Probe ohne lesbare Zeit ab", async () => {
    const a = await mitGruppe();
    expect((await a.dienst.bediene(funkprobe(ZIEL, "KONTAKT", vorMinuten(-30)))).art).toBe("abgewiesen");
    const ohneZeit = await a.dienst.bediene({ typ: "FunkprobeDurchgefuehrt", nutzlast: { einheitId: "U1", ergebnis: "KONTAKT" }, vorher: null, neu: { zeitpunkt: "gestern" } });
    expect(ohneZeit.art).toBe("abgewiesen");
  });

  it("nimmt „kein Kontakt“ ohne neuen Grund zurück und leert das Feld", async () => {
    const a = await mitGruppe();
    await a.dienst.bediene(funkprobe(ZIEL, "KEIN_KONTAKT", vorMinuten(2), "Funkloch"));
    expect((await a.dienst.zurueck()).art).toBe("geschrieben");
    expect(a.dienst.zustand.einheiten["U1"]?.letzteFunkprobe?.KEIN_KONTAKT?.wert).toBeNull();
  });
});

describe("Die Schwelle „kein Kontakt“ im Worker", () => {
  it("nimmt nur ganze Zahlen ab 1 und rechnet den Plan damit", async () => {
    const a = await mitGruppe();
    for (const falsch of [0, 1.5, -10]) {
      expect((await a.dienst.bediene({ typ: "FunkParameterGesetzt", nutzlast: { einsatzId: EINSATZ_ID }, vorher: 60, neu: falsch })).art, String(falsch)).toBe("abgewiesen");
    }
    expect((await a.dienst.bediene({ typ: "FunkParameterGesetzt", nutzlast: { einsatzId: EINSATZ_ID }, vorher: 60, neu: "45" })).art).toBe("abgewiesen");
    const gesetzt = funkSchwelleSetzen(EINSATZ_ID, 60, 45);
    expect(gesetzt).toBeDefined();
    if (gesetzt === undefined) return;
    expect((await a.dienst.bediene(gesetzt)).art).toBe("geschrieben");
    expect(a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1" }).plan.schwelleMinuten).toBe(45);
  });
});

describe("Funkproben an der Naht zum Renderer", () => {
  it("liefert Uhr, Zahlen und die Folge der Funkproben, jüngste zuerst, und schneidet sie mit der Suche zu", async () => {
    const a = await mitGruppe();
    await a.dienst.bediene(funkprobe(ZIEL, "KEIN_KONTAKT", vorMinuten(20), "Funkloch Deich"));
    await a.dienst.bediene(funkprobe(ZIEL, "KONTAKT", vorMinuten(5)));
    const vorher = Date.now();
    const ansicht = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1" });
    expect(Date.parse(ansicht.jetzt)).toBeGreaterThanOrEqual(vorher - 1000);
    expect(ansicht.plan.zahlen.letzteFunkprobe).toBe(ansicht.funkproben[0]?.zeitpunkt);
    expect(ansicht.funkproben.map((z) => [z.ergebnis, z.rufgruppe, z.akteur])).toEqual([
      ["KONTAKT", "THW_OL_EA2", "Bediener 1"],
      ["KEIN_KONTAKT", "THW_OL_EA2", "Bediener 1"],
    ]);
    expect(ansicht.funkproben[1]?.grund).toBe("Funkloch Deich");
    // Die Anlage der Einheit ist hier die jüngste Statusmeldung: jünger als jede Probe.
    const teilnehmer = ansicht.plan.rufgruppen[0]?.teilnehmer[0];
    expect(teilnehmer?.letzterKontakt).toMatchObject({ art: "MELDUNG", ueberSchwelle: false });
    expect(teilnehmer?.letzteFunkproben?.KONTAKT?.rufgruppeId).toBe("R1");
    expect(teilnehmer?.keinKontaktGemeldet).toBeUndefined();
    const gesucht = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1", suche: "deich" });
    expect(gesucht.funkproben.map((z) => z.ergebnis)).toEqual(["KEIN_KONTAKT"]);
  });

  it("druckt den letzten Kontakt in der Ausgabe", async () => {
    const a = await mitGruppe();
    await a.dienst.bediene(funkprobe(ZIEL, "KONTAKT", vorMinuten(3)));
    const seite = a.dienst.ausgabeHtml("funkplan");
    expect(seite.html).toContain(">Letzter Kontakt</th>");
    expect(seite.html).toMatch(/<td>\d{4} Meldung<\/td><\/tr>/);
  });
});
