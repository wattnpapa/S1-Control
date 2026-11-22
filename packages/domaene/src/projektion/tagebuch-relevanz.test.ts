/** Tagebuchrelevanz und Nachtrag (Stab-Review ETB E1, E2). */

import { describe, expect, it } from "vitest";

import { KATALOG } from "../katalog/index.js";
import { trifftFilter, type Tagebuchzeile } from "./tagebuch.js";
import { NACHTRAG_MINUTEN, VERWALTUNGSSCHRITTE, istNachtrag } from "./tagebuch-relevanz.js";

const zeile = (typ: string): Tagebuchzeile => ({ typ, satz: "x", akteur: "a" }) as unknown as Tagebuchzeile;

describe("Nur Tagebuchrelevantes", () => {
  it("kennt nur Ereignisarten des Katalogs", () => {
    for (const typ of VERWALTUNGSSCHRITTE) expect(KATALOG.has(typ), typ).toBe(true);
  });

  it("blendet Zwischenschritte des Fernmeldebetriebs aus, Ein- und Ausgang, Sichtung und Beförderung nicht", () => {
    const filter = { nurTagebuchrelevant: true };
    for (const typ of ["NachrichtAngenommen", "NachrichtNachgewiesen", "NachrichtWeitergegeben", "NachrichtUebermittlungVorgeschlagen", "DienstpostenAngelegt"]) {
      expect(trifftFilter(zeile(typ), filter), typ).toBe(false);
    }
    for (const typ of ["EtbEintragErfasst", "StatusGesetzt", "AuftragErfasst", "NachrichtGesichtet", "NachrichtBefoerdert", "AnforderungAngelegt"]) {
      expect(trifftFilter(zeile(typ), filter), typ).toBe(true);
    }
    expect(trifftFilter(zeile("NachrichtAngenommen"), {})).toBe(true);
  });
});

describe("Nachtrag", () => {
  it(`gilt ab ${String(NACHTRAG_MINUTEN)} Minuten zwischen fachlicher Zeit und Erfassung`, () => {
    expect(istNachtrag("2026-11-22T17:05:00.000Z", "2026-11-22T17:27:18.000Z")).toBe(true);
    expect(istNachtrag("2026-11-22T17:20:00.000Z", "2026-11-22T17:27:18.000Z")).toBe(false);
    expect(istNachtrag(undefined, "2026-11-22T17:27:18.000Z")).toBe(false);
  });
});
