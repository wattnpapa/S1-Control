/**
 * Laufende Aufträge je Abschnitt (Monitor „Aufträge", S3): nur offene, nicht
 * zurückgenommene; Abschnitt aus dem Auftrag, sonst von der Einheit.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { laufendeAuftraege } from "./auftragslage.js";
import { staerketafel } from "./staerketafel.js";

let n = 10;

function auftrag(nutzlast: Record<string, unknown>): EingehendesEreignis {
  n += 1;
  return anlageEreignis(hlc(n, 0, "aa"), n, "AuftragErfasst", { quelle: "MANUELL", ...nutzlast });
}

function lage(...dazu: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(
    falteHinzu(leereFaltung(), [
      einsatzAngelegt(hlc(1, 0, "aa"), 1, { einsatzId: "E1", name: "Hochwasser", art: "EINSATZ", fuestName: "LG", beginn: "2026-11-14T08:00:00+01:00", schichtmodell: "ZWEI_SCHICHT" }),
      abschnittAngelegt(hlc(2, 0, "aa"), 2, { abschnittId: "EA1", name: "Deich Nord", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
      abschnittAngelegt(hlc(3, 0, "aa"), 3, { abschnittId: "EA2", name: "Pumpen Süd", abschnittstyp: "EINSATZORT", reihenfolge: 2 }),
      einheitGemeldet(hlc(4, 0, "aa"), 4, {
        einheitId: "U1",
        abschnittId: "EA1",
        bezeichnung: "FGr WP 1",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: staerke(0, 1, 8),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
      }),
      ...dazu,
    ]),
  );
}

describe("Laufende Aufträge", () => {
  it("nimmt den Abschnitt der Einheit, wenn der Auftrag keinen nennt, und nennt Einheit und Status", () => {
    const z = laufendeAuftraege(lage(auftrag({ auftragId: "A1", einheitId: "U1", von: "2026-11-14T09:00:00+01:00", text: "Deich sichern" })));
    expect(z).toEqual([{ schluessel: "A1", abschnittId: "EA1", abschnitt: "Deich Nord", einheit: "FGr WP 1", status: "IM_EINSATZ", text: "Deich sichern", von: "2026-11-14T09:00:00+01:00" }]);
  });

  it("lässt beendete und zurückgenommene weg und nimmt den Abschnitt des Auftrags vor dem der Einheit", () => {
    const z = laufendeAuftraege(
      lage(
        auftrag({ auftragId: "A1", einheitId: "U1", abschnittId: "EA2", von: "2026-11-14T10:00:00+01:00", text: "Pumpen" }),
        auftrag({ auftragId: "A2", einheitId: "U1", von: "2026-11-14T08:00:00+01:00", bis: "2026-11-14T09:00:00+01:00", text: "Erkunden" }),
        auftrag({ auftragId: "A3", einheitId: "U1", abschnittId: "EA1", von: "2026-11-14T11:00:00+01:00", text: "Sandsäcke" }),
      ),
    );
    expect(z.map((x) => x.schluessel)).toEqual(["A1", "A3"]);
    expect(z[0]?.abschnitt).toBe("Pumpen Süd");
    expect(z[1]).toMatchObject({ einheit: "FGr WP 1", abschnitt: "Deich Nord" });
  });

  it("steht in der Stärketafel als additives Feld", () => {
    expect(staerketafel(lage(auftrag({ auftragId: "A1", einheitId: "U1", von: "2026-11-14T09:00:00+01:00", text: "Deich sichern" }))).auftraege).toHaveLength(1);
  });
});
