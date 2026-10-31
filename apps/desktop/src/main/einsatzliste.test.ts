/**
 * Hilfen der Einsatzliste: letzte Änderung, Ordnung, Doppelnamen.
 */

import { describe, expect, it } from "vitest";

import type { Dateisystem } from "@s1/speicher";

import { gibtEsDenEinsatz, letzteAenderung, ordneEinsaetze } from "./einsatzliste.js";

const dateisystem = (dateien: readonly string[], wirft = false): Dateisystem =>
  ({
    listeVerzeichnis: async () => {
      if (wirft) throw new Error("SMB hängt");
      return dateien;
    },
  }) as unknown as Dateisystem;

describe("letzteAenderung", () => {
  it("nimmt die jüngste Zeit über Anker und Ereignisdateien", async () => {
    const zeiten: Record<string, number> = { "/e/einsatz.json": 1000, "/e/ereignisse/a": 5000, "/e/ereignisse/b": 3000 };
    const ergebnis = await letzteAenderung(dateisystem(["a", "b"]), "/e", async (pfad) => zeiten[pfad]);
    expect(ergebnis).toBe(new Date(5000).toISOString());
  });

  it("verträgt einen hängenden Ereignisordner und fehlende Zeiten", async () => {
    expect(await letzteAenderung(dateisystem([], true), "/e", async () => undefined)).toBeUndefined();
    expect(await letzteAenderung(dateisystem([], true), "/e", async (p) => (p.endsWith("einsatz.json") ? 7 : undefined))).toBe(
      new Date(7).toISOString(),
    );
  });
});

describe("Ordnung und Doppelnamen", () => {
  it("ordnet die zuletzt geänderten zuerst, ohne Zeit nach Datum", () => {
    const liste = ordneEinsaetze([
      { ordner: "a", name: "A", datum: "2026-01-01", geaendert: "2026-10-01T10:00:00.000Z" },
      { ordner: "b", name: "B", datum: "2026-09-30" },
      { ordner: "c", name: "C", datum: "2026-01-02", geaendert: "2026-10-02T10:00:00.000Z" },
    ]);
    expect(liste.map((e) => e.ordner)).toEqual(["c", "a", "b"]);
  });

  it("erkennt denselben Namen am selben Tag unabhängig von Groß-/Kleinschreibung", () => {
    const liste = [{ ordner: "x", name: "Hochwasser Süd", datum: "2026-10-31" }];
    expect(gibtEsDenEinsatz(liste, "2026-10-31", "hochwasser SÜD")).toBe(true);
    expect(gibtEsDenEinsatz(liste, "2026-11-01", "Hochwasser Süd")).toBe(false);
  });
});
