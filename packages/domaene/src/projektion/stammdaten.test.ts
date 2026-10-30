/**
 * Prüffälle zu den Stammdaten des Einsatzes (Blatt „Stammdaten“ der Excel).
 *
 * Drei Aussagen: Die Projektion liest, was gilt — auch nach einer Änderung
 * und nach einem ausdrücklichen Leeren —, die Prüfung des neuen Werts weist
 * ab, was nicht auf einen Ausdruck gehört, und das Tagebuch erzählt die
 * Änderung in Wörtern statt in Schlüsseln.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { einsatzAngelegt, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import { einsatzArtTitel, schichtmodellTitel, zeitpunktText } from "../beschriftungen.js";
import type { Zustand } from "../zustand.js";

import { STAMMDATENFELDER, einsatzstammdaten, stammdatenwertFehler } from "./stammdaten.js";
import { tagebuchzeile } from "./tagebuch.js";

const ANLAGE = einsatzAngelegt(hlc(1, 0, "a"), 1, {
  einsatzId: "E1",
  name: "Hochwasser Hunte",
  art: "EINSATZ",
  fuestName: "Arbeitsplatz 1",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

function aenderung(n: number, feld: string, vorher: unknown, neu: unknown): EingehendesEreignis {
  return feldEreignis(hlc(n, 0, "a"), n, "EinsatzStammdatenGeaendert", { einsatzId: "E1", feld }, vorher, neu);
}

function falte(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

describe("Die Stammdaten des Einsatzes", () => {
  it("fehlen, solange kein Einsatz angelegt ist", () => {
    expect(einsatzstammdaten(falte([]))).toBeUndefined();
  });

  it("lesen die Anlage und lassen nie gesetzte freie Felder weg", () => {
    expect(einsatzstammdaten(falte([ANLAGE]))).toEqual({
      name: "Hochwasser Hunte",
      art: "EINSATZ",
      fuestName: "Arbeitsplatz 1",
      beginn: "2026-09-08T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
    });
  });

  it("zeigen nach einer Änderung den neuen Wert — unabhängig von der Reihenfolge", () => {
    const fuest = aenderung(2, "fuestName", "Arbeitsplatz 1", "FüSt Oldenburg");
    const oben = aenderung(3, "uebergeordneteFuestName", null, "TEL Landkreis");
    for (const folge of [[ANLAGE, fuest, oben], [oben, fuest, ANLAGE]]) {
      const daten = einsatzstammdaten(falte(folge));
      expect(daten?.fuestName).toBe("FüSt Oldenburg");
      expect(daten?.uebergeordneteFuestName).toBe("TEL Landkreis");
    }
  });

  it("behandeln ein ausdrücklich geleertes Feld wie ein nie gesetztes (§3.2)", () => {
    const gesetzt = aenderung(2, "ort", null, "Oldenburg");
    const geleert = aenderung(3, "ort", "Oldenburg", null);
    expect(einsatzstammdaten(falte([ANLAGE, gesetzt, geleert]))).not.toHaveProperty("ort");
  });

  it("führen jedes Feld, das der Katalog für die Änderung kennt", () => {
    expect([...STAMMDATENFELDER]).toEqual([
      "name",
      "art",
      "fuestName",
      "uebergeordneteFuestName",
      "ort",
      "beginn",
      "schichtmodell",
    ]);
  });
});

describe("Die Prüfung des neuen Werts", () => {
  it("weist einen leeren Einsatz- oder FüSt-Namen ab", () => {
    expect(stammdatenwertFehler("fuestName", "  ")).toContain("Führungsstelle");
    expect(stammdatenwertFehler("name", null)).toContain("Einsatzname");
    expect(stammdatenwertFehler("fuestName", "FüSt Oldenburg")).toBeUndefined();
  });

  it("lässt die freien Felder leeren, aber nicht mit Zahlen füllen", () => {
    expect(stammdatenwertFehler("uebergeordneteFuestName", null)).toBeUndefined();
    expect(stammdatenwertFehler("ort", "Deich Nord")).toBeUndefined();
    expect(stammdatenwertFehler("ort", 7)).toBeDefined();
  });

  it("kennt nur die Werte des Katalogs für Art, Schichtmodell und Beginn", () => {
    expect(stammdatenwertFehler("art", "UEBUNG")).toBeUndefined();
    expect(stammdatenwertFehler("art", "Übung")).toBeDefined();
    expect(stammdatenwertFehler("schichtmodell", "DREI_SCHICHT")).toBeUndefined();
    expect(stammdatenwertFehler("schichtmodell", "VIER")).toBeDefined();
    expect(stammdatenwertFehler("beginn", "2026-09-08T09:00:00.000Z")).toBeUndefined();
    expect(stammdatenwertFehler("beginn", "morgen früh")).toBeDefined();
  });
});

describe("Die Stammdaten im Tagebuch", () => {
  const zustand = falte([ANLAGE]);

  it("nennen die Führungsstelle mit ihrem Wort", () => {
    const zeile = tagebuchzeile(zustand, aenderung(2, "uebergeordneteFuestName", null, "TEL Landkreis"));
    expect(zeile.satz).toBe(
      "Hochwasser Hunte: Stammdaten geändert (übergeordnete Führungsstelle): (leer) → TEL Landkreis",
    );
  });

  it("schreiben Art und Schichtmodell als Wort und nicht als Schlüssel", () => {
    const art = tagebuchzeile(zustand, aenderung(2, "art", "EINSATZ", "UEBUNG")).satz;
    expect(art).toContain(`${einsatzArtTitel("EINSATZ")} → ${einsatzArtTitel("UEBUNG")}`);
    expect(art).not.toContain("UEBUNG");
    const modell = tagebuchzeile(zustand, aenderung(3, "schichtmodell", "ZWEI_SCHICHT", "DREI_SCHICHT")).satz;
    expect(modell).toContain(schichtmodellTitel("DREI_SCHICHT"));
    expect(modell).not.toContain("_");
  });

  it("zeigen den Beginn als Zeitangabe und machen ihn nicht zur fachlichen Zeit der Zeile", () => {
    const neu = "2026-09-08T09:30:00+02:00";
    const zeile = tagebuchzeile(zustand, aenderung(2, "beginn", "2026-09-08T08:00:00+02:00", neu));
    expect(zeile.satz).toContain(`→ ${zeitpunktText(neu)}`);
    expect(zeile.zeitpunkt).toBeUndefined();
  });
});
