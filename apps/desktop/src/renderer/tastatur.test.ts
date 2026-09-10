/**
 * Prüffälle zur Tastenkarte (M3.6).
 *
 * Sie messen die Regel, nicht den Hörer: Welcher Druck welche Handlung
 * auslöst, ist die Aussage, an der die Bedienbarkeit hängt. Das Ein- und
 * Aushängen prüft die Maske, die den Haken benutzt.
 */

import { describe, expect, it } from "vitest";

import { KUERZEL, findeKuerzel, kuerzel, kuerzelText, passt } from "./tastatur.js";

describe("die Tastenkarte", () => {
  it("vergibt jeden Namen und jede Tastenkombination nur einmal", () => {
    const namen = KUERZEL.map((eintrag) => eintrag.name);
    expect(new Set(namen).size).toBe(namen.length);
    const kombinationen = KUERZEL.map(
      (eintrag) => `${String(eintrag.strg)}-${String(eintrag.umschalt)}-${eintrag.taste}`,
    );
    expect(new Set(kombinationen).size).toBe(kombinationen.length);
  });

  it("hält die Buchstaben der Excel fest", () => {
    // Bestandsaufnahme `excel-domaenenmodell.md` §2: Strg+N einfügen, Strg+E
    // entfernen, Strg+M verschieben, Strg+D „jetzt“, Strg+Q EEB, Strg+H
    // Abkürzungsliste. Wer die Excel bedient, hat sie in den Fingern.
    expect(kuerzel("anlegen")?.taste).toBe("n");
    expect(kuerzel("entfernen")?.taste).toBe("e");
    expect(kuerzel("verschieben")?.taste).toBe("m");
    expect(kuerzel("jetzt")?.taste).toBe("d");
    expect(kuerzel("eeb")?.taste).toBe("q");
    expect(kuerzel("hilfe")?.taste).toBe("h");
  });

  it("belegt Strg+A nicht", () => {
    // In der Excel öffnet Strg+A die Eingabemaske; im Browser markiert es
    // alles. Ein Kürzel, das eine so tief verankerte Bedienung überschreibt,
    // kostet mehr, als es einbringt.
    expect(KUERZEL.find((eintrag) => eintrag.taste === "a")).toBeUndefined();
  });

  it("schreibt Kürzel so, wie sie in der Hilfe stehen", () => {
    expect(kuerzelText(kuerzel("anlegen") as never)).toBe("Strg+N");
    expect(kuerzelText(kuerzel("bestaetigen") as never)).toBe("Enter");
    expect(kuerzelText(kuerzel("abbrechen") as never)).toBe("Escape");
  });
});

describe("passt", () => {
  const anlegen = kuerzel("anlegen") as never;

  it("nimmt die Befehlstaste wie Strg an", () => {
    // Entscheidung 13: macOS ist die Entwicklungsplattform. Ein Kürzel, das
    // dort nicht greift, fällt nie auf.
    expect(passt(anlegen, { key: "n", ctrlKey: true })).toBe(true);
    expect(passt(anlegen, { key: "n", metaKey: true })).toBe(true);
  });

  it("verlangt die Umschalttaste genau dort, wo das Kürzel sie führt", () => {
    expect(passt(anlegen, { key: "n", ctrlKey: true, shiftKey: true })).toBe(false);
    expect(passt(anlegen, { key: "n" })).toBe(false);
  });

  it("weicht der dritten Belegungsebene aus", () => {
    // Alt+Strg ist auf deutschen Tastaturen AltGr; wer sie drückt, meint ein
    // Zeichen und keine Handlung.
    expect(passt(anlegen, { key: "n", ctrlKey: true, altKey: true })).toBe(false);
  });

  it("unterscheidet Groß- und Kleinschreibung nicht", () => {
    expect(passt(anlegen, { key: "N", ctrlKey: true })).toBe(true);
  });
});

describe("findeKuerzel", () => {
  it("lässt im Eingabefeld nur die Kürzel gelten, die dorthin gehören", () => {
    // Wer „neuer Abschnitt“ tippt, will beim `n` kein neues Formular.
    expect(findeKuerzel({ key: "n", ctrlKey: true }, true)).toBeUndefined();
    expect(findeKuerzel({ key: "n", ctrlKey: true }, false)?.name).toBe("anlegen");
    // Strg+D ist gerade für das Feld gedacht, in dem der Cursor steht.
    expect(findeKuerzel({ key: "d", ctrlKey: true }, true)?.name).toBe("jetzt");
    expect(findeKuerzel({ key: "Escape" }, true)?.name).toBe("abbrechen");
    expect(findeKuerzel({ key: "Enter" }, true)?.name).toBe("bestaetigen");
  });

  it("findet zu einem unbelegten Druck nichts", () => {
    expect(findeKuerzel({ key: "y", ctrlKey: true }, false)).toBeUndefined();
  });
});
