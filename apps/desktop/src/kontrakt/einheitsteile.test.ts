/**
 * Prüffälle zu den Bedienschritten an Auftrag, Fahrzeug und Person.
 *
 * Gemessen wird die Regel: welches Ereignis eine Handlung schreibt, mit
 * welchem `vorher`, und dass die Nutzlast das Schema des Katalogs **erfüllt**
 * — eine Maske, deren Entwurf der Aktendienst abweist, wäre ein Knopf ohne
 * Wirkung. Die Wirkung selbst messen die Szenarien im Worker.
 */

import { describe, expect, it } from "vitest";

import { KATALOG } from "@s1/domaene";

import {
  auftragBeenden,
  auftragErfassen,
  auftragZuruecknehmen,
  fahrzeugAnlegen,
  fahrzeugEntfernen,
  fahrzeugWiederherstellen,
  listeAusEingabe,
  personEntfernen,
  personHinzufuegen,
  personWiederherstellen,
} from "./einheitsteile.js";
import type { Entwurf } from "./index.js";

function schemaGilt(entwurf: Entwurf): void {
  const eintrag = KATALOG.get(entwurf.typ);
  expect(eintrag).toBeDefined();
  const ergebnis = eintrag?.schema.safeParse(entwurf.nutzlast);
  expect(ergebnis?.success, JSON.stringify(ergebnis?.error?.issues)).toBe(true);
}

describe("Aufträge", () => {
  it("erfasst einen Auftrag als Form (b) mit Quelle MANUELL", () => {
    const entwurf = auftragErfassen({
      auftragId: "A-1",
      einheitId: "U1",
      text: "  Deich sichern ",
      von: "2026-10-30T13:30:00.000Z",
    });
    schemaGilt(entwurf);
    expect(entwurf.vorher).toBeUndefined();
    expect(entwurf.neu).toBeUndefined();
    expect(entwurf.nutzlast).toEqual({
      auftragId: "A-1",
      einheitId: "U1",
      von: "2026-10-30T13:30:00.000Z",
      text: "Deich sichern",
      quelle: "MANUELL",
    });
  });

  it("setzt beim Beenden das Ende und trägt das gesehene Ende als vorher", () => {
    const entwurf = auftragBeenden("A-1", undefined, "2026-10-30T15:00:00.000Z");
    schemaGilt(entwurf);
    expect(entwurf).toMatchObject({ typ: "AuftragBeendet", vorher: null, neu: "2026-10-30T15:00:00.000Z" });
  });

  it("nimmt einen Auftrag zurück, mit Grund nur, wenn einer gegeben ist", () => {
    expect(auftragZuruecknehmen("A-1", "  ")).not.toHaveProperty("grund");
    const entwurf = auftragZuruecknehmen("A-1", "doppelt erfasst");
    schemaGilt(entwurf);
    expect(entwurf).toMatchObject({ typ: "AuftragZurueckgenommen", neu: true, grund: "doppelt erfasst" });
  });
});

describe("Fahrzeuge", () => {
  it("legt ein Fahrzeug an und lässt leere optionale Felder weg (§2.3)", () => {
    const entwurf = fahrzeugAnlegen({
      fahrzeugId: "F-1",
      einheitId: "U1",
      typ: "GKW",
      bezeichnung: " ",
      kennzeichen: "THW-84123",
      status: "EINSATZBEREIT",
    });
    schemaGilt(entwurf);
    expect(entwurf.nutzlast).toEqual({
      fahrzeugId: "F-1",
      einheitId: "U1",
      typ: "GKW",
      kennzeichen: "THW-84123",
      status: "EINSATZBEREIT",
    });
  });

  it("entfernt mit Grund und stellt mit dem gesehenen Stand wieder her", () => {
    const weg = fahrzeugEntfernen("F-1", " defekt ");
    schemaGilt(weg);
    expect(weg).toMatchObject({ typ: "FahrzeugEntfernt", vorher: null, neu: true, grund: "defekt" });
    const zurueck = fahrzeugWiederherstellen("F-1");
    schemaGilt(zurueck);
    expect(zurueck).toMatchObject({ typ: "FahrzeugWiederhergestellt", vorher: true, neu: false });
  });
});

describe("Personen", () => {
  it("fügt eine Person mit den Pflichtfeldern des Schemas hinzu", () => {
    const entwurf = personHinzufuegen({
      personId: "P-1",
      einheitId: "U1",
      vorname: "Anna",
      nachname: "Muster",
      rolle: "UNTERFUEHRER",
      funktionen: "Kraftfahrer, Sprechfunker,",
      geschlecht: "WEIBLICH",
      ernaehrung: "VEGAN",
    });
    schemaGilt(entwurf);
    expect(entwurf.nutzlast).toMatchObject({
      funktionen: ["Kraftfahrer", "Sprechfunker"],
      fahrerlaubnisse: [],
      kontakte: [],
      zusatzqualifikationen: [],
    });
  });

  it("entfernt mit Grund und stellt wieder her", () => {
    schemaGilt(personEntfernen("P-1", "abgereist"));
    expect(personEntfernen("P-1", "abgereist").grund).toBe("abgereist");
    expect(personWiederherstellen("P-1")).toMatchObject({ vorher: true, neu: false });
  });

  it("liest eine Liste aus Komma oder Semikolon", () => {
    expect(listeAusEingabe(" a; b ,, c ")).toEqual(["a", "b", "c"]);
    expect(listeAusEingabe("")).toEqual([]);
  });
});
