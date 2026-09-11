/**
 * Die Führungsharke — Beschriftung und Aufteilung (Option 3a).
 */

import { describe, expect, it } from "vitest";

import type { Baumknoten } from "@s1/domaene";

import {
  harkenbild,
  istEinrichtung,
  knotenbreite,
  kurzform,
  langform,
  stummel,
  zeichenkennung,
} from "./harke.js";

function knoten(id: string, typ: string): Baumknoten {
  return {
    id,
    name: id,
    typ,
    reihenfolge: 1,
    tiefe: 0,
    eigeneStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
    summenStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
    einheiten: 0,
    einheitenSumme: 0,
    zaehlt: true,
    systemAbschnitt: false,
    kinder: [],
  } as Baumknoten;
}

describe("kurzform", () => {
  it("unterscheidet Einsatzabschnitt und Untereinsatzabschnitt an der Tiefe", () => {
    // Derselbe Typ, zwei Zeichen: Das ist der Grund, aus dem die Beschriftung
    // nicht in der SVG-Datei stehen kann — die trägt festen Text.
    expect(kurzform("EINSATZORT", 0)).toBe("EAL");
    expect(kurzform("EINSATZORT", 1)).toBe("UEAL");
    expect(kurzform("EINSATZORT", 2)).toBe("UEAL");
  });

  it("kennt die übrigen Typen", () => {
    expect(kurzform("FUEHRUNGSSTELLE", 0)).toBe("TEL");
    expect(kurzform("MELDEKOPF", 0)).toBe("MK");
    expect(kurzform("BEREITSTELLUNGSRAUM", 0)).toBe("BR");
    expect(langform("EINSATZORT", 1)).toBe("Untereinsatzabschnittsleitung");
  });
});

describe("harkenbild", () => {
  it("trennt die Einrichtungen von der Führung und lässt die Systemabschnitte weg", () => {
    const bild = harkenbild([
      knoten("EA1", "EINSATZORT"),
      knoten("MK", "MELDEKOPF"),
      knoten("BR", "BEREITSTELLUNGSRAUM"),
      knoten("ARCHIV", "ARCHIV"),
      // Der Eingang gehört nicht in die Führungsorganisation (§5.3.3).
      knoten("EINGANG", "EINGANG"),
    ]);
    expect(bild.fuehrung.map((k) => k.id)).toEqual(["EA1"]);
    expect(bild.einrichtungen.map((k) => k.id)).toEqual(["MK", "BR"]);
    expect(istEinrichtung("LOGISTIK")).toBe(true);
    expect(istEinrichtung("EINSATZORT")).toBe(false);
  });
});

describe("Maße", () => {
  it("staffelt Knotenbreite und Stummel nach Ebene (Entwurf)", () => {
    expect([knotenbreite(0), knotenbreite(1), knotenbreite(2)]).toEqual([196, 176, 118]);
    expect([stummel(0), stummel(1), stummel(2)]).toEqual([20, 16, 14]);
  });
});

describe("zeichenkennung", () => {
  it("kennt für den Eingang kein Zeichen", () => {
    // §5.3.3: Der Eingang ist keine Führungsstelle und keine Einrichtung; er
    // braucht kein taktisches Zeichen.
    expect(zeichenkennung("EINGANG", 0)).toBeUndefined();
    expect(zeichenkennung("EINGANG", 1)).toBeUndefined();
  });

  it("wählt die Datei nach Typ und Tiefe", () => {
    // Die Dateien tragen ihren Text fest — deshalb zwei verschiedene für
    // denselben Typ auf zwei Ebenen.
    expect(zeichenkennung("EINSATZORT", 0)).toBe("Führungsstellen/EAL");
    expect(zeichenkennung("EINSATZORT", 1)).toBe("Führungsstellen/UEAL");
    expect(zeichenkennung("FUEHRUNGSSTELLE", 0)).toBe("Führungsstellen/TEL");
    expect(zeichenkennung("MELDEKOPF", 0)).toBe("Einrichtungen/Meldekopf");
  });

  it("sagt nichts, wo der Satz nichts hat", () => {
    // `undefined` ist kein Fehler: Die Ansicht zeichnet dann die Kurzform als
    // Text — sichtbar fehlend statt stillschweigend falsch.
    expect(zeichenkennung("ANGEFORDERT", 0)).toBeUndefined();
  });
});
