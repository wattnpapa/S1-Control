/**
 * Prüffälle zur Abkürzungsliste (M3.6).
 *
 * Sie halten den **Umfang** fest — dieselbe Absicht wie bei den bekannten
 * Wertebereichen in §3.7: Eine stille Änderung an einer Referenzliste soll
 * auffallen. Wer einen Eintrag ergänzt, ändert diese Zahl bewusst mit.
 */

import { describe, expect, it } from "vitest";

import { AKUELI, sucheAkueli } from "./akueli.js";

describe("die Abkürzungsliste", () => {
  it("führt die Einträge des Blatts „AküLi“", () => {
    expect(AKUELI).toHaveLength(124);
    expect(AKUELI.filter((eintrag) => eintrag.gruppe === "EINHEITEN")).toHaveLength(42);
    expect(AKUELI.filter((eintrag) => eintrag.gruppe === "FAHRZEUGE_UND_GERAETE")).toHaveLength(66);
    expect(AKUELI.filter((eintrag) => eintrag.gruppe === "NACHRICHTEN")).toHaveLength(16);
  });

  it("erklärt die Begriffe des Nachrichtenwegs mit je einem Satz (R2-FaBe P1-1, P1-2)", () => {
    const begriffe = ["FmZ", "Sichter", "LdF", "Nachweisung", "Laufzettel", "Handzeichen", "Vorrang", "Sofort", "Blitz", "Spruch", "Durchsage", "Gesprächsnotiz", "Kopiefarbe (rot/grün/blau)", "Datum-Zeit-Gruppe", "Übermittlungswunsch", "Abfassungszeit"];
    const nachrichten = AKUELI.filter((eintrag) => eintrag.gruppe === "NACHRICHTEN");
    expect(nachrichten.map((eintrag) => eintrag.kuerzel)).toEqual(begriffe);
    // Ein Satz: endet mit Punkt und enthält keinen zweiten.
    for (const eintrag of nachrichten) {
      expect(eintrag.bedeutung.endsWith(".")).toBe(true);
      expect(eintrag.bedeutung.slice(0, -1)).not.toMatch(/[a-zäöüß)][.!?]\s/u);
    }
    // Was der Fachberater vergeblich suchte, findet die Suche der Hilfe jetzt.
    for (const wort of ["fmz", "Sichter", "LdF", "Nachweisung", "Blitz", "Spruch"]) expect(sucheAkueli(wort).length).toBeGreaterThan(0);
  });

  it("vergibt jedes Kürzel je Gruppe nur einmal", () => {
    const schluessel = AKUELI.map((eintrag) => `${eintrag.gruppe}|${eintrag.kuerzel}`);
    expect(new Set(schluessel).size).toBe(schluessel.length);
  });

  it("führt zu jedem Kürzel eine Bedeutung", () => {
    expect(AKUELI.filter((eintrag) => eintrag.bedeutung.trim() === "")).toEqual([]);
  });

  it("übernimmt die Schreibweise der Excel unverändert", () => {
    // Einschliesslich ihrer Eigenheiten: Sie hier stillschweigend zu glätten
    // bräche den Vergleich mit der Referenzlage an einer Stelle, an der
    // niemand ihn sucht (Entscheidung 8 des Umsetzungsplans).
    expect(AKUELI.find((eintrag) => eintrag.kuerzel === "ELW 2")?.bedeutung).toBe("Einsatz Leit Wagen 2");
    expect(AKUELI.find((eintrag) => eintrag.kuerzel === "GE SFM")?.bedeutung).toBe(
      "Geräteeinheit Sandsackfüllmaschine (GE SFM)",
    );
  });
});

describe("sucheAkueli", () => {
  it("stellt Treffer im Kürzel vor Treffer in der Bedeutung", () => {
    const treffer = sucheAkueli("log");
    const ersterInBedeutung = treffer.findIndex(
      (eintrag) => !eintrag.kuerzel.toLocaleLowerCase("de-DE").includes("log"),
    );
    const letzterImKuerzel = treffer.reduce(
      (stelle, eintrag, nummer) =>
        eintrag.kuerzel.toLocaleLowerCase("de-DE").includes("log") ? nummer : stelle,
      -1,
    );
    // Ein Kürzel, das genau passt, ist fast immer das Gesuchte.
    expect(letzterImKuerzel).toBeLessThan(ersterInBedeutung === -1 ? treffer.length : ersterInBedeutung);
  });

  it("sucht ohne Rücksicht auf Groß- und Kleinschreibung", () => {
    expect(sucheAkueli("ZTR").some((eintrag) => eintrag.kuerzel === "ZTr")).toBe(true);
  });

  it("liefert ohne Suchtext die ganze Liste", () => {
    expect(sucheAkueli("   ")).toHaveLength(AKUELI.length);
  });

  it("liefert zu einem Wort ohne Treffer nichts", () => {
    expect(sucheAkueli("Kartoffelsalat")).toHaveLength(0);
  });
});
