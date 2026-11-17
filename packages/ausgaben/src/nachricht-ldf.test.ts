/**
 * Der Übermittlungsvorschlag des LdF im Vordruck und in der Nachweisung
 * (bestätigt am 2026-11-17, KONZEPT-NACHRICHTEN.md §5, §9): Feld 1 trägt das
 * vorgeschlagene Mittel, solange noch nicht befördert ist; Feld 20 nennt Mittel,
 * Fernmelder und Handzeichen des LdF, weil die Bibliothek kein eigenes Feld hat;
 * die Nachweisung trägt die Marke.
 */

import { describe, expect, it } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import { vordruckDatenAus, wegvermerkText, type Nachrichtendruck } from "./nachricht.js";
import { nachrichtendruckAus } from "./nachrichtendruck.js";
import { nachweisungMarken } from "./nachweisung.js";

const AUSGANG: Nachrichtendruck = {
  richtung: "AUSGANG",
  art: "SPRUCH",
  vorrang: "",
  gespraechsnotiz: false,
  uebermittlungswunsch: "FUNK",
  anschrift: "OV Wildeshausen",
  rufnummer: "",
  betreff: "Sandsäcke",
  inhalt: "500 Stück.",
  absender: "S4",
  abfassungszeit: "2026-11-17T09:45:00Z",
  zeichen: "Mü",
  funktion: "S4",
  gegenstelle: "",
  uebung: false,
};

const VORSCHLAG = { mittel: "KURIER", fernmelder: "Fm2", zeitpunkt: "2026-11-17T09:50:00Z", handzeichen: "Lf" };

describe("Der Weg des LdF im Vordruck", () => {
  it("füllt Feld 1 mit dem Vorschlag vor dem Wunsch und schreibt den Vermerk mit Handzeichen", () => {
    const daten = vordruckDatenAus({ ...AUSGANG, vorschlag: VORSCHLAG });
    expect(daten.uebermittlungsweg).toBe("kurier");
    expect(daten.vermerke).toBe("Weg (LdF): Kurier/Melder, durch Fm2, Hz. Lf");
  });

  it("das tatsächliche Mittel der Beförderung geht vor; Vermerke der Sichtung bleiben vorn", () => {
    const daten = vordruckDatenAus({
      ...AUSGANG,
      vorschlag: VORSCHLAG,
      befoerderung: { mittel: "TELEFON", zeitpunkt: "2026-11-17T09:55:00Z", handzeichen: "Fm" },
      sichtung: { zeitpunkt: "2026-11-17T09:55:00Z", handzeichen: "Fm", verteiler: [{ stelle: "S2", kopie: false }], vermerke: "Kopien nach Beförderung: rot S2" },
    });
    expect(daten.uebermittlungsweg).toBe("telefon");
    expect(daten.vermerke).toBe("Kopien nach Beförderung: rot S2 Weg (LdF): Kurier/Melder, durch Fm2, Hz. Lf");
  });

  it("ohne Vorschlag bleibt alles wie vorher", () => {
    expect(vordruckDatenAus(AUSGANG).vermerke).toBe("");
    expect(wegvermerkText(undefined)).toBe("");
  });
});

describe("Der Weg des LdF in Druckeingabe und Nachweisung", () => {
  const zeile = {
    id: "A-1",
    richtung: "AUSGANG",
    richtungKurz: "A",
    vorrangstufe: 2,
    gespraechsnotiz: false,
    nummerDoppelt: false,
    anschrift: "OV",
    betreff: "Sandsäcke",
    inhalt: "",
    absender: "S4",
    verteiler: [],
    laufzustand: "VOR_FMZ",
    zurueckgezogen: false,
    vorschlag: VORSCHLAG,
    fmzUeberSchwelle: false,
  } as unknown as Nachrichtenzeile;

  it("reicht den Vorschlag an den Vordruck weiter und markiert sie in der Nachweisung", () => {
    expect(nachrichtendruckAus(zeile, false).vorschlag).toEqual(VORSCHLAG);
    expect(nachweisungMarken(zeile)).toEqual([expect.stringMatching(/^Weg Kurier\/Melder durch Fm2 \(LdF \d{4} Lf\)$/u)]);
  });
});
