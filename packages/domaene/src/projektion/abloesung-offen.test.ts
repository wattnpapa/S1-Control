import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { einheitGemeldet, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { prueflageEreignisse } from "../pruefhilfen/pruefage.js";
import type { Zustand } from "../zustand.js";

import { offeneAbloesungen } from "./abloesung-offen.js";

const H = (n: number): ReturnType<typeof hlc> => hlc(9_000_000 + n, 0, "T");

function lage(...dazu: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), [...prueflageEreignisse(), ...dazu]));
}

const NEUE_EINHEIT = einheitGemeldet(H(2), 2, {
  einheitId: "E99",
  abschnittId: "ANF",
  bezeichnung: "BGr Varel",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: staerke(0, 1, 8),
  personalErfassung: "NUR_STAERKE",
  status: "EINSATZBEREIT",
});
const ERLEDIGT = feldEreignis(H(3), 3, "AnforderungErledigt", { anforderungId: "A1" }, null, {
  erledigtAm: "2026-09-08T09:15:00+02:00",
  abloesendeEinheitId: "E99",
});

describe("offeneAbloesungen", () => {
  it("meldet nichts, solange die Anforderung nicht eingetroffen ist", () => {
    expect(offeneAbloesungen(lage())).toEqual([]);
  });

  it("nennt die abgelöste Einheit, solange sie zur Ist-Stärke zählt", () => {
    const zustand = lage(NEUE_EINHEIT, ERLEDIGT);
    const eintrag = offeneAbloesungen(zustand).find((x) => x.anforderungId === "A1");
    expect(eintrag).toMatchObject({
      abgeloesteEinheitId: "E12",
      abgeloesteBezeichnung: "BGr 1 Oldenburg",
      abloesendeEinheitId: "E99",
      abloesendeBezeichnung: "BGr Varel",
    });
  });

  it("meldet nichts mehr, wenn die abgelöste Einheit auf Rückmarsch steht", () => {
    const rueck = feldEreignis(H(4), 4, "StatusGesetzt", { einheitId: "E12" }, null, "RUECKMARSCH");
    const liste = offeneAbloesungen(lage(NEUE_EINHEIT, ERLEDIGT, rueck));
    expect(liste.find((x) => x.anforderungId === "A1")).toBeUndefined();
  });
});
