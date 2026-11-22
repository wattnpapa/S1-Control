/**
 * Die Ansichten des Monitors im Kontrakt (KONZEPT-S4.md §4, Funkplan F4).
 *
 * Die Liste legt die Tasten 1 bis 9 und 0 fest und ist nach Sachgebiet in
 * der Ordnung des Stabes geordnet. Die gemerkte Wahl steht als Name in den Einstellungen des
 * Geräts und übersteht deshalb das Umsortieren.
 */

import { describe, expect, it } from "vitest";

import { MONITOR_ANSICHTEN, MONITOR_GRUPPEN, MONITOR_GRUPPE_DER_ANSICHT, zEinstellungen, zLagebild } from "./index.js";

describe("Die Monitoransichten", () => {
  it("ordnet die Ansichten nach Stab: Führung, S1, S3, S4, S6, FmZ — jede Gruppe zusammenhängend", () => {
    const gruppen = MONITOR_ANSICHTEN.map((a) => MONITOR_GRUPPE_DER_ANSICHT[a]);
    const folge = gruppen.filter((g, i) => g !== gruppen[i - 1]);
    expect(folge).toEqual(MONITOR_GRUPPEN.filter((g) => gruppen.includes(g)));
    expect(new Set(folge).size).toBe(folge.length);
    expect(MONITOR_ANSICHTEN.slice(0, 2)).toEqual(["offen", "staerke"]);
  });

  it("nimmt eine Wechselgruppe additiv an und keine unbekannte", () => {
    const grund = { sharePfad: "/share", anzeigename: "Zelt" };
    expect(zEinstellungen.safeParse({ ...grund, monitor: { ansicht: "organisationen", wechsel: false } }).success).toBe(true);
    expect(zEinstellungen.safeParse({ ...grund, monitor: { ansicht: "tafel", wechsel: true, wechselgruppe: "s4" } }).success).toBe(true);
    expect(zEinstellungen.safeParse({ ...grund, monitor: { ansicht: "tafel", wechsel: true, wechselgruppe: "s2" } }).success).toBe(false);
  });

  it("nimmt den Funkplan als gemerkte Wahl an und keine unbekannte Ansicht", () => {
    const grund = { sharePfad: "/share", anzeigename: "Zelt" };
    expect(zEinstellungen.safeParse({ ...grund, monitor: { ansicht: "funkplan", wechsel: true } }).success).toBe(true);
    expect(zEinstellungen.safeParse({ ...grund, monitor: { ansicht: "karte", wechsel: true } }).success).toBe(false);
  });

  it("kennt das Lagebildfeld funk als additives Feld mit fünf Zahlen", () => {
    const funk = zLagebild.shape.funk;
    expect(funk.safeParse(undefined).success).toBe(true);
    expect(funk.safeParse({ rufgruppen: 6, zugeordnet: 40, ohneRufgruppe: 2, ohneKontakt: 1, letzteFunkprobe: "2026-09-10T14:31:00.000Z" }).success).toBe(true);
    expect(funk.safeParse({ rufgruppen: 6, zugeordnet: 40, ohneRufgruppe: 2 }).success).toBe(false);
  });
});
