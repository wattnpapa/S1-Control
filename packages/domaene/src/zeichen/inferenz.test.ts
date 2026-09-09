/**
 * Portiert aus v1 `test/tactical-sign-inference.test.ts` und
 * `test/tactical-sign-fallback.test.ts` (M1.4).
 *
 * Die Faelle sind inhaltlich unveraendert; angepasst ist, was das Zielmodell
 * anders benennt: `typ` heisst `ebene` und traegt die Werte aus
 * Zieldatenmodell §2.8, die Herkunft heisst `herkunft` statt `meta`, und das
 * Rueckfallzeichen liefert SVG-Text statt einer Daten-URL.
 */

import { describe, expect, it } from "vitest";
import {
  REGEL_FASSUNG,
  alsBedienungUebernommen,
  listeZeichenkatalog,
  schlageZeichenVor,
} from "./inferenz.js";
import { organisationsKurzform, rueckfallEinheitSvg, rueckfallFahrzeugSvg } from "./rueckfall.js";

describe("Zeichen-Inferenz", () => {
  it("liefert zu einem bekannten Namen einen Vorschlag mit Herkunft", () => {
    const vorschlag = schlageZeichenVor("FK Oldenburg", "THW");
    expect(vorschlag.herkunft.quelle).toBe("vorschlag");
    expect(vorschlag.herkunft.rohname).toBe("FK Oldenburg");
    expect(vorschlag.herkunft.regelFassung).toBe(REGEL_FASSUNG);
    expect(vorschlag.zeichen.name).toBe("FK Oldenburg");
    expect(vorschlag.sicherheit).toBeGreaterThanOrEqual(0);
  });

  it("faellt bei zu geringer Sicherheit auf ein leeres Zeichen zurueck", () => {
    const vorschlag = schlageZeichenVor("zzzz unbekannt 0815", "THW");
    expect(vorschlag.zeichen.einheit).toBe("");
    expect(vorschlag.zeichen.ebene).toBe("UNBESTIMMT");
    expect(vorschlag.herkunft.quelle).toBe("vorschlag");
  });

  it("erkennt THW-Fachgruppen als GRUPPE", () => {
    const vorschlag = schlageZeichenVor("FGr BrB Oldenburg", "THW");
    expect(vorschlag.zeichen.einheit).toBe("BrB");
    expect(vorschlag.zeichen.ebene).toBe("GRUPPE");
    expect(vorschlag.herkunft.trefferBezeichnung).toContain("Brückenbau");
    expect(vorschlag.sicherheit).toBeGreaterThanOrEqual(0.6);
  });

  it("erkennt THW-Truppkuerzel als TRUPP", () => {
    const vorschlag = schlageZeichenVor("ESS 1", "THW");
    expect(vorschlag.zeichen.einheit).toBe("ESS");
    expect(vorschlag.zeichen.ebene).toBe("TRUPP");
  });

  it("erkennt den Zugtrupp als ZUGTRUPP", () => {
    const vorschlag = schlageZeichenVor("Ztr OV Oldenburg", "THW");
    expect(vorschlag.zeichen.einheit).toBe("Ztr");
    expect(vorschlag.zeichen.ebene).toBe("ZUGTRUPP");
  });

  it("erkennt den Technischen Zug mit Fachgruppe als ZUG", () => {
    const vorschlag = schlageZeichenVor("TZ-R Oldenburg", "THW");
    expect(vorschlag.zeichen.einheit).toBe("TZ-R");
    expect(vorschlag.zeichen.ebene).toBe("ZUG");
  });

  it("erkennt beide Fachzuege als ZUG", () => {
    const fk = schlageZeichenVor("FZ FK", "THW");
    expect(fk.zeichen.einheit).toBe("FZ-FK");
    expect(fk.zeichen.ebene).toBe("ZUG");

    const log = schlageZeichenVor("Fachzug Logistik", "THW");
    expect(log.zeichen.einheit).toBe("FZ-Log");
    expect(log.zeichen.ebene).toBe("ZUG");
  });

  it("wendet die THW-Sonderregeln nur beim THW an", () => {
    const thw = schlageZeichenVor("FGr BrB", "THW");
    const feuerwehr = schlageZeichenVor("FGr BrB", "FEUERWEHR");
    expect(thw.zeichen.einheit).toBe("BrB");
    expect(feuerwehr.zeichen.einheit).not.toBe("BrB");
  });

  it("listet den Katalog und filtert ihn", () => {
    const alle = listeZeichenkatalog("THW");
    const gefiltert = listeZeichenkatalog("FEUERWEHR", "großverband");
    expect(alle.length).toBeGreaterThan(0);
    expect(gefiltert.length).toBeGreaterThan(0);
    expect(
      gefiltert.every((eintrag) => eintrag.bezeichnung.toLowerCase().includes("großverband")),
    ).toBe(true);
  });

  it("setzt die Herkunft auf Bedienung und wirft die Trefferangaben weg", () => {
    const vorschlag = schlageZeichenVor("FGr BrB Oldenburg", "THW");
    expect(vorschlag.herkunft.trefferSchluessel).toBeDefined();

    const gewaehlt = alsBedienungUebernommen(vorschlag.zeichen, "FGr BrB Oldenburg");
    expect(gewaehlt.herkunft.quelle).toBe("bedienung");
    expect(gewaehlt.herkunft.sicherheit).toBeUndefined();
    expect(gewaehlt.herkunft.trefferSchluessel).toBeUndefined();
    expect(gewaehlt.zeichen.einheit).toBe("BrB");
  });

  it("ist rein: derselbe Name ergibt zweimal dasselbe Ergebnis", () => {
    const a = schlageZeichenVor("FGr BrB Oldenburg", "THW");
    const b = schlageZeichenVor("FGr BrB Oldenburg", "THW");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("Rueckfallzeichen", () => {
  it("baut ein Einheitenzeichen mit der Organisationskurzform", () => {
    const svg = rueckfallEinheitSvg("THW");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain(">THW<");
  });

  it("baut ein Fahrzeugzeichen mit Raedern", () => {
    const svg = rueckfallFahrzeugSvg("FEUERWEHR");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("<circle");
    expect(svg).toContain(">FW<");
  });

  it("faellt bei unbekannter Organisation auf ORG zurueck", () => {
    expect(organisationsKurzform("EINE_NEUE_ORG" as never)).toBe("ORG");
  });
});
