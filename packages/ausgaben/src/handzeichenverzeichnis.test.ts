/** R2-ETB P2-7: das Handzeichenverzeichnis als Seite; R2-LdF P2-1, P2-2, LdF P2-3: Marken der Nachweisung. */

import { describe, expect, it } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import { handzeichenverzeichnisAlsHtml } from "./handzeichenverzeichnis.js";
import { nachweisungMarken } from "./nachweisung.js";

const kopf = { datum: "2026-11-17", einsatzName: "Übung", stand: "Stand: 17.11.2026, 20:40" };

describe("Handzeichenverzeichnis", () => {
  it("führt Hz., Arbeitsplatz, Stelle, ersten und letzten Eintrag", () => {
    const html = handzeichenverzeichnisAlsHtml(kopf, [
      { handzeichen: "Fm", namen: ["Arbeitsplatz 1"], stellen: ["FMZ"], erster: "2026-11-17T19:00:00Z", letzter: "2026-11-17T19:40:00Z", anzahl: 4 },
    ]);
    expect(html).toContain("<h2>Handzeichenverzeichnis</h2>");
    expect(html).toContain("<td>Fm</td><td>Arbeitsplatz 1</td><td>FmZ</td><td>17.11.2026 20:00</td><td>17.11.2026 20:40</td><td>4</td>");
    expect(handzeichenverzeichnisAlsHtml(kopf, [])).toContain("Noch kein Eintrag mit Handzeichen.");
  });
});

describe("Marken der Nachweisung", () => {
  it("nennt ohne Vorschlag, Abweichung und Verfasser = Nachweiser", () => {
    const zeile = { nummerDoppelt: false, gespraechsnotiz: false, zurueckgezogen: false, richtung: "AUSGANG", laufzustand: "ERLEDIGT", verteiler: [], nummer: 1, ohneVorschlag: true, abweichungVomVorschlag: "Telefon → Funk", verfasserGleichNachweiser: true } as unknown as Nachrichtenzeile;
    expect(nachweisungMarken(zeile)).toEqual(expect.arrayContaining(["ohne Vorschlag des LdF", "abweichend vom Vorschlag (Telefon → Funk)", "Verfasser = Nachweiser"]));
  });
});
