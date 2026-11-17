/**
 * Fernmelder P3-1: Die Rückmeldung nach einem Nachrichtenschritt nennt Nummer
 * und Betreff statt nur „Nachricht A“.
 */

import type { EingehendesEreignis, Zustand } from "@s1/domaene";
import { describe, expect, it } from "vitest";

import { gegenstandMitBetreff } from "./nachrichtengegenstand.js";

function zustand(betreff: string, nummer?: number): Zustand {
  return {
    nachrichten: {
      "N-1": {
        richtung: { wert: "AUSGANG" },
        betreff: { wert: betreff },
        ...(nummer === undefined ? {} : { nachweis: { wert: { nummer } } }),
      },
    },
  } as unknown as Zustand;
}

const annahme = { typ: "NachrichtAngenommen", nutzlast: { nachrichtId: "N-1" } } as unknown as EingehendesEreignis;

describe("Gegenstand einer Nachricht mit Betreff", () => {
  it("hängt den Betreff an", () => {
    const gegenstand = gegenstandMitBetreff(zustand("Sperrung B212", 7), annahme);
    expect(gegenstand).toBe("Nachricht A 7 ‚Sperrung B212‘");
  });

  it("nennt ohne Nummer die Richtung und kürzt einen langen Betreff", () => {
    expect(gegenstandMitBetreff(zustand("Sperrung B212"), annahme)).toBe("Nachricht A ‚Sperrung B212‘");
    expect(gegenstandMitBetreff(zustand("x".repeat(60)), annahme)).toMatch(/^Nachricht A ‚x{39}…‘$/u);
  });

  it("lässt eine Nachricht ohne Betreff, wie sie ist", () => {
    expect(gegenstandMitBetreff(zustand("", 7), annahme)).toBe("Nachricht A 7");
  });
});
