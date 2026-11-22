/**
 * Einsatzwert je Organisation und Abschnitt (Monitor „Status", „Einsatzmittel").
 * Die Zusage: dieselbe Zählregel wie die Stärketafel — die Zeilen ergeben die
 * Ist-Stärke, Erwartete und Beendete zählen nicht.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, einheitGemeldet, einsatzAngelegt, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { STATUSSPALTEN, statustafel, type Statuszeile } from "./einsatzstatus.js";
import { staerketafel } from "./staerketafel.js";

let n = 10;

function einheit(id: string, abschnittId: string, koepfe: number, organisation: string, status: string): EingehendesEreignis {
  n += 1;
  return einheitGemeldet(hlc(n, 0, "aa"), n, {
    einheitId: id,
    abschnittId,
    bezeichnung: `Einheit ${id}`,
    organisation,
    ebene: "GRUPPE",
    staerke: staerke(0, 1, koepfe - 1),
    personalErfassung: "NUR_STAERKE",
    status,
  });
}

function lage(): Zustand {
  return materialisiere(
    falteHinzu(leereFaltung(), [
      einsatzAngelegt(hlc(1, 0, "aa"), 1, { einsatzId: "E1", name: "Hochwasser", art: "EINSATZ", fuestName: "LG", beginn: "2026-11-14T08:00:00+01:00", schichtmodell: "ZWEI_SCHICHT" }),
      abschnittAngelegt(hlc(2, 0, "aa"), 2, { abschnittId: "ANF", name: "Angefordert", abschnittstyp: "ANGEFORDERT", reihenfolge: 1 }),
      abschnittAngelegt(hlc(3, 0, "aa"), 3, { abschnittId: "EA1", name: "Deich", abschnittstyp: "EINSATZORT", reihenfolge: 2 }),
      abschnittAngelegt(hlc(4, 0, "aa"), 4, { abschnittId: "BR", name: "Bereitstellung", abschnittstyp: "BEREITSTELLUNGSRAUM", reihenfolge: 3 }),
      einheit("U1", "EA1", 9, "THW", "IM_EINSATZ"),
      einheit("U2", "EA1", 6, "FEUERWEHR", "RUHE"),
      einheit("U3", "BR", 4, "DRK", "EINSATZBEREIT"),
      einheit("U4", "BR", 3, "THW", "NICHT_EINSATZBEREIT"),
      einheit("U5", "ANF", 8, "THW", "ANMARSCH"),
      einheit("U6", "EA1", 2, "THW", "RUECKMARSCH"),
    ]),
  );
}

function koepfe(zeile: Statuszeile | undefined): number {
  return STATUSSPALTEN.reduce((summe, s) => summe + (zeile?.[s].koepfe ?? 0), 0);
}

describe("Einsatzwert je Organisation und Abschnitt", () => {
  it("zählt nur Kräfte vor Ort und ergibt in Summe die Ist-Stärke", () => {
    const z = lage();
    const t = statustafel(z);
    expect(koepfe(t.gesamt)).toBe(staerketafel(z).gesamt.gesamt);
    expect(t.gesamt.IM_EINSATZ).toEqual({ einheiten: 1, koepfe: 9 });
    expect(t.gesamt.EINSATZBEREIT).toEqual({ einheiten: 1, koepfe: 4 });
    expect(t.gesamt.NICHT_EINSATZBEREIT).toEqual({ einheiten: 1, koepfe: 3 });
  });

  it("verteilt je Organisation und je eigenem Abschnitt", () => {
    const t = statustafel(lage());
    expect(t.jeOrganisation["THW"]?.IM_EINSATZ.koepfe).toBe(9);
    expect(t.jeOrganisation["THW"]?.NICHT_EINSATZBEREIT.koepfe).toBe(3);
    expect(t.jeOrganisation["FEUERWEHR"]?.RUHE).toEqual({ einheiten: 1, koepfe: 6 });
    expect(t.jeAbschnitt["BR"]?.EINSATZBEREIT.einheiten).toBe(1);
    expect(koepfe(t.jeAbschnitt["EA1"])).toBe(15);
    expect(t.jeAbschnitt["ANF"]).toBeUndefined();
  });

  it("steht in der Stärketafel als additives Feld", () => {
    expect(staerketafel(lage()).status?.gesamt.RUHE.koepfe).toBe(6);
  });
});
