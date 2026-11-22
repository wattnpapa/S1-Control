/** Die Schrittbauer der Fachlage liefern Entwürfe, die das Schema ihrer Art annimmt. */

import { describe, expect, it } from "vitest";

import { KATALOG, projektion } from "@s1/domaene";

import { FACHLAGEARTEN, fachlageAenderung, fachlageAnlage } from "./fachlageschritte.js";

const ZEIT = "2026-11-22T10:00:00.000Z";
const BEISPIEL: Readonly<Record<string, Readonly<Record<string, unknown>>>> = {
  lage: { abschnittId: "EA1", zeitpunkt: ZEIT, lage: "Deich hält", ort: "" },
  pegel: { pegel: "Drielake", zeitpunkt: ZEIT, wertCm: 395 },
  deich: { deichKm: "3,4", art: "SICKERSTELLE", beschreibung: "", zeitpunkt: ZEIT },
  patienten: { kennung: "AK-1", sichtung: "SK2", einsatzkraft: true, zeitpunkt: ZEIT },
  amtshilfe: { kennung: "AH-1", an: "Bundeswehr", leistung: "Sandsackbefüllung", zeitpunkt: ZEIT },
  material: { bezeichnung: "Sandsäcke", menge: 5000, mengeneinheit: "Stück", zeitpunkt: ZEIT },
  presse: { titel: "Lage am Deich", text: "Der Deich hält.", zeitpunkt: ZEIT },
  stoerungen: { bereich: "FUNK", beschreibung: "Repeater aus", zeitpunkt: ZEIT },
};

describe("Die Schrittbauer der Fachlage", () => {
  it.each(projektion.FACHLAGE_BEREICHE)("baut für „%s“ eine Anlage, die das Schema annimmt, und lässt leere Felder weg", (bereich) => {
    const entwurf = fachlageAnlage(bereich, "ID-1", BEISPIEL[bereich] ?? {});
    expect(entwurf.typ).toBe(FACHLAGEARTEN[bereich].anlage);
    expect(KATALOG.get(entwurf.typ)?.schema.safeParse(entwurf.nutzlast).success).toBe(true);
    expect(Object.values(entwurf.nutzlast as object)).not.toContain("");
  });

  it("baut eine Feldänderung mit Vorher-Wert; leer wird null", () => {
    const entwurf = fachlageAenderung("stoerungen", "S1", "ersatzweg", { vorher: "Melder", neu: "" });
    expect(entwurf).toEqual({ typ: "StoerungGeaendert", nutzlast: { stoerungId: "S1", feld: "ersatzweg" }, vorher: "Melder", neu: null });
    expect(KATALOG.get(entwurf.typ)?.schema.safeParse(entwurf.nutzlast).success).toBe(true);
  });
});
