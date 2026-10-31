/**
 * Regression (Review Runde 2, P0): Eine Anforderung ohne Kennung stürzte die
 * Projektionen mit „Cannot read properties of undefined (reading 'wert')“ ab.
 * Die Lage muss lesbar bleiben, auch wenn ein Ereignis so im Protokoll steht.
 */

import { describe, expect, it } from "vitest";

import { falte, type EingehendesEreignis } from "../fold.js";
import { SCHEMA_VERSION, ereignisId } from "../ereignis.js";
import { abschnittAngelegt, akteur, einheitGemeldet, einsatzAngelegt, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { abloesungDerEinheit } from "./abloesung.js";
import { anforderungsliste } from "./anforderung.js";
import { einheitentabelle } from "./tabelle.js";
import { tagebuchausschnitt, tagebuchzeile } from "./tagebuch.js";

const grund: EingehendesEreignis[] = [
  einsatzAngelegt(hlc(1000, 0, "aa"), 1, {
    einsatzId: "E",
    name: "Test",
    art: "EINSATZ",
    fuestName: "FüSt",
    beginn: "2026-09-08T08:00:00+02:00",
    schichtmodell: "ZWEI_SCHICHT",
  }),
  abschnittAngelegt(hlc(1001, 0, "aa"), 2, { abschnittId: "A", name: "Ort", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
  einheitGemeldet(hlc(1002, 0, "aa"), 3, {
    einheitId: "U1",
    abschnittId: "A",
    bezeichnung: "1. BGr",
    organisation: "THW",
    ebene: "GRUPPE",
    staerke: staerke(0, 1, 8),
    personalErfassung: "NUR_STAERKE",
    status: "IM_EINSATZ",
  }),
];

const ohneKennung: EingehendesEreignis = {
  id: ereignisId("aa", 4),
  hlc: hlc(2000, 0, "aa"),
  schemaVersion: SCHEMA_VERSION,
  akteur: akteur("aa"),
  wanduhr: "2026-09-08T09:00:00+02:00",
  typ: "AnforderungAngelegt",
  nutzlast: { anforderungId: "AN1", abzuloesendeEinheitId: "U1", angefordertAm: "2026-09-08T09:00:00+02:00" },
};

describe("Anforderung ohne Kennung im Protokoll", () => {
  const ereignisse = [...grund, ohneKennung];
  const zustand = falte(ereignisse);

  it("lässt Anforderungen, Einheitentabelle und Tagebuch lesbar", () => {
    const liste = anforderungsliste(zustand);
    expect(liste.zeilen).toHaveLength(1);
    expect(liste.zeilen[0]?.kennung).toBe("");
    expect(einheitentabelle(zustand).zeilen).toHaveLength(1);
    expect(abloesungDerEinheit(zustand, "U1")?.anforderungId).toBe("AN1");
    expect(tagebuchausschnitt(zustand, ereignisse).gesamtzahl).toBe(4);
  });

  it("überspringt eine nicht darstellbare Anforderung und zählt sie, statt die Liste zu kippen", () => {
    const zerstoert = {
      id: "X",
      abzuloesendeEinheitId: { wert: "U1" },
      zustand: "OFFEN",
      get kennung(): never {
        throw new TypeError("kaputt");
      },
    } as never;
    const kaputt = { ...zustand, anforderungen: { ...zustand.anforderungen, X: zerstoert } };
    const liste = anforderungsliste(kaputt);
    expect(liste.zeilen).toHaveLength(1);
    expect(liste.beschaedigt).toBe(1);
    expect(abloesungDerEinheit(kaputt, "U1")?.anforderungId).toBe("AN1");
  });

  it("zeigt ein nicht darstellbares Ereignis als Beschädigter Eintrag", () => {
    const boese = {
      ...ohneKennung,
      get nutzlast(): never {
        throw new TypeError("kaputt");
      },
    };
    const zeile = tagebuchzeile(zustand, boese);
    expect(zeile.satz).toContain("Beschädigter Eintrag");
  });
});
