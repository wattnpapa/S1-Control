/**
 * Die eine Anzeigezone (Audits Nachrichten SGL P3-16, ETB P2-1, LdF P2-4,
 * FM P2-1): Anzeige und Lesen in Europe/Berlin, gleich in welcher Zone der
 * Rechner läuft. Den Lauf unter `TZ=UTC` und `TZ=America/New_York` belegt
 * `apps/desktop/src/main/anzeigezone-tz.test.ts` (Ring 2 kennt kein `process`).
 */

import { describe, expect, it } from "vitest";

import { zeitpunktText } from "../beschriftungen.js";
import { uhrzeitKurz } from "../projektion/funkkontakt.js";
import {
  ANZEIGEZONE,
  anzeigezone,
  datumText,
  rechnerzoneHinweis,
  rechnerzoneWeichtAb,
  standText,
  uhrzeitText,
  uhrzeitVierstellig,
  versatzMinuten,
  wandzeit,
  zeitpunktAusWandzeit,
} from "./anzeigezone.js";
import { datumZeitGruppe } from "./datumZeitGruppe.js";

describe("anzeigezone", () => {
  it("ist Europe/Berlin", () => {
    expect(anzeigezone()).toBe("Europe/Berlin");
    expect(ANZEIGEZONE).toBe("Europe/Berlin");
  });

  it("zeigt Winter- und Sommerzeit in Berliner Wandzeit", () => {
    expect(wandzeit("2026-11-17T09:45:07Z")).toEqual({ jahr: 2026, monat: 11, tag: 17, stunde: 10, minute: 45, sekunde: 7 });
    expect(uhrzeitText("2026-07-01T09:45:00Z")).toBe("11:45");
    expect(uhrzeitText("2026-11-17T09:45:07Z", true)).toBe("10:45:07");
    expect(uhrzeitVierstellig("2026-11-17T09:45:00Z")).toBe("1045");
    expect(datumText("2026-12-31T23:30:00Z")).toBe("01.01.2027");
    expect(standText("2026-11-17T11:26:00Z")).toBe("17.11.2026, 12:26:00");
    expect(versatzMinuten(Date.parse("2026-11-17T00:00:00Z"))).toBe(60);
    expect(versatzMinuten(Date.parse("2026-07-17T00:00:00Z"))).toBe(120);
  });

  it("liest eine Wandzeit als Zeitpunkt, auch über die Umstellung", () => {
    expect(zeitpunktAusWandzeit({ jahr: 2026, monat: 11, tag: 17, stunde: 10, minute: 45 })).toBe("2026-11-17T09:45:00.000Z");
    expect(zeitpunktAusWandzeit({ jahr: 2026, monat: 7, tag: 1, stunde: 10, minute: 45 })).toBe("2026-07-01T08:45:00.000Z");
    expect(zeitpunktAusWandzeit({ jahr: 2026, monat: 10, tag: 25, stunde: 2, minute: 30 })).toBe("2026-10-25T00:30:00.000Z");
    expect(zeitpunktAusWandzeit({ jahr: 2026, monat: 11, tag: 31, stunde: 10, minute: 0 })).toBeUndefined();
    expect(zeitpunktAusWandzeit({ jahr: 2026, monat: 11, tag: 1, stunde: 24, minute: 0 })).toBeUndefined();
  });

  it("schreibt zeitpunktText, Funkuhrzeit und DTG aus derselben Quelle", () => {
    const iso = "2026-11-17T09:45:00Z";
    expect(zeitpunktText(iso)).toBe("17.11.2026 10:45");
    expect(uhrzeitKurz(iso)).toBe("1045");
    expect(datumZeitGruppe(iso)).toBe("171045nov26");
    expect(zeitpunktText("kein Zeitpunkt")).toBe("kein Zeitpunkt");
    expect(datumText("kein Zeitpunkt")).toBe("");
  });

  it("nennt eine abweichende Rechnerzone nur, wenn sie abweicht", () => {
    const jetzt = Date.parse("2026-11-17T09:45:00Z");
    const hinweis = rechnerzoneHinweis(jetzt);
    expect(hinweis === undefined).toBe(!rechnerzoneWeichtAb(jetzt));
    if (hinweis !== undefined) expect(hinweis).toMatch(/^Rechnerzeit .+, Anzeige in Europe\/Berlin$/u);
  });
});
