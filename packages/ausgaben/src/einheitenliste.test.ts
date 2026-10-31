/**
 * Tests zur Einheitenliste — dem Blatt „Stärke“ als Ausdruck.
 *
 * Das Goldfile unter `bau/ausgaben/` hält die Seite gegen die Prüflage fest.
 * Hier stehen die Aussagen, die ein Goldfile nicht macht: dass die Zahlen mit
 * Druck und Status aufgehen, dass Wörter und keine Schlüssel auf dem Papier
 * stehen, und dass ein leerer Einsatz eine Seite ergibt und keinen Absturz.
 */

import { describe, expect, it } from "vitest";

import { EINHEIT_STATUS, SCHICHTEN, TAKTISCHE_EBENEN } from "../../domaene/src/ereignis.js";
import { zeitpunktText } from "../../domaene/src/beschriftungen.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../../domaene/src/fold.js";
import { feldEreignis, hlc } from "../../domaene/src/pruefhilfen/ereignisbau.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";
import { ARCHIV_ABSCHNITT_ID, type Zustand } from "../../domaene/src/zustand.js";

import { druckdaten } from "./druck.js";
import { einheitenlistendaten } from "./einheitenliste-daten.js";
import { einheitenlisteAlsHtml } from "./einheitenliste.js";
import { statusdaten } from "./status.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung Weser-Ems", stand: "Stand: 08.09.2026, 08:00" };

function lage(...dazu: EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), [...prueflageEreignisse(), ...dazu]));
}

describe("Die Zahlen der Einheitenliste", () => {
  it("führt jede Einheit der Lage genau einmal, durchnummeriert", () => {
    const daten = einheitenlistendaten(lage());
    const nummern = daten.bereiche.flatMap((b) => b.zeilen.map((z) => z.nr));
    expect(nummern).toEqual(nummern.map((_, i) => i + 1));
    const ids = daten.bereiche.flatMap((b) => b.zeilen.map((z) => z.einheitId));
    expect(new Set(ids).size).toBe(ids.length);
    expect(daten.einheiten).toBe(ids.length);
  });

  it("die Zwischensumme eines Bereichs ist die Ist-Stärke seiner Einheiten", () => {
    for (const bereich of einheitenlistendaten(lage()).bereiche) {
      const ist = bereich.zeilen.filter((z) => z.klasse === "ist");
      expect(bereich.gesamt, bereich.name).toBe(ist.reduce((s, z) => s + z.gesamt, 0));
      expect(bereich.staerke.fuehrer, bereich.name).toBe(ist.reduce((s, z) => s + z.staerke.fuehrer, 0));
      const erwartet = bereich.zeilen.filter((z) => z.klasse === "erwartet");
      expect(bereich.erwartet, bereich.name).toBe(erwartet.reduce((s, z) => s + z.gesamt, 0));
    }
  });

  it("geht mit Druck und Status-Matrix auf", () => {
    // Eine Zählregel: Die Ist-Stärke der Liste ist die des Drucks und des
    // Kopfbands; „alle aufgeführten“ ist die Summe der Status-Matrix.
    const zustand = lage();
    const daten = einheitenlistendaten(zustand);
    const druck = druckdaten(zustand);
    expect(daten.alleGesamt).toBe(statusdaten(zustand).organisationenSumme.gesamt);
    expect(daten.istGesamt).toBe(druck.gesamtSumme);
    expect(daten.istGesamt).toBe(statusdaten(zustand).ist.fuehrer + statusdaten(zustand).ist.unterfuehrer + statusdaten(zustand).ist.mannschaft);
    expect(daten.erwartetGesamt).toBe(druck.angefordertSumme);
    // Auf Rückmarsch ist weder Ist noch erwartet: Die Liste führt sie trotzdem auf.
    const rueckmarsch = daten.bereiche
      .flatMap((b) => b.zeilen)
      .filter((z) => z.klasse === "beendet")
      .reduce((s, z) => s + z.gesamt, 0);
    expect(daten.alleGesamt).toBe(daten.istGesamt + daten.erwartetGesamt + rueckmarsch);
    for (const zeile of druck.zeilen) {
      const bereich = daten.bereiche.find((b) => b.abschnittId === zeile.abschnittId);
      expect(bereich?.gesamt, zeile.name).toBe(zeile.gesamt);
    }
  });

  it("hält die Baumreihenfolge und rückt Unterabschnitte ein", () => {
    const daten = einheitenlistendaten(lage());
    const ids = daten.bereiche.map((b) => b.abschnittId);
    expect(ids.indexOf("EO1-A")).toBe(ids.indexOf("EO1") + 1);
    expect(daten.bereiche.find((b) => b.abschnittId === "EO1-A")?.tiefe).toBe(1);
  });

  it("lässt leere Bereiche stehen — dort wird auf Papier weitergeschrieben", () => {
    const reserve = einheitenlistendaten(lage()).bereiche.find((b) => b.abschnittId === "EO4");
    expect(reserve?.zeilen).toEqual([]);
    expect(einheitenlisteAlsHtml(einheitenlistendaten(lage()), KOPF)).toContain("keine Einheiten");
  });

  it("nennt „Einsatz beendet“ nur mit der Zahl seiner Einheiten", () => {
    const zustand = lage(
      feldEreignis(hlc(9_000_000, 0, "zz"), 1, "EinheitVerschoben", { einheitId: "E01" }, "FUEST", ARCHIV_ABSCHNITT_ID),
    );
    const daten = einheitenlistendaten(zustand);
    expect(daten.beendet).toBe(1);
    expect(daten.bereiche.some((b) => b.abschnittId === ARCHIV_ABSCHNITT_ID)).toBe(false);
    expect(daten.bereiche.flatMap((b) => b.zeilen).some((z) => z.einheitId === "E01")).toBe(false);
    expect(einheitenlisteAlsHtml(daten, KOPF)).toContain("1 Einheit im Bereich „Einsatz beendet“ steht nicht");
  });
});

describe("Die Einheitenliste als HTML", () => {
  it("druckt quer, wiederholt den Kopf und bricht keine Zeile", () => {
    const html = einheitenlisteAlsHtml(einheitenlistendaten(lage()), KOPF);
    expect(html).toContain("size: A4 landscape");
    expect(html).toContain("thead { display: table-header-group; }");
    expect(html).toContain("break-inside: avoid");
  });

  it("trägt Einsatzname, Führungsstelle und Stand im Kopf", () => {
    const html = einheitenlisteAlsHtml(einheitenlistendaten(lage()), KOPF);
    expect(html).toContain("<h1>Übung Weser-Ems</h1>");
    expect(html).toContain('<p class="fuest">FüSt Oldenburg</p>');
    expect(html).toContain("Stand: 08.09.2026, 08:00");
  });

  it("zeigt Wörter, keine Schlüssel", () => {
    const html = einheitenlisteAlsHtml(einheitenlistendaten(lage()), KOPF);
    for (const schluessel of [...EINHEIT_STATUS, ...SCHICHTEN, ...TAKTISCHE_EBENEN]) {
      expect(html, schluessel).not.toContain(`<td>${schluessel}</td>`);
    }
    expect(html).toContain("<td>Einsatzbereit</td>");
    expect(html).toContain("<td>Zugtrupp</td>");
  });

  it("setzt Zeitpunkte als Datum und Uhrzeit", () => {
    const wann = "2026-09-08T09:30:00+02:00";
    const zustand = lage(
      feldEreignis(hlc(9_000_000, 0, "zz"), 1, "ZeitpunktGesetzt", { einheitId: "E01", feld: "eingetroffenAm" }, null, wann),
    );
    const html = einheitenlisteAlsHtml(einheitenlistendaten(zustand), KOPF);
    expect(html).toContain(`<td class="zeit">${zeitpunktText(wann)}</td>`);
    expect(html).not.toContain(wann);
  });

  it("ergibt für einen leeren Einsatz eine Seite mit Nullsummen", () => {
    const daten = einheitenlistendaten(materialisiere(leereFaltung()));
    expect(daten.einsatzName).toBe("(ohne Namen)");
    expect(daten.einheiten).toBe(0);
    expect(daten.alleGesamt).toBe(0);
    const html = einheitenlisteAlsHtml(daten, KOPF);
    expect(html).toContain("0 / 0 / 0 = 0");
    expect(html).toContain("0 Einheiten in");
  });
});
