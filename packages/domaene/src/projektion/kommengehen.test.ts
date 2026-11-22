/**
 * Kommen und Gehen (Monitor S1): Anforderungen, Anmarsch und „verfügbar bis"
 * in Zeitfolge, über der Prüflage (A1 offen für E12, A2 zugesagt für E20).
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import { prueflageEreignisse } from "../pruefhilfen/pruefage.js";
import type { Zustand } from "../zustand.js";
import { kommenUndGehen } from "./kommengehen.js";
import { staerketafel } from "./staerketafel.js";

const H = (n: number): ReturnType<typeof hlc> => hlc(9_000_000 + n, 0, "T");

function lage(...dazu: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), [...prueflageEreignisse(), ...dazu]));
}

describe("Kommen und Gehen", () => {
  it("nennt offene und zugesagte Anforderungen mit der abzulösenden Einheit", () => {
    const b = kommenUndGehen(lage());
    const anf = b.filter((x) => x.art === "angefordert" || x.art === "zugesagt");
    expect(anf.length).toBeGreaterThanOrEqual(2);
    expect(anf.some((x) => x.art === "angefordert" && x.zusatz?.startsWith("löst ") === true)).toBe(true);
    expect(anf.some((x) => x.art === "zugesagt")).toBe(true);
  });

  it("führt „verfügbar bis“ einer Einheit vor Ort und sortiert früheste zuerst", () => {
    const zustand = lage();
    const vorOrt = Object.values(zustand.einheiten).find((e) => e.status.wert === "IM_EINSATZ");
    if (vorOrt === undefined) throw new Error("Prüflage ohne Einheit im Einsatz");
    const frist = feldEreignis(H(1), 1, "ZeitpunktGesetzt", { einheitId: vorOrt.id, feld: "verfuegbarBis" }, null, "2020-01-01T08:00:00+01:00");
    const b = kommenUndGehen(lage(frist));
    expect(b[0]).toMatchObject({ art: "verfuegbarBis", zeitpunkt: "2020-01-01T08:00:00+01:00" });
    const zeiten = b.map((x) => (x.zeitpunkt === undefined ? Number.POSITIVE_INFINITY : Date.parse(x.zeitpunkt)));
    expect(zeiten).toEqual([...zeiten].sort((x, y) => x - y));
  });

  it("lässt stornierte Anforderungen weg und steht in der Stärketafel", () => {
    const vorher = kommenUndGehen(lage()).filter((x) => x.schluessel === "anforderung/A1");
    expect(vorher).toHaveLength(1);
    const storno = feldEreignis(H(2), 2, "AnforderungStorniert", { anforderungId: "A1" }, false, true, "Doppelt");
    expect(kommenUndGehen(lage(storno)).some((x) => x.schluessel === "anforderung/A1")).toBe(false);
    expect(staerketafel(lage()).kommenGehen?.length).toBeGreaterThan(0);
  });
});
