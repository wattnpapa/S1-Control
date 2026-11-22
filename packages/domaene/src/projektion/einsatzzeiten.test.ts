/**
 * Einsatzzeiten und Ablösung (Stab-Review S1 FA-S1-2/FA-S1-5, LtrFüSt F3,
 * FW-A1): wer zuerst gehen muss, steht oben, mit dem Stand der Ablösung.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { einsatzzeiten } from "./einsatzzeiten.js";
import { stabsuebersicht } from "./stabsuebersicht.js";

let n = 0;
const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");

function einheit(id: string, status: string, abschnittId = "EA1"): EingehendesEreignis {
  return einheitGemeldet(h(), n, {
    einheitId: id, abschnittId, bezeichnung: `Einheit ${id}`, organisation: "FEUERWEHR", ebene: "ZUG",
    staerke: staerke(1, 2, 12), personalErfassung: "NUR_STAERKE", status,
  });
}

function zeit(einheitId: string, feld: string, wert: string): EingehendesEreignis {
  return feldEreignis(h(), n, "ZeitpunktGesetzt", { einheitId, feld }, null, wert);
}

function zustand() {
  n = 0;
  return materialisiere(falteHinzu(leereFaltung(), [
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1 Deich", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    abschnittAngelegt(h(), n, { abschnittId: "ANF", name: "Angefordert", abschnittstyp: "ANGEFORDERT", reihenfolge: 2 }),
    einheit("FF1", "IM_EINSATZ"),
    einheit("FF2", "RUHE"),
    einheit("FF3", "ANMARSCH", "ANF"),
    zeit("FF1", "eingetroffenAm", "2026-11-22T06:00:00.000Z"),
    zeit("FF1", "verfuegbarBis", "2026-11-22T18:00:00.000Z"),
    zeit("FF2", "eingetroffenAm", "2026-11-22T04:00:00.000Z"),
    anlageEreignis(h(), n, "AnforderungAngelegt", {
      anforderungId: "A1", kennung: "ANF-1", abzuloesendeEinheitId: "FF1", vorgeseheneEinheitText: "FF Westerstede", angefordertAm: "2026-11-22T12:00:00.000Z",
    }),
    feldEreignis(h(), n, "AbloesungZugesagt", { anforderungId: "A1" }, null, { zugesagtFuer: "2026-11-22T17:30:00.000Z", zugesagtVon: "KBM" }),
  ]));
}

describe("Einsatzzeiten und Ablösung", () => {
  it("führt nur Einheiten vor Ort, wer zuerst gehen muss oben, dann wer am längsten drin ist", () => {
    const zeilen = einsatzzeiten(zustand());
    expect(zeilen.map((z) => z.einheitId)).toEqual(["FF1", "FF2"]);
    expect(zeilen[0]).toMatchObject({ abschnitt: "EA 1 Deich", status: "Einsatz", eingetroffenAm: "2026-11-22T06:00:00.000Z", verfuegbarBis: "2026-11-22T18:00:00.000Z" });
  });

  it("nennt die zugesagte Ablösung mit wer und wann", () => {
    const ff1 = einsatzzeiten(zustand())[0];
    expect(ff1?.abloesung?.marke.text).toBe("Ablösung zugesagt");
    expect(ff1?.abloesung?.durch).toBe("FF Westerstede");
    expect(ff1?.abloesung?.zugesagtFuer).not.toBe("");
  });

  it("legt in der Übersicht daneben, was kommt, aber keine Fristen doppelt", () => {
    const uebersicht = stabsuebersicht(zustand());
    expect(uebersicht.einsatzzeiten).toHaveLength(2);
    expect(uebersicht.kommen.map((b) => b.art).sort()).toEqual(["anmarsch", "zugesagt"]);
  });
});
