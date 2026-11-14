/**
 * Regression: Vokabularcodes eines Bogens erscheinen als Text, nicht als `#3`.
 *
 * Der Adapter bekam ohne ausdrueckliche Tabellen keine Nachschlagewerke und
 * schrieb die rohen Codes in die Lage — „#3 Bückeburg", Herkunft
 * „#1 Bückeburg (OBKB)", Fahrzeuge „#2".
 */

import { OrganisationsTyp, type Erfassungsbogen } from "@bos/eeb-format";
import { describe, expect, it } from "vitest";

import { pruefbogen as bogen } from "../pruefhilfen/pruefbogen.js";
import { uebersetzeBogen } from "./adapter.js";
import { vokabeltabellenFuer } from "./vokabeltabellen.js";

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
