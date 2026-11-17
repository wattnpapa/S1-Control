/**
 * Die Texte des Renderers sind in jeder Rechnerzone gleich (Audits Nachrichten
 * SGL P3-16, ETB P2-1, LdF P2-4, FM P2-1): Einsatzliste, Einsatzanlage,
 * Monitorwarnung, Eingangsrevisionen, Eingabe der Datum-Zeit-Gruppe und der
 * Zeithinweis. Muster: `main/anzeigezone-tz.test.ts` — Node übernimmt eine zur
 * Laufzeit gesetzte `TZ`.
 */

import { afterEach, describe, expect, it } from "vitest";

import { heute } from "./Einsatzanlage.js";
import { zeitText } from "./Einsatzliste.js";
import { zeit } from "./Eingangsrevisionen.js";
import { standUhrzeit } from "./Monitorwarnung.js";
import { zeitAusEingabe, zeitHinweis } from "./nachrichtenformate.js";

// Der Renderer kennt keine Node-Typen; die Tests laufen aber in Node, und dort gilt eine zur Laufzeit gesetzte `TZ`.
const process = (globalThis as unknown as { readonly process: { readonly env: Record<string, string | undefined> } }).process;

const VORHER = process.env["TZ"];

afterEach(() => {
  if (VORHER === undefined) delete process.env["TZ"];
  else process.env["TZ"] = VORHER;
});

const ISO = "2026-11-17T09:45:00Z";
const JETZT = new Date("2026-11-17T11:00:00Z");

function texte(): readonly unknown[] {
  return [
    zeitText(Date.parse(ISO), JETZT.getTime()),
    zeitText(Date.parse("2026-11-16T22:30:00Z"), JETZT.getTime()),
    zeitText(Date.parse("2026-09-03T14:05:00Z"), JETZT.getTime()),
    heute(JETZT),
    heute(new Date("2026-12-31T23:30:00Z")),
    standUhrzeit(JETZT.getTime(), 15 * 60_000),
    zeit("2026-09-10T06:00:00Z"),
    zeitAusEingabe("171045nov26", JETZT),
    zeitAusEingabe("010030", new Date("2026-12-31T23:30:00Z")),
    // Silvester 23:30 UTC ist in Berlin schon 2027: das Bezugsjahr der Gruppe ohne Jahr.
    zeitAusEingabe("311200dez", new Date("2026-12-31T23:30:00Z")),
    zeitHinweis("2026-11-17T12:00:00Z", JETZT),
    zeitHinweis("2026-11-15T09:00:00Z", JETZT),
  ];
}

describe("Renderer-Texte unabhängig von der Rechnerzone", () => {
  it("schreibt unter UTC, New York und Berlin dieselben Texte", () => {
    const ergebnisse = ["UTC", "America/New_York", "Europe/Berlin"].map((zone) => {
      process.env["TZ"] = zone;
      return texte();
    });
    expect(ergebnisse[0]).toEqual([
      "heute, 10:45",
      "gestern, 23:30",
      "03.09.2026, 16:05",
      "17.11.2026",
      "01.01.2027",
      "11:45",
      "10.09.2026, 08:00:00",
      "2026-11-17T09:45:00.000Z",
      "2026-12-31T23:30:00.000Z",
      "2027-12-31T11:00:00.000Z",
      "liegt in der Zukunft – bitte prüfen",
      "liegt mehr als 24 Stunden zurück – bitte prüfen",
    ]);
    expect(ergebnisse[1]).toEqual(ergebnisse[0]);
    expect(ergebnisse[2]).toEqual(ergebnisse[0]);
  });
});
