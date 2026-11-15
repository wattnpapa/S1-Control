import { describe, expect, it } from "vitest";

import { fahrzeugText, zeichenfarbeText } from "./fahrzeugzeile.js";

const GRUND = { id: "F1", typ: "Anh Ölwehr", bezeichnung: "", entfernt: false };

describe("fahrzeugText", () => {
  it("nennt Typ, Bezeichnung, Kennzeichen und Funkrufname wie bisher", () => {
    expect(
      fahrzeugText({ ...GRUND, typ: "MzKW", bezeichnung: "1. Gruppe", kennzeichen: "THW-81234", funkrufname: "Heros Oldenburg 22/51" }),
    ).toBe("MzKW — 1. Gruppe (THW-81234) · Heros Oldenburg 22/51");
  });

  it("hängt Sitzplätze und abweichende Zeichenfarbe an, wenn der Bogen sie nennt", () => {
    expect(fahrzeugText({ ...GRUND, kennzeichen: "WHV-HK 12", sitzplaetze: 7, zeichenfarbe: "KOMMUNAL" })).toBe(
      "Anh Ölwehr (WHV-HK 12) · 7 Sitzplätze · Zeichen orange (kommunal)",
    );
  });

  it("lässt beides weg, wo es fehlt", () => {
    expect(fahrzeugText(GRUND)).toBe("Anh Ölwehr");
  });
});

describe("zeichenfarbeText", () => {
  it("zeigt einen unbekannten Wert, statt ihn zu verschlucken", () => {
    expect(zeichenfarbeText("GRAU")).toBe("Zeichen grau");
    expect(zeichenfarbeText("#7")).toBe("Zeichenfarbe #7");
  });
});
