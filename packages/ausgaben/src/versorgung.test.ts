/** Tests zu den Ausgaben der Versorgung (S4). */

import { describe, expect, it } from "vitest";

import type { Belegung } from "@s1/domaene";

import { belegungAlsHtml } from "./versorgung.js";

const KOPF = { datum: "2026-09-10", einsatzName: "Hochwasser <Oldenburg>", stand: "Stand: 10.09.2026, 14:43" };

const BELEGUNG: Belegung = {
  unterkuenfte: [
    { unterkunftId: "U1", name: "Gerätehaus", ort: "Rastede", kapazitaet: 12, aufgeloest: false, belegt: { m: 18, w: 2, d: 0, gesamt: 20 }, frei: -8, ueberbelegt: true, einheiten: [{ einheitId: "E1", einheit: "B 1", bereich: "EA 1", m: 18, w: 2, d: 0 }] },
    { unterkunftId: "U2", name: "Halle", kapazitaet: 50, aufgeloest: false, belegt: { m: 0, w: 0, d: 0, gesamt: 0 }, frei: 50, ueberbelegt: false, einheiten: [] },
    { unterkunftId: "U3", name: "Alt", kapazitaet: 5, aufgeloest: true, belegt: { m: 0, w: 0, d: 0, gesamt: 0 }, frei: 5, ueberbelegt: false, einheiten: [] },
  ],
  kapazitaet: 62,
  belegt: 20,
  frei: 50,
  ohneZuweisung: { koepfe: 8, einheiten: 1 },
};

describe("Die Belegungsliste", () => {
  it("führt je geltende Unterkunft die Einheiten mit Köpfen und lässt aufgelöste weg", () => {
    const html = belegungAlsHtml(BELEGUNG, KOPF);
    expect(html).toContain("<h2>Gerätehaus · Rastede</h2>");
    expect(html).toContain("⚠ überbelegt");
    expect(html).toContain("<td>EA 1</td>");
    expect(html).toContain("keine Einheit");
    expect(html).not.toContain("Alt</h2>");
    expect(html).toContain("ohne Unterkunft 8 (1 Einheiten)");
  });

  it("maskiert Namen", () => {
    expect(belegungAlsHtml(BELEGUNG, KOPF)).toContain("Hochwasser &lt;Oldenburg&gt;");
  });
});
