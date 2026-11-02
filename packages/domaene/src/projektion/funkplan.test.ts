/**
 * Prüffälle zum Funkplan (KONZEPT-FUNKPLAN.md §3 und §5) und zum
 * Funkrufnamen der Einheit (K31).
 *
 * Gemessen wird die Projektion: Wer im Plan steht, wer ohne Rufgruppe
 * gezählt wird, wann „Bereich ≠ Gruppe" erscheint, wie die Zeilen je Bereich
 * stehen und welcher Funkrufname gilt.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { funkrufnameDerEinheit } from "../kennzahlen.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import type { EinheitZustand, Zustand } from "../zustand.js";
import { HINWEIS_BEREICH_ABWEICHEND, funkplan } from "./funkplan.js";

let n = 0;
function h(): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, "a");
}

function einheit(einheitId: string, abschnittId: string, bezeichnung: string, status = "IM_EINSATZ"): EingehendesEreignis {
  return einheitGemeldet(h(), n, { einheitId, abschnittId, bezeichnung, organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 8), personalErfassung: "NUR_STAERKE", status });
}

function rufgruppe(rufgruppeId: string, name: string, weiteres: Record<string, unknown> = {}): EingehendesEreignis {
  return anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId, betriebsart: "TMO", name, ...weiteres });
}

function setze(einheitId: string, rufgruppeId: string | null): EingehendesEreignis {
  return feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId }, null, rufgruppeId);
}

function fahrzeug(fahrzeugId: string, einheitId: string, funkrufname?: Record<string, unknown>): EingehendesEreignis {
  return anlageEreignis(h(), n, "FahrzeugAngelegt", { fahrzeugId, einheitId, typ: "GKW", status: "EINSATZBEREIT", ...(funkrufname === undefined ? {} : { funkrufname }) });
}

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1 Deich Nord", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1a", name: "EA 1a Siel", abschnittstyp: "EINSATZORT", reihenfolge: 1, parentId: "EA1" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA2", name: "EA 2 Pumpen", abschnittstyp: "EINSATZORT", reihenfolge: 2 }),
    abschnittAngelegt(h(), n, { abschnittId: "ANG", name: "Angefordert", abschnittstyp: "ANGEFORDERT", reihenfolge: 9 }),
    einheit("E1", "EA1", "B 1 Oldenburg"),
    einheit("E2", "EA1a", "FGr N Brake"),
    einheit("E3", "EA2", "FGr WP Varel"),
    einheit("E4", "ANG", "FGr E Cloppenburg", "ANGEFORDERT"),
    einheit("E5", "EA2", "SEG JUH", "RUHE"),
    rufgruppe("R1", "THW_OL_FUE", { zweck: "Führung", hoert: "FmZ Platz 1", reihenfolge: 1 }),
    rufgruppe("R2", "THW_OL_EA1", { abschnittId: "EA1", reihenfolge: 2 }),
    rufgruppe("R3", "DMO 310", { betriebsart: "DMO", reihenfolge: 3 }),
  ];
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

describe("Der Funkplan je Rufgruppe", () => {
  it("ordnet die Einheiten ihrer Hauptrufgruppe zu und führt den Rest ohne Rufgruppe", () => {
    const basis = grundlage();
    const plan = funkplan(zustand([...basis, setze("E1", "R2"), setze("E2", "R2"), setze("E3", "R1")]));
    expect(plan.rufgruppen.map((r) => r.name)).toEqual(["THW_OL_FUE", "THW_OL_EA1", "DMO 310"]);
    expect(plan.rufgruppen[0]).toMatchObject({ betriebsart: "TMO", zweck: "Führung", hoert: "FmZ Platz 1", aufgeloest: false });
    expect(plan.rufgruppen[1]?.teilnehmer.map((t) => t.einheit)).toEqual(["B 1 Oldenburg", "FGr N Brake"]);
    expect(plan.rufgruppen[1]).toMatchObject({ abschnittId: "EA1", bereich: "EA 1 Deich Nord" });
    expect(plan.rufgruppen[2]?.teilnehmer).toEqual([]);
    // Ruhende und angeforderte stehen im Plan; sie müssen erreichbar sein.
    expect(plan.ohneRufgruppe.map((t) => t.einheitId)).toEqual(["E5", "E4"]);
    expect(plan.ohneRufgruppe.find((t) => t.einheitId === "E4")?.erwartet).toBe(true);
    expect(plan.zahlen).toEqual({ rufgruppen: 3, zugeordnet: 3, ohneRufgruppe: 2, dmoOderGateway: 1 });
  });

  it("lässt eine aufgelöste Gruppe ohne Teilnehmer am Ende stehen; ihre Einheiten zählen als ohne Rufgruppe", () => {
    const basis = grundlage();
    const aufl = feldEreignis(h(), n, "RufgruppeAufgeloest", { rufgruppeId: "R1" }, null, true, "abgeschaltet");
    const plan = funkplan(zustand([...basis, setze("E3", "R1"), aufl]));
    const letzte = plan.rufgruppen.at(-1);
    expect(letzte).toMatchObject({ name: "THW_OL_FUE", aufgeloest: true, teilnehmer: [] });
    expect(typeof letzte?.aufgeloestAm).toBe("string");
    const e3 = plan.ohneRufgruppe.find((t) => t.einheitId === "E3");
    expect(e3).toMatchObject({ rufgruppeId: "R1", rufgruppe: "THW_OL_FUE", rufgruppeAufgeloest: true });
    expect(plan.zahlen.rufgruppen).toBe(2);
    expect(plan.zahlen.ohneRufgruppe).toBe(5);
  });

  it("führt eine Einheit, deren Rufgruppe auf null gesetzt oder unbekannt ist, als ohne", () => {
    const basis = grundlage();
    const plan = funkplan(zustand([...basis, setze("E1", "R1"), setze("E1", null), setze("E3", "R9")]));
    expect(plan.ohneRufgruppe.map((t) => t.einheitId)).toContain("E1");
    expect(plan.ohneRufgruppe.find((t) => t.einheitId === "E3")).toMatchObject({ rufgruppeId: "R9", rufgruppe: "R9", rufgruppeAufgeloest: false });
  });

  it("nimmt entfernte und beendete Einheiten aus dem Plan", () => {
    const basis = grundlage();
    const entfernt = feldEreignis(h(), n, "EinheitEntfernt", { einheitId: "E5" }, false, true, "doppelt");
    const rueck = feldEreignis(h(), n, "StatusGesetzt", { einheitId: "E3" }, "IM_EINSATZ", "RUECKMARSCH");
    const plan = funkplan(zustand([...basis, entfernt, rueck]));
    const ids = plan.ohneRufgruppe.map((t) => t.einheitId);
    expect(ids).not.toContain("E5");
    expect(ids).not.toContain("E3");
  });

  it("zeigt „Bereich ≠ Gruppe“, wenn der wirksame Bereich weder der Bereich der Gruppe noch ein Unterabschnitt ist", () => {
    const basis = grundlage();
    const plan = funkplan(zustand([...basis, setze("E1", "R2"), setze("E2", "R2"), setze("E3", "R2"), setze("E5", "R1")]));
    const r2 = plan.rufgruppen.find((r) => r.rufgruppeId === "R2");
    const hinweis = Object.fromEntries((r2?.teilnehmer ?? []).map((t) => [t.einheitId, t.hinweis]));
    expect(hinweis).toEqual({ E1: "", E2: "", E3: HINWEIS_BEREICH_ABWEICHEND });
    expect(r2?.teilnehmer.find((t) => t.einheitId === "E3")?.bereichWeichtAb).toBe(true);
    // Eine Gruppe ohne Bereichsbezug kennt keine Abweichung.
    expect(plan.rufgruppen[0]?.teilnehmer[0]?.bereichWeichtAb).toBe(false);
  });

  it("verschiebt eine Einheit nicht mit, sondern zeigt die Abweichung", () => {
    const basis = grundlage();
    const verschoben = feldEreignis(h(), n, "EinheitVerschoben", { einheitId: "E1" }, "EA1", "EA2");
    const plan = funkplan(zustand([...basis, setze("E1", "R2"), verschoben]));
    const e1 = plan.rufgruppen.find((r) => r.rufgruppeId === "R2")?.teilnehmer[0];
    expect(e1).toMatchObject({ einheitId: "E1", bereich: "EA 2 Pumpen", hinweis: HINWEIS_BEREICH_ABWEICHEND });
  });
});

describe("Der Funkplan je Bereich", () => {
  it("gruppiert dieselben Zeilen nach wirksamem Bereich in der Ordnung des Abschnittsbaums", () => {
    const basis = grundlage();
    const plan = funkplan(zustand([...basis, setze("E1", "R2"), setze("E3", "R1")]));
    expect(plan.jeBereich.map((b) => b.name)).toEqual(["EA 1 Deich Nord", "EA 1a Siel", "EA 2 Pumpen", "Angefordert"]);
    const ea2 = plan.jeBereich.find((b) => b.abschnittId === "EA2");
    expect(ea2?.teilnehmer.map((t) => [t.einheit, t.rufgruppe ?? "—"])).toEqual([
      ["FGr WP Varel", "THW_OL_FUE"],
      ["SEG JUH", "—"],
    ]);
  });

  it("ist leer, wenn es keine Einheiten gibt, und zählt dann null", () => {
    const basis = grundlage();
    const plan = funkplan(zustand(basis.filter((e) => e.typ !== "EinheitGemeldet")));
    expect(plan.jeBereich).toEqual([]);
    expect(plan.zahlen).toEqual({ rufgruppen: 3, zugeordnet: 0, ohneRufgruppe: 0, dmoOderGateway: 1 });
  });

  it("zählt eine Gruppe mit Gateway mit", () => {
    const basis = grundlage();
    const gateway = feldEreignis(h(), n, "RufgruppeGeaendert", { rufgruppeId: "R2", feld: "gateway" }, null, "Heros Varel 25/10");
    expect(funkplan(zustand([...basis, gateway])).zahlen.dmoOderGateway).toBe(2);
  });
});

describe("K31 — der Funkrufname der Einheit", () => {
  const name = (z: Zustand, id: string): string => funkrufnameDerEinheit(z, z.einheiten[id] as EinheitZustand);
  const heros = (ort: string, ...teile: number[]): Record<string, unknown> => ({ kennwort: "Heros", eigenerStandort: true, ort, teile });

  it("nimmt das erste Fahrzeug mit Funkrufnamen in der Reihenfolge der Untertabelle", () => {
    const basis = grundlage();
    const z = zustand([...basis, fahrzeug("F2", "E1", heros("Oldenburg", 21, 52)), fahrzeug("F1", "E1"), fahrzeug("F3", "E1", heros("Oldenburg", 21, 53))]);
    expect(name(z, "E1")).toBe("Heros Oldenburg 21/52");
  });

  it("lässt ein entferntes Fahrzeug aus", () => {
    const basis = grundlage();
    const z = zustand([
      ...basis,
      fahrzeug("F1", "E1", heros("Oldenburg", 21, 51)),
      fahrzeug("F2", "E1", heros("Oldenburg", 21, 52)),
      feldEreignis(h(), n, "FahrzeugEntfernt", { fahrzeugId: "F1" }, false, true, "abgezogen"),
    ]);
    expect(name(z, "E1")).toBe("Heros Oldenburg 21/52");
  });

  it("gibt dem Override Vorrang und ist ohne beides leer", () => {
    const basis = grundlage();
    const override = feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkrufnameOverride" }, null, "Heros Delmenhorst 22/10");
    const z = zustand([...basis, fahrzeug("F1", "E1", heros("Oldenburg", 21, 51)), override]);
    expect(name(z, "E1")).toBe("Heros Delmenhorst 22/10");
    expect(name(z, "E3")).toBe("");
    const plan = funkplan(z);
    expect(plan.ohneRufgruppe.find((t) => t.einheitId === "E1")?.funkrufname).toBe("Heros Delmenhorst 22/10");
  });

  it("fällt auf das Fahrzeug zurück, wenn der Override geleert wird", () => {
    const basis = grundlage();
    const override = feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkrufnameOverride" }, null, "Heros Delmenhorst 22/10");
    const leer = feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkrufnameOverride" }, "Heros Delmenhorst 22/10", null);
    const z = zustand([...basis, fahrzeug("F1", "E1", heros("Oldenburg", 21, 51)), override, leer]);
    expect(name(z, "E1")).toBe("Heros Oldenburg 21/51");
  });
});
