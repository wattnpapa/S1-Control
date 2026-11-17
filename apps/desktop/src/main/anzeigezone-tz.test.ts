/**
 * Gleiche Texte in jeder Rechnerzone (Audits Nachrichten SGL P3-16, ETB P2-1,
 * LdF P2-4, FM P2-1): Anzeige und Lesen getippter Zeiten laufen in der
 * Anzeigezone Europe/Berlin. Belegt unter `TZ=UTC`, `TZ=America/New_York`
 * und `TZ=Europe/Berlin` — Node übernimmt eine zur Laufzeit gesetzte `TZ`.
 */

import process from "node:process";

import { datumZeitGruppe, rechnerzoneHinweis, standText, uhrzeitText, zeitpunktText } from "@s1/domaene";
import { afterEach, describe, expect, it } from "vitest";

import { funkzeitInAnzeigezone, zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";

const VORHER = process.env["TZ"];

afterEach(() => {
  if (VORHER === undefined) delete process.env["TZ"];
  else process.env["TZ"] = VORHER;
});

const ISO = "2026-11-17T09:45:00Z";
const JETZT = new Date("2026-11-17T11:00:00Z");

function texte(): readonly unknown[] {
  return [
    zeitpunktText(ISO),
    uhrzeitText(ISO, true),
    standText(ISO),
    datumZeitGruppe(ISO),
    zeitpunktAusEingabe("10:45", JETZT),
    zeitpunktAusEingabe("17.11. 10:45", JETZT),
    funkzeitInAnzeigezone("1045", JETZT),
    funkzeitInAnzeigezone("171045", JETZT),
  ];
}

describe("Anzeigezone unabhängig von der Rechnerzone", () => {
  it("schreibt und liest unter UTC, New York und Berlin dieselben Texte", () => {
    const ergebnisse = ["UTC", "America/New_York", "Europe/Berlin"].map((zone) => {
      process.env["TZ"] = zone;
      return texte();
    });
    expect(ergebnisse[0]).toEqual([
      "17.11.2026 10:45",
      "10:45:00",
      "17.11.2026, 10:45:00",
      "171045nov26",
      ISO.replace("Z", ".000Z"),
      ISO.replace("Z", ".000Z"),
      ISO.replace("Z", ".000Z"),
      ISO.replace("Z", ".000Z"),
    ]);
    expect(ergebnisse[1]).toEqual(ergebnisse[0]);
    expect(ergebnisse[2]).toEqual(ergebnisse[0]);
  });

  it("nimmt in New York kurz nach Mitternacht Berliner Zeit den Berliner Tag", () => {
    process.env["TZ"] = "America/New_York";
    // 00:30 in Berlin ist in New York noch der Vortag.
    const jetzt = new Date("2026-11-17T23:30:00Z");
    expect(funkzeitInAnzeigezone("0045", jetzt)).toBe("2026-11-17T23:45:00.000Z");
  });

  it("nennt die abweichende Rechnerzone, in Berlin nicht", () => {
    const jetzt = Date.parse(ISO);
    process.env["TZ"] = "America/New_York";
    expect(rechnerzoneHinweis(jetzt)).toBe("Rechnerzeit America/New_York, Anzeige in Europe/Berlin");
    process.env["TZ"] = "UTC";
    expect(rechnerzoneHinweis(jetzt)).toBe("Rechnerzeit UTC, Anzeige in Europe/Berlin");
    process.env["TZ"] = "Europe/Berlin";
    expect(rechnerzoneHinweis(jetzt)).toBeUndefined();
  });
});
