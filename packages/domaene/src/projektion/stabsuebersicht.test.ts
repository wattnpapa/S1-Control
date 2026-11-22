/**
 * Die Stabsübersicht (Stab-Review LtrStab A1/LS-1, LtrFüSt F1, S1 FA-S1-1,
 * S3 FA-S3-1/FA-S3-3): Köpfe nach Status je Teilbaum, alle Aufträge.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { stabsuebersicht } from "./stabsuebersicht.js";

const EA2 = abschnittAngelegt(hlc(1, 0, "a"), 1, { abschnittId: "EA2", name: "EA 2 Innenstadt", abschnittstyp: "EINSATZORT", reihenfolge: 1 });
const UA21 = abschnittAngelegt(hlc(2, 0, "a"), 2, {
  abschnittId: "UA21", name: "UA 2.1 Pumpstelle", abschnittstyp: "EINSATZORT", parentId: "EA2", reihenfolge: 1,
});

function einheit(n: number, id: string, abschnittId: string, status: string, st = staerke(0, 1, 8)): EingehendesEreignis {
  return einheitGemeldet(hlc(10 + n, 0, "a"), 10 + n, {
    einheitId: id, abschnittId, bezeichnung: `Einheit ${id}`, organisation: "THW", ebene: "GRUPPE",
    staerke: st, personalErfassung: "NUR_STAERKE", status,
  });
}

function auftrag(n: number, id: string, einheitId: string, von: string, textwert: string): EingehendesEreignis {
  return anlageEreignis(hlc(30 + n, 0, "a"), 30 + n, "AuftragErfasst", { auftragId: id, einheitId, von, text: textwert, quelle: "MANUELL" });
}

function zustand(...ereignisse: EingehendesEreignis[]) {
  return materialisiere(falteHinzu(leereFaltung(), [EA2, UA21, ...ereignisse]));
}

describe("Die Stabsübersicht, Kräfte", () => {
  it("rechnet die Unterabschnitte in den Einsatzabschnitt ein und zählt nach Status", () => {
    const uebersicht = stabsuebersicht(zustand(
      einheit(1, "U1", "UA21", "IM_EINSATZ", staerke(0, 4, 15)),
      einheit(2, "U2", "EA2", "RUHE", staerke(0, 1, 8)),
      einheit(3, "U3", "UA21", "ANMARSCH", staerke(0, 1, 5)),
    ));
    const ea = uebersicht.kraefte.find((z) => z.abschnittId === "EA2");
    const ua = uebersicht.kraefte.find((z) => z.abschnittId === "UA21");
    expect(ea?.je.IM_EINSATZ).toBe(19);
    expect(ea?.je.RUHE).toBe(9);
    expect(ea?.gesamt).toBe(28);
    expect(ea?.erwartet).toBe(6);
    expect(ua?.gesamt).toBe(19);
    // Baumordnung: der Einsatzabschnitt vor seinem Unterabschnitt.
    expect(uebersicht.kraefte.map((z) => z.abschnittId)).toEqual(["EA2", "UA21"]);
    expect(ua?.tiefe).toBeGreaterThan(ea?.tiefe ?? 99);
    expect(uebersicht.gesamt.gesamt).toBe(28);
  });

  it("lässt Abschnitte ohne Kräfte weg und zählt Rückmarsch nicht", () => {
    const uebersicht = stabsuebersicht(zustand(einheit(1, "U1", "EA2", "RUECKMARSCH")));
    expect(uebersicht.kraefte).toEqual([]);
    expect(uebersicht.gesamt.gesamt).toBe(0);
  });
});

describe("Die Stabsübersicht, Aufträge", () => {
  it("führt alle Aufträge aller Einheiten mit Einheit und Abschnitt, offene zuerst", () => {
    const uebersicht = stabsuebersicht(zustand(
      einheit(1, "U1", "UA21", "IM_EINSATZ"),
      einheit(2, "U2", "EA2", "IM_EINSATZ"),
      auftrag(1, "A1", "U1", "2026-11-22T15:00:00.000Z", "Pumpen Marktplatz"),
      auftrag(2, "A2", "U2", "2026-11-22T14:00:00.000Z", "Sandsäcke füllen"),
      auftrag(3, "A3", "U2", "2026-11-22T13:00:00.000Z", "Erkunden"),
      feldEreignis(hlc(40, 0, "a"), 40, "AuftragBeendet", { auftragId: "A3" }, null, "2026-11-22T13:30:00.000Z"),
    ));
    expect(uebersicht.auftraege.map((a) => a.auftragId)).toEqual(["A2", "A1", "A3"]);
    const pumpen = uebersicht.auftraege.find((a) => a.auftragId === "A1");
    expect(pumpen).toMatchObject({ einheit: "Einheit U1", abschnitt: "UA 2.1 Pumpstelle", offen: true });
    expect(uebersicht.auftraege.find((a) => a.auftragId === "A3")?.offen).toBe(false);
  });

  it("sortiert Zeitpunkte mit Offset nach der Zeit und nicht nach dem Text", () => {
    const uebersicht = stabsuebersicht(zustand(
      einheit(1, "U1", "EA2", "IM_EINSATZ"),
      auftrag(1, "A1", "U1", "2026-11-22T15:30:00+01:00", "später als es aussieht? nein: 14:30Z"),
      auftrag(2, "A2", "U1", "2026-11-22T15:00:00.000Z", "15:00Z"),
    ));
    expect(uebersicht.auftraege.map((a) => a.auftragId)).toEqual(["A1", "A2"]);
  });
});
