/**
 * Tests zur Führungsstelle auf den Ausgaben (Blatt „Stammdaten“ der Excel).
 *
 * Die Goldfiles prüfen die Prüflage, und die kennt keine übergeordnete
 * Führungsstelle. Hier steht, was ein Goldfile nicht sagt: dass eine
 * Änderung der Stammdaten auf Druck, Status, Log und Kosten ankommt und dass
 * die übergeordnete Stelle nur dort steht, wo sie eingetragen ist.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../../domaene/src/fold.js";
import { feldEreignis, hlc } from "../../domaene/src/pruefhilfen/ereignisbau.js";
import { PRUEFLAGE_ID, prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";
import type { Zustand } from "../../domaene/src/zustand.js";

import { druckAlsHtml, druckdaten } from "./druck.js";
import { fuestangaben, fuestzeileAlsHtml } from "./fuestzeile.js";
import { kostenAlsHtml } from "./kosten.js";
import { logAlsHtml } from "./log.js";
import { statusAlsHtml, statusdaten } from "./status.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung Weser-Ems", stand: "Stand: 08.09.2026, 08:00" };

function lageMit(...aenderungen: readonly [string, unknown, unknown][]): Zustand {
  const ereignisse = aenderungen.map(([feld, vorher, neu], i) =>
    feldEreignis(
      hlc(900_000 + i, 0, "s"),
      i + 1,
      "EinsatzStammdatenGeaendert",
      { einsatzId: PRUEFLAGE_ID, feld },
      vorher,
      neu,
    ),
  );
  return materialisiere(falteHinzu(leereFaltung(), [...prueflageEreignisse(), ...ereignisse]));
}

function alleAusgaben(zustand: Zustand): readonly string[] {
  return [
    druckAlsHtml(druckdaten(zustand), KOPF),
    statusAlsHtml(statusdaten(zustand), KOPF),
    logAlsHtml(zustand, KOPF),
    kostenAlsHtml(zustand, KOPF),
  ];
}

describe("Die Führungsstelle auf den Ausgaben", () => {
  it("nimmt den FüSt-Namen aus den Stammdaten, nicht aus der Anlage allein", () => {
    const zustand = lageMit(["fuestName", "FüSt Oldenburg", "FüSt Weser-Ems"]);
    for (const html of alleAusgaben(zustand)) {
      expect(html).toContain('<p class="fuest">FüSt Weser-Ems</p>');
    }
  });

  it("nennt die übergeordnete Führungsstelle, wenn sie eingetragen ist", () => {
    const zustand = lageMit(["uebergeordneteFuestName", null, "TEL Landkreis <Oldenburg>"]);
    for (const html of alleAusgaben(zustand)) {
      expect(html).toContain("übergeordnete Führungsstelle: TEL Landkreis &lt;Oldenburg&gt;");
    }
  });

  it("lässt die übergeordnete Stelle weg, wenn sie geleert wurde", () => {
    const zustand = lageMit(
      ["uebergeordneteFuestName", null, "TEL Landkreis"],
      ["uebergeordneteFuestName", "TEL Landkreis", null],
    );
    expect(fuestangaben(zustand)).toEqual({ fuestName: "FüSt Oldenburg" });
    expect(fuestzeileAlsHtml(fuestangaben(zustand))).toBe('  <p class="fuest">FüSt Oldenburg</p>');
  });

  it("bleibt ohne Einsatz leer statt abzustürzen", () => {
    expect(fuestangaben(materialisiere(leereFaltung()))).toEqual({ fuestName: "" });
  });
});
