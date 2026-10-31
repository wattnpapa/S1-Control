/**
 * Das Wiederöffnen des zuletzt geöffneten Einsatzes nach einem Reload.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { ladeMerker, speichereMerker } from "./sitzung.js";
import { wiederoeffneZuletzt } from "./wiederoeffnen.js";

const UMGEBUNG = { plattform: "web", electron: "", programmversion: "0", rechnername: "r", clientId: "c" };
const EINSTELLUNGEN = { sharePfad: "/share", anzeigename: "FüSt", betriebsart: "fuehrungsstelle" } as const;
const EINSATZ = { ordner: "2026-10-31_uebung_abc123", name: "Übung", datum: "2026-10-31" };

let attrappe: Attrappe;

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  attrappe = baueAttrappe();
  useLaden.setState({
    akteId: undefined,
    lagebild: undefined,
    umgebung: UMGEBUNG,
    einstellungen: EINSTELLUNGEN,
    einsaetze: [EINSATZ],
    fehler: undefined,
    hinweise: [],
  });
});

function hinweistexte(): string[] {
  return useLaden.getState().hinweise.map((h) => h.text);
}

describe("wiederoeffneZuletzt", () => {
  it("öffnet den gemerkten Einsatz, wenn er noch existiert", async () => {
    speichereMerker(EINSATZ.ordner, "tagebuch");
    attrappe.antwortet("einsatzOeffnen", { akteId: "akte-9", einsatzId: EINSATZ.ordner, ordner: EINSATZ.ordner });
    expect(await wiederoeffneZuletzt()).toBe(true);
    expect(attrappe.letzterRuf("einsatzOeffnen")?.ordner).toBe(EINSATZ.ordner);
    expect(useLaden.getState().akteId).toBe("akte-9");
    expect(hinweistexte()).toEqual([]);
  });

  it("tut nichts ohne Merker (nach ausdrücklichem Zurück)", async () => {
    expect(await wiederoeffneZuletzt()).toBe(false);
    expect(attrappe.rufeDerArt("einsatzOeffnen")).toHaveLength(0);
    expect(useLaden.getState().akteId).toBeUndefined();
  });

  it("zeigt die Liste mit Hinweis und vergisst den Merker, wenn der Einsatz fehlt", async () => {
    speichereMerker("2026-01-01_weg_000000", "lage");
    expect(await wiederoeffneZuletzt()).toBe(false);
    expect(hinweistexte()[0]).toContain("Einsatz konnte nicht wieder geöffnet werden: ");
    expect(hinweistexte()[0]).toContain("existiert nicht mehr");
    expect(ladeMerker()).toBeUndefined();
  });

  it("meldet den Grund und behält den Merker, wenn die Akte nicht aufgeht", async () => {
    speichereMerker(EINSATZ.ordner, "lage");
    attrappe.scheitert("einsatzOeffnen", "Der Share antwortet nicht.");
    expect(await wiederoeffneZuletzt()).toBe(false);
    expect(hinweistexte()).toEqual(["Einsatz konnte nicht wieder geöffnet werden: Der Share antwortet nicht."]);
    expect(useLaden.getState().fehler).toBeUndefined();
    expect(ladeMerker()?.ordner).toBe(EINSATZ.ordner);
  });

  it("meldet, wenn der Dienst gar nicht erreichbar war", async () => {
    speichereMerker(EINSATZ.ordner, "lage");
    useLaden.setState({ umgebung: undefined, fehler: "Der Dienst antwortet nicht." });
    expect(await wiederoeffneZuletzt()).toBe(false);
    expect(hinweistexte()[0]).toContain("Der Dienst antwortet nicht.");
    expect(ladeMerker()?.ordner).toBe(EINSATZ.ordner);
  });
});
