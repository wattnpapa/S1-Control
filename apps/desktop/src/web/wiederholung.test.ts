/**
 * Der Wiederholungsspeicher: genau einmal ausführen, begrenzt im Gedächtnis.
 */

import { describe, expect, it } from "vitest";

import { Wiederholungsspeicher, anfrageId } from "./wiederholung.js";

const ID = "a1b2c3d4e5f6a7b8c9d0e1f2";

describe("anfrageId", () => {
  it("nimmt nur wohlgeformte IDs", () => {
    expect(anfrageId(ID)).toBe(ID);
    expect(anfrageId("kurz")).toBeUndefined();
    expect(anfrageId("mit Leerzeichen und Umlauten äöü 1234")).toBeUndefined();
    expect(anfrageId(undefined)).toBeUndefined();
    expect(anfrageId([ID])).toBeUndefined();
  });
});

describe("Wiederholungsspeicher", () => {
  it("legt bei Wiederholung nicht erneut an und liefert das erste Ergebnis", async () => {
    const speicher = new Wiederholungsspeicher();
    let angelegt = 0;
    const anlegen = async (): Promise<string> => `Einheit ${String(++angelegt)}`;
    expect(await speicher.fuehreAus("p1", ID, "bedienen", anlegen)).toBe("Einheit 1");
    expect(await speicher.fuehreAus("p1", ID, "bedienen", anlegen)).toBe("Einheit 1");
    expect(angelegt).toBe(1);
  });

  it("hängt eine Wiederholung an den noch laufenden Vorgang", async () => {
    const speicher = new Wiederholungsspeicher();
    let angelegt = 0;
    let fertig!: () => void;
    const tor = new Promise<void>((auf) => {
      fertig = auf;
    });
    const anlegen = async (): Promise<number> => {
      angelegt += 1;
      await tor;
      return angelegt;
    };
    const a = speicher.fuehreAus("p1", ID, "bedienen", anlegen);
    const b = speicher.fuehreAus("p1", ID, "bedienen", anlegen);
    fertig();
    expect(await Promise.all([a, b])).toEqual([1, 1]);
  });

  it("trennt Arbeitsplätze und Rufarten", async () => {
    const speicher = new Wiederholungsspeicher();
    let n = 0;
    const tue = async (): Promise<number> => ++n;
    await speicher.fuehreAus("p1", ID, "bedienen", tue);
    await speicher.fuehreAus("p2", ID, "bedienen", tue);
    await speicher.fuehreAus("p1", ID, "zurueck", tue);
    expect(n).toBe(3);
  });

  it("merkt sich einen Fehler nicht, damit die Wiederholung es erneut versucht", async () => {
    const speicher = new Wiederholungsspeicher();
    let n = 0;
    const tue = async (): Promise<number> => {
      n += 1;
      if (n === 1) throw new Error("kaputt");
      return n;
    };
    await expect(speicher.fuehreAus("p1", ID, "bedienen", tue)).rejects.toThrow("kaputt");
    expect(await speicher.fuehreAus("p1", ID, "bedienen", tue)).toBe(2);
  });

  it("vergisst nach Ablauf der Lebensdauer", async () => {
    let jetzt = 0;
    const speicher = new Wiederholungsspeicher({ lebensdauerMs: 1000, uhr: () => jetzt });
    let n = 0;
    const tue = async (): Promise<number> => ++n;
    await speicher.fuehreAus("p1", ID, "bedienen", tue);
    jetzt = 1500;
    await speicher.fuehreAus("p1", ID, "bedienen", tue);
    expect(n).toBe(2);
  });

  it("bleibt auf die Obergrenze begrenzt und verwirft die ältesten zuerst", async () => {
    const speicher = new Wiederholungsspeicher({ maxEintraege: 3 });
    let n = 0;
    const tue = async (): Promise<number> => ++n;
    for (let i = 0; i < 10; i += 1) {
      await speicher.fuehreAus("p1", `id${String(i).padStart(16, "0")}`, "bedienen", tue);
    }
    expect(speicher.groesse).toBeLessThanOrEqual(3);
    // Die jüngste ID ist noch bekannt, die älteste nicht mehr.
    await speicher.fuehreAus("p1", `id${String(9).padStart(16, "0")}`, "bedienen", tue);
    expect(n).toBe(10);
    await speicher.fuehreAus("p1", `id${String(0).padStart(16, "0")}`, "bedienen", tue);
    expect(n).toBe(11);
  });
});
