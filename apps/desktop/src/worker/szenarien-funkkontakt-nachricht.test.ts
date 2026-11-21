/**
 * Funktionalität: Nachrichten als Kontakt im Funkplan — am echten Aktendienst.
 *
 * Ein Eingang, den die FmZ per Funk von einer Einheit aufnimmt, und ein
 * Ausgang, den sie per Funk an eine Einheit befördert, sind je ein Kontakt:
 * Der Funkplan zeigt danach den letzten Kontakt über die gewählte Rufgruppe.
 * Steht die Einheit ohne Rufgruppe, wird sie der gewählten zugeordnet; eine
 * schon zugeordnete Einheit wird nie umgesetzt. „Rückgängig“ nimmt Kontakt
 * und Zuordnung mit dem Nachrichtenschritt zurück.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Bedienergebnis } from "../kontrakt/index.js";
import { nachrichtAufnehmen, nachrichtBefoerdern } from "../kontrakt/fmzschritte.js";
import { rufgruppeAnlegen, rufgruppeAufgeloest, rufgruppeDerEinheit } from "../kontrakt/funkschritte.js";
import { nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const vorMinuten = (minuten: number): string => new Date(Date.now() - minuten * 60_000).toISOString();

async function fmzMitGruppen(): Promise<Platz> {
  const a = await werkstattMitEinemPlatz();
  await grundlage(a);
  a.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_EA1" }));
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R2", betriebsart: "TMO", name: "THW_OL_EA2" }));
  return a;
}

function eingang(zeitpunkt: string, teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "E-1",
    richtung: "EINGANG",
    anschrift: "Führungsstelle",
    betreff: "Lage Deich Nord",
    inhalt: "Deich hält.",
    absender: "Bergungsgruppe Oldenburg",
    gegenstelle: "Heros Oldenburg 22",
    aufnahme: { mittel: "FUNK", zeitpunkt, handzeichen: "Fm" },
    ...teile,
  };
}

function hinweise(ergebnis: Bedienergebnis): readonly string[] {
  return ergebnis.art === "geschrieben" ? (ergebnis.warnungen ?? []) : [];
}

function plan(a: Platz) {
  return a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1" }).plan;
}

describe("Funktionalität: Eingang und Ausgang als Kontakt im Funkplan", () => {
  it("Szenario: ein aufgenommener Eingang einer Einheit ohne Rufgruppe vermerkt den Kontakt und ordnet sie der gewählten Gruppe zu", async () => {
    const a = await fmzMitGruppen();
    expect(plan(a).ohneRufgruppe.map((t) => t.einheitId)).toContain("U1");
    const zeit = vorMinuten(1);
    const ergebnis = await a.dienst.bediene(nachrichtAufnehmen(eingang(zeit), { kontakt: { einheitId: "U1", rufgruppeId: "R2" } }));
    expect(ergebnis.art).toBe("geschrieben");
    const einheit = a.dienst.zustand.einheiten["U1"];
    expect(einheit?.rufgruppeId?.wert).toBe("R2");
    expect(einheit?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: zeit, rufgruppeId: "R2" });
    expect(hinweise(ergebnis)).toEqual(expect.arrayContaining(["Funkplan: „Bergungsgruppe Oldenburg“ der Rufgruppe „THW_OL_EA2“ zugeordnet.", "Funkplan: Kontakt mit „Bergungsgruppe Oldenburg“ vermerkt."]));
    const karte = plan(a).rufgruppen.find((r) => r.rufgruppeId === "R2");
    // Die Anlage der Einheit ist hier jünger als die Funkzeit; die Probe steht trotzdem am Teilnehmer.
    expect(karte?.teilnehmer[0]).toMatchObject({ einheitId: "U1", letzteFunkproben: { KONTAKT: { zeitpunkt: zeit, rufgruppeId: "R2" } } });
  });

  it("Szenario: eine schon zugeordnete Einheit bleibt auf ihrer Gruppe, der Kontakt trägt die gewählte", async () => {
    const a = await fmzMitGruppen();
    await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
    const zeit = vorMinuten(1);
    await a.dienst.bediene(nachrichtAufnehmen(eingang(zeit), { kontakt: { einheitId: "U1", rufgruppeId: "R2" } }));
    const einheit = a.dienst.zustand.einheiten["U1"];
    expect(einheit?.rufgruppeId?.wert).toBe("R1");
    expect(einheit?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: zeit, rufgruppeId: "R2" });
  });

  it("Szenario: steht die Einheit auf einer aufgelösten Gruppe, ordnet der Kontakt sie der gewählten zu", async () => {
    const a = await fmzMitGruppen();
    await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
    await a.dienst.bediene(rufgruppeAufgeloest("R1", "Kanal geräumt"));
    await a.dienst.bediene(nachrichtAufnehmen(eingang(vorMinuten(1)), { kontakt: { einheitId: "U1", rufgruppeId: "R2" } }));
    expect(a.dienst.zustand.einheiten["U1"]?.rufgruppeId?.wert).toBe("R2");
  });

  it("Szenario: ohne gewählte Gruppe trägt der Kontakt die Hauptrufgruppe und ordnet nichts zu", async () => {
    const a = await fmzMitGruppen();
    const zeit = vorMinuten(1);
    await a.dienst.bediene(nachrichtAufnehmen(eingang(zeit), { kontakt: { einheitId: "U1" } }));
    const einheit = a.dienst.zustand.einheiten["U1"];
    expect(einheit?.rufgruppeId?.wert ?? null).toBeNull();
    expect(einheit?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: zeit });
  });

  it("Szenario: ein Eingang ohne Kontaktangabe schreibt keinen Kontakt", async () => {
    const a = await fmzMitGruppen();
    await a.dienst.bediene(nachrichtAufnehmen(eingang(vorMinuten(1)), {}));
    expect(a.dienst.zustand.einheiten["U1"]?.letzteFunkprobe?.KONTAKT).toBeUndefined();
  });

  it("Szenario: die Beförderung an eine Einheit ohne Rufgruppe vermerkt Kontakt und Zuordnung", async () => {
    const a = await fmzMitGruppen();
    const anlage: Nachrichtenanlage = { nachrichtId: "A-1", richtung: "AUSGANG", anschrift: "Bergungsgruppe Oldenburg", betreff: "Auftrag", inhalt: "Sandsäcke an Deich Nord.", absender: "S3", abfassungszeit: vorMinuten(5) };
    await a.dienst.bediene(nachrichtVerfassen(anlage));
    const zeit = vorMinuten(1);
    const vermerk = { mittel: "FUNK", zeitpunkt: zeit, handzeichen: "Fm", gegenstelle: "Bergungsgruppe Oldenburg" };
    const ergebnis = await a.dienst.bediene(nachrichtBefoerdern("A-1", null, vermerk, { kontaktEinheitId: "U1", kontaktRufgruppeId: "R1", annahme: { zeitpunkt: zeit, handzeichen: "Fm" } }));
    expect(ergebnis.art).toBe("geschrieben");
    const einheit = a.dienst.zustand.einheiten["U1"];
    expect(einheit?.rufgruppeId?.wert).toBe("R1");
    expect(einheit?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: zeit, rufgruppeId: "R1" });
  });

  it("Szenario: Rückgängig nach dem Befördern nimmt Kontakt und Zuordnung mit zurück", async () => {
    const a = await fmzMitGruppen();
    await a.dienst.bediene(nachrichtVerfassen({ nachrichtId: "A-1", richtung: "AUSGANG", anschrift: "Bergungsgruppe Oldenburg", betreff: "Auftrag", inhalt: "Text", absender: "S3" }));
    const zeit = vorMinuten(1);
    const vermerk = { mittel: "FUNK", zeitpunkt: zeit, handzeichen: "Fm" };
    await a.dienst.bediene(nachrichtBefoerdern("A-1", null, vermerk, { kontaktEinheitId: "U1", kontaktRufgruppeId: "R1", annahme: { zeitpunkt: zeit, handzeichen: "Fm" } }));
    expect((await a.dienst.zurueck()).art).toBe("geschrieben");
    const einheit = a.dienst.zustand.einheiten["U1"];
    expect(einheit?.rufgruppeId?.wert ?? null).toBeNull();
    expect(einheit?.letzteFunkprobe?.KONTAKT?.wert ?? null).toBeNull();
  });
});
