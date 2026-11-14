/**
 * Regression: Vokabularcodes eines Bogens erscheinen als Text, nicht als `#3`.
 *
 * Der Adapter bekam ohne ausdrueckliche Tabellen keine Nachschlagewerke und
 * schrieb die rohen Codes in die Lage — „#3 Bückeburg", Herkunft
 * „#1 Bückeburg (OBKB)", Fahrzeuge „#2".
 */

import { OrganisationsTyp, type Erfassungsbogen } from "@bos/eeb-format";
import { describe, expect, it } from "vitest";

import { uebersetzeBogen } from "./adapter.js";
import { vokabeltabellenFuer } from "./vokabeltabellen.js";

/** Gekuerzt aus `pruefdaten/eeb/thw/001-albstadt-ztr-tz.json`. */
function bogen(): Erfassungsbogen {
  const funkruf = (zweite: number) => ({
    kennwort: { code: 1 },
    eigenerStandort: true,
    teile: [21, zweite],
  });
  return {
    schemaVersion: 8,
    stand: 3_440_645,
    einheit: {
      organisation: OrganisationsTyp.THW,
      einheitsTyp: { code: 3 },
      hierarchie: [
        { bezeichnung: { code: 1 }, name: "Albstadt", kurz: "OALB" },
        { bezeichnung: { code: 2 }, name: "Tübingen" },
        { bezeichnung: { code: 3 }, name: "Baden-Württemberg" },
      ],
    },
    personalErfassung: 0,
    personal: [
      {
        vorname: "Max",
        nachname: "Muster",
        staerkeRolle: 2,
        funktionen: [{ code: 1 }],
        fahrerlaubnis: 9,
        geschlecht: 1,
        ernaehrung: 1,
        kontakte: [],
        zusatzqualifikationen: [],
      },
    ],
    fahrzeuge: [
      { typ: { code: 2 }, stanKonform: true, kennzeichen: "THW-80101", funkrufname: funkruf(10) },
      { typ: { freitext: "MzKW" }, stanKonform: false, kennzeichen: "THW-80102", funkrufname: funkruf(54) },
    ],
  } as unknown as Erfassungsbogen;
}

const AUFTRAG = { einheitId: "E-1", abschnittId: "A-1" } as const;

describe("Vokabeltabellen im Bogenadapter", () => {
  it("löst Einheitstyp, Ebene, Fahrzeug, Funktion und Kennwort eines THW-Bogens auf", () => {
    const { einheit, fahrzeuge, personen } = uebersetzeBogen(bogen(), AUFTRAG);

    expect(einheit["bezeichnung"]).toBe("Zugtrupp Technischer Zug Albstadt");
    expect(einheit["ebene"]).toBe("ZUGTRUPP");
    const hierarchie = einheit["hierarchie"] as { art: string }[];
    expect(hierarchie.map((h) => h.art)).toEqual(["Ortsverband", "Regionalbereich", "Landesverband"]);
    expect(fahrzeuge[0]?.["typ"]).toBe("FüKW");
    expect((fahrzeuge[0]?.["funkrufname"] as { kennwort: string }).kennwort).toBe("Heros");
    expect(personen[0]?.["funktionen"]).toEqual(["ZFü"]);
  });

  it("lässt keinen rohen Code stehen, wo das Vokabular ihn kennt", () => {
    const text = JSON.stringify(uebersetzeBogen(bogen(), AUFTRAG));
    expect(text).not.toMatch(/"#\d+/);
  });

  it("behält Freitext und fällt bei unbekannten Codes auf `#n` zurück", () => {
    const tabellen = vokabeltabellenFuer(OrganisationsTyp.THW);
    expect(tabellen.fahrzeugtyp?.(9999)).toBeUndefined();

    const roh = bogen();
    const fremd: Erfassungsbogen = {
      ...roh,
      einheit: { ...roh.einheit, einheitsTyp: { code: 9999 } },
    };
    expect(uebersetzeBogen(fremd, AUFTRAG).einheit["bezeichnung"]).toBe("#9999 Albstadt");
    expect(uebersetzeBogen(roh, AUFTRAG).fahrzeuge[1]?.["typ"]).toBe("MzKW");
  });

  it("kennt für Organisationen ohne Typvokabular nur die Hierarchie-Ebenen", () => {
    const tabellen = vokabeltabellenFuer(OrganisationsTyp.FEUERWEHR);
    expect(tabellen.einheitstyp?.(3)).toBeUndefined();
    expect(tabellen.hierarchieEbene?.(1)).toBeDefined();
  });
});
