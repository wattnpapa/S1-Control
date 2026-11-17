/**
 * Die Bedienschritte des Nachrichtenvordrucks als reine Funktionen
 * (KONZEPT-NACHRICHTEN.md §5, §9).
 *
 * Gemessen wird der Entwurf: welche Art, welcher Vorwert, ob geprüft wird —
 * und dass jede Nutzlast und jeder Vermerk zu den Schemata der Domäne passt.
 */

import { describe, expect, it } from "vitest";

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { zEntwurf, zRuf } from "./index.js";
import { NACHRICHTEN_SICHTEN_LISTE } from "./nachrichtenwerte.js";
import {
  erledigt,
  erledigungZurueck,
  kenntnisFuerStellen,
  kenntnisGenommen,
  nachrichtenentwurfFehler,
  nachrichtSichten,
  nachrichtVerfassen,
  nachrichtZurueckziehen,
} from "./nachrichtenschritte.js";

const JETZT = "2026-11-16T10:45:00.000Z";

const SICHTUNG = {
  zeitpunkt: JETZT,
  handzeichen: " Mü ",
  verteiler: [
    { stelle: "S4", kopie: "GRUEN" },
    { stelle: "S2", kopie: "ROT" },
  ],
  vermerke: "  ",
};

describe("Die Bedienschritte des Nachrichtenvordrucks", () => {
  it("führt die Sichten des Kontrakts wie die Projektion", () => {
    expect([...NACHRICHTEN_SICHTEN_LISTE]).toEqual([...projektion.NACHRICHTEN_SICHTEN]);
  });

  it("verfasst einen Ausgang, lässt leere Zusätze weg und passt zum Katalog", () => {
    const entwurf = nachrichtVerfassen({
      nachrichtId: "N-1",
      richtung: "AUSGANG",
      vorrang: "",
      gespraechsnotiz: false,
      anschrift: " S4 ",
      rufnummer: "  ",
      betreff: "Pumpen",
      inhalt: "Zwei Pumpen\nbenötigt   ",
      absender: "S1",
      abfassungszeit: JETZT,
      zeichen: "Mü",
    });
    expect(entwurf).toEqual({
      typ: "NachrichtVerfasst",
      nutzlast: { nachrichtId: "N-1", richtung: "AUSGANG", anschrift: "S4", betreff: "Pumpen", inhalt: "Zwei Pumpen\nbenötigt", absender: "S1", abfassungszeit: JETZT, zeichen: "Mü" },
    });
    expect(zEntwurf.safeParse(entwurf).success).toBe(true);
    expect(nachrichtenentwurfFehler(entwurf)).toBeUndefined();
  });

  it("meldet eine Anlage ohne Pflichtschlüssel als Fehler", () => {
    expect(nachrichtenentwurfFehler({ typ: "NachrichtVerfasst", nutzlast: { nachrichtId: "N-1", richtung: "SEITWAERTS" } })).toMatch(/passen nicht zum Vordruck/);
  });

  it("sichtet mit gesehenem Vorwert ohne Vorwert-Prüfung (§5: zwei Sichtungen gelten beide), geputzt und ohne leere Vermerke", () => {
    const entwurf = nachrichtSichten("N-1", null, SICHTUNG);
    expect(entwurf).toEqual({
      typ: "NachrichtGesichtet",
      nutzlast: { nachrichtId: "N-1" },
      vorher: null,
      neu: { zeitpunkt: JETZT, handzeichen: "Mü", verteiler: SICHTUNG.verteiler },
    });
    expect(nachrichtenentwurfFehler(entwurf)).toBeUndefined();
  });

  it("weist eine Sichtung ohne Verteiler-Liste ab, lässt die Rücknahme auf leer aber zu", () => {
    expect(nachrichtenentwurfFehler({ typ: "NachrichtGesichtet", nutzlast: { nachrichtId: "N-1" }, neu: { zeitpunkt: JETZT } })).toMatch(/nicht vollständig/);
    expect(nachrichtenentwurfFehler({ typ: "NachrichtGesichtet", nutzlast: { nachrichtId: "N-1" }, neu: null })).toBeUndefined();
  });

  it("nimmt Kenntnis je Stelle, ohne Prüfung, und nur für eigene ungelesene Stellen", () => {
    expect(kenntnisGenommen("N-1", "S4", { zeitpunkt: JETZT, handzeichen: "Mü" })).toEqual({
      typ: "NachrichtKenntnisGenommen",
      nutzlast: { nachrichtId: "N-1", stelle: "S4" },
      vorher: null,
      neu: { zeitpunkt: JETZT, handzeichen: "Mü" },
    });
    const zeile = {
      id: "N-1",
      verteiler: [
        { stelle: "S4", kopie: "GRUEN", gelesen: false, erledigt: false },
        { stelle: "S1", kopie: "BLAU", gelesen: true, erledigt: false },
        { stelle: "S2", kopie: "ROT", gelesen: false, erledigt: false },
      ],
    } as unknown as Nachrichtenzeile;
    const entwuerfe = kenntnisFuerStellen(zeile, ["S1", "S4"], { zeitpunkt: JETZT, handzeichen: "Mü" });
    expect(entwuerfe.map((e) => (e.nutzlast as { stelle: string }).stelle)).toEqual(["S4"]);
    expect(entwuerfe.every((e) => nachrichtenentwurfFehler(e) === undefined)).toBe(true);
  });

  it("erledigt, nimmt die Erledigung zurück und zieht mit Grund zurück", () => {
    expect(erledigt("N-1", "S4")).toEqual({ typ: "NachrichtErledigt", nutzlast: { nachrichtId: "N-1", stelle: "S4" }, vorher: null, neu: true });
    expect(erledigungZurueck("N-1", "S4")).toMatchObject({ typ: "ErledigungDerNachrichtZurueckgenommen", vorher: true, neu: false });
    expect(nachrichtZurueckziehen("N-1", " doppelt erfasst ")).toEqual({
      typ: "NachrichtZurueckgezogen",
      nutzlast: { nachrichtId: "N-1" },
      vorher: null,
      neu: true,
      grund: "doppelt erfasst",
    });
    for (const e of [erledigt("N-1", "S4"), erledigungZurueck("N-1", "S4"), nachrichtZurueckziehen("N-1", "x")]) {
      expect(nachrichtenentwurfFehler(e)).toBeUndefined();
    }
  });

  it("weist eine Stelle mit Schrägstrich ab — sie würde Teil des Feldpfads", () => {
    expect(nachrichtenentwurfFehler(erledigt("N-1", "S4/S1"))).toMatch(/passen nicht/);
    expect(zRuf.safeParse({ art: "stellenSetzen", akteId: "akte-1", stellen: ["S4/S1"] }).success).toBe(false);
  });

  it("nimmt den Ruf des Blattes und Stelle und Handzeichen beim Öffnen additiv an", () => {
    expect(zRuf.safeParse({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "posteingang", stellen: ["S4"], zustaende: ["NEU"], anzahl: 100 }).success).toBe(true);
    expect(zRuf.safeParse({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "irgendwo" }).success).toBe(false);
    expect(zRuf.safeParse({ art: "einsatzOeffnen", ordner: "x" }).success).toBe(true);
    expect(zRuf.safeParse({ art: "einsatzOeffnen", ordner: "x", stellen: ["S1", "Polizei"], handzeichen: "Mü" }).success).toBe(true);
  });
});
