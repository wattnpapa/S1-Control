/**
 * Die Ansichten des Monitors im Kontrakt (KONZEPT-S4.md §4, Funkplan F4).
 *
 * Die Liste legt die Tasten 1 bis 6 fest, und die gemerkte Wahl steht als
 * Name in den Einstellungen des Geräts. Neues kommt deshalb nur hinten dazu.
 */

import { describe, expect, it } from "vitest";

import { MONITOR_ANSICHTEN, zEinstellungen, zLagebild } from "./index.js";

describe("Die Monitoransichten", () => {
  it("hängt den Funkplan als sechste an und lässt die fünf aus S4 an ihrer Taste", () => {
    expect(MONITOR_ANSICHTEN).toEqual(["staerke", "verpflegung", "vorausschau", "unterbringung", "tafel", "funkplan"]);
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
