/**
 * Schnitt N3 in `@s1/ausgaben` (KONZEPT-NACHRICHTEN.md §7, Entscheidungen 4
 * und 9): der Entwurf der Maske auf dem Vordruck, der Dateiname des
 * Ausdrucks, der leere Vordruck und der Teileinstieg für die Vorschau.
 */

import { describe, expect, it } from "vitest";

import { entwurfsdruck, leererNachrichtenvordruckPdf, nachrichtendateiname, vordruckDatenAus, type Nachrichtenentwurf } from "./index.js";
import * as vordruck from "./vordruck.js";

const ENTWURF: Nachrichtenentwurf = {
  richtung: "EINGANG",
  art: "SPRUCH",
  vorrang: "",
  gespraechsnotiz: false,
  uebermittlungswunsch: "",
  anschrift: "FüSt Oldenburg",
  rufnummer: "",
  betreff: "Pumpen eingetroffen",
  inhalt: "Zwei Pumpen.",
  absender: "OV Wildeshausen",
  zeichen: "Mü",
  funktion: "S 4",
  abfassungszeit: "2026-11-17T09:45:00Z",
  aufnahme: { mittel: "TELEFON", zeitpunkt: "2026-11-17T09:50:00Z", handzeichen: "Fm" },
  gegenstelle: "Heros Jever",
  nummer: " 26 ",
  sichtung: { zeitpunkt: "2026-11-17T10:00:00Z", handzeichen: "Si", verteiler: [{ stelle: "S4", kopie: false }], vermerke: "" },
};

describe("Der Entwurf auf dem Vordruck (Vorschau)", () => {
  it("füllt dieselben Felder wie der Druck einer Zeile", () => {
    const daten = vordruckDatenAus(entwurfsdruck(ENTWURF, false));
    expect(daten.richtung).toBe("eingang");
    expect(daten.nummer).toBe("26");
    expect(daten.uebermittlungsweg).toBe("telefon");
    expect(daten.aufnahmevermerk).toEqual({ datum: "17", uhrzeit: "1050", handzeichen: "Fm" });
    expect(daten.empfaenger).toEqual(["Heros Jever"]);
    expect(daten.abfassungszeit).toBe("171045nov26");
    expect(daten.weitereAnkreuzfelder).toEqual(["verteilerS4Spalte1"]);
  });

  it("lässt ohne lesbare Abfassungszeit und ohne Nummer die Felder leer", () => {
    const ohne: Nachrichtenentwurf = { ...ENTWURF, abfassungszeit: undefined, nummer: "" } as unknown as Nachrichtenentwurf;
    const druck = entwurfsdruck(ohne, true);
    expect(druck.abfassungszeit).toBe("");
    expect(druck.nachweis).toBeUndefined();
    expect(druck.uebung).toBe(true);
  });

  it("bietet im Teileinstieg nur, was Vorschau und Druck teilen", () => {
    // Additiv (ETB P2-7): der Stempel der zurückgezogenen Nachricht, damit die Vorschau ihn zeichnet wie der Druck.
    expect(Object.keys(vordruck).sort()).toEqual(["RUECKZUG_WORT", "blattZeichnen", "druckbar", "entwurfsdruck", "nachrichtAlsVordruckPdf", "nachrichtendruckAus", "rueckzugText", "vordruckBlaetterAus", "zeichneRueckzugsstempel"]);
  });
});

describe("Der Dateiname des Vordrucks (§7)", () => {
  const zeile = { id: "N-7f3a", richtungKurz: "A" as const, abfassungszeit: "2026-11-17T09:45:00Z" };
  it("trägt Richtung, Nummer und Datum-Zeit-Gruppe", () => {
    expect(nachrichtendateiname({ ...zeile, nummer: 12 })).toBe("nachricht-A12-171045nov26.pdf");
  });
  it("sagt ohne Nummer „ohne“ und hängt ein Stück der Kennung an", () => {
    expect(nachrichtendateiname(zeile)).toBe("nachricht-Aohne-171045nov26-N7f3a.pdf");
  });
  it("nimmt ohne Abfassungszeit die Aufnahme, sonst „ohnezeit“", () => {
    expect(nachrichtendateiname({ id: "N-1", richtungKurz: "E", nummer: 3, aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-17T10:00:00Z", handzeichen: "Fm" } })).toBe("nachricht-E3-171100nov26.pdf");
    expect(nachrichtendateiname({ id: "N-1", richtungKurz: "E", nummer: 3 })).toBe("nachricht-E3-ohnezeit.pdf");
  });
});

describe("Der leere Vordruck (Entscheidung 9)", () => {
  it("ist ein PDF auf A4 quer", () => {
    const text = new TextDecoder("latin1").decode(leererNachrichtenvordruckPdf());
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toMatch(/\/MediaBox \[0 0 841\.8\d* 595\.2\d*\]/u);
  });
});
