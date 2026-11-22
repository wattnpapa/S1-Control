/** Die Fachlage als Ansicht (Stab-Review 2026-11-22). */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import { fachlage } from "./fachlage.js";

let n = 0;
const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");
const um = (min: number): string => new Date(Date.UTC(2026, 10, 22, 6, min)).toISOString();

function lage(): EingehendesEreignis[] {
  n = 0;
  return [
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1 Deich", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    anlageEreignis(h(), n, "AbschnittslageGemeldet", { lageId: "L1", abschnittId: "EA1", zeitpunkt: um(0), lage: "ruhig" }),
    anlageEreignis(h(), n, "AbschnittslageGemeldet", { lageId: "L2", abschnittId: "EA1", zeitpunkt: um(30), lage: "Sickerstelle km 3,4" }),
    anlageEreignis(h(), n, "PegelstandGemessen", { messungId: "P1", pegel: "Drielake", zeitpunkt: um(0), wertCm: 380 }),
    anlageEreignis(h(), n, "PegelstandGemessen", { messungId: "P2", pegel: "Drielake", zeitpunkt: um(60), wertCm: 395, prognoseCm: 420 }),
    anlageEreignis(h(), n, "PegelstandGemessen", { messungId: "P3", pegel: "Drielake", zeitpunkt: um(90), wertCm: 999 }),
    feldEreignis(h(), n, "PegelstandGeaendert", { messungId: "P3", feld: "zurueckgezogen" }, null, true),
    anlageEreignis(h(), n, "PatientErfasst", { patientId: "X1", kennung: "AK-1", sichtung: "SK2", einsatzkraft: true, zeitpunkt: um(10) }),
    anlageEreignis(h(), n, "PatientErfasst", { patientId: "X2", kennung: "AK-2", sichtung: "SK3", einsatzkraft: false, zeitpunkt: um(20) }),
    anlageEreignis(h(), n, "StoerungGemeldet", { stoerungId: "S1", bereich: "FUNK", beschreibung: "Repeater aus", zeitpunkt: um(5) }),
    anlageEreignis(h(), n, "StoerungGemeldet", { stoerungId: "S2", bereich: "DRUCKER", beschreibung: "Papierstau", zeitpunkt: um(15) }),
    feldEreignis(h(), n, "StoerungGeaendert", { stoerungId: "S2", feld: "stand" }, null, "BEHOBEN"),
  ];
}

describe("Die Fachlage", () => {
  const f = fachlage(materialisiere(falteHinzu(leereFaltung(), lage())));

  it("zeigt je Abschnitt die jüngste Lage mit Abschnittsnamen", () => {
    expect(f.lageJeAbschnitt.map((z) => [z.abschnitt, z.werte["lage"]])).toEqual([["EA 1 Deich", "Sickerstelle km 3,4"]]);
    expect(f.zeilen.lage).toHaveLength(2);
  });

  it("rechnet je Pegel letzten Wert, Tendenz und Prognose ohne zurückgezogene Messung", () => {
    expect(f.pegelstaende).toEqual([
      { pegel: "Drielake", zeitpunkt: um(60), wertCm: 395, tendenzCm: 15, prognoseCm: 420, verlauf: [{ zeitpunkt: um(0), wertCm: 380 }, { zeitpunkt: um(60), wertCm: 395 }] },
    ]);
    expect(f.zeilen.pegel.at(-1)).toMatchObject({ id: "P3", stand: "ZURUECKGEZOGEN", erledigt: true });
  });

  it("zählt Patienten je Sichtungskategorie und Einsatzkräfte", () => {
    expect(f.patientensumme).toMatchObject({ SK1: 0, SK2: 1, SK3: 1, einsatzkraefte: 1, gesamt: 2 });
  });

  it("zählt offene Störungen; behobene stehen unten", () => {
    expect(f.offeneStoerungen).toBe(1);
    expect(f.zeilen.stoerungen.map((z) => [z.id, z.stand])).toEqual([["S1", "OFFEN"], ["S2", "BEHOBEN"]]);
  });
});
