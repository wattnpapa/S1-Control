/**
 * Der Rücklauf (Stab-Review Sichter): verteilte grüne Kopien, die noch nicht
 * erledigt sind, je Stelle — dringendste und älteste zuerst.
 */

import { describe, expect, it } from "vitest";

import type { Nachrichtenzeile } from "./nachrichtenzeile.js";
import { ruecklauf } from "./ruecklauf.js";

function zeile(teil: Partial<Nachrichtenzeile>): Nachrichtenzeile {
  return {
    id: "N1", richtungKurz: "E", nummer: 1, betreff: "Lage", vorrangstufe: 2, zurueckgezogen: false,
    sichtung: { zeitpunkt: "2026-11-22T10:00:00.000Z", handzeichen: "Si", verteiler: [] },
    verteiler: [],
    ...teil,
  } as unknown as Nachrichtenzeile;
}

const gruen = (stelle: string, gelesen = false, erledigt = false): Nachrichtenzeile["verteiler"][number] => ({ stelle, kopie: "GRUEN", gelesen, erledigt });

describe("Der Rücklauf", () => {
  it("zählt je Stelle nur offene grüne Kopien und stellt den ungelesenen Blitz nach vorn", () => {
    const zeilen = [
      zeile({ id: "N1", nummer: 10, verteiler: [{ stelle: "S2", kopie: "ROT", gelesen: false, erledigt: false }, gruen("S4", true)] }),
      zeile({ id: "N2", nummer: 11, vorrangstufe: 0, betreff: "Deichbruch", sichtung: { zeitpunkt: "2026-11-22T10:20:00.000Z" } as never, verteiler: [gruen("S3")] }),
      zeile({ id: "N3", nummer: 12, verteiler: [gruen("S3", true, true)] }),
    ];
    const ergebnis = ruecklauf(zeilen);
    expect(ergebnis.map((z) => z.stelle)).toEqual(["S3", "S4"]);
    expect(ergebnis[0]).toMatchObject({ ungelesen: 1, kopien: [{ nachrichtId: "N2", kennzeichen: "E 11", vorrangstufe: 0, gelesen: false }] });
    expect(ergebnis[1]?.ungelesen).toBe(0);
  });

  it("lässt Zurückgezogenes, Ungesichtetes und die eigene Kopie des Verfassers weg", () => {
    const zeilen = [
      zeile({ id: "N1", zurueckgezogen: true, verteiler: [gruen("S3")] }),
      zeile({ id: "N2", sichtung: undefined, verteiler: [gruen("S3")] } as never),
      zeile({ id: "N3", verteiler: [{ ...gruen("S1"), eigenerAusgang: true }] }),
    ];
    expect(ruecklauf(zeilen)).toEqual([]);
  });
});
