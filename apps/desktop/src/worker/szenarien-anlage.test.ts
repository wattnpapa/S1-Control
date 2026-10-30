/**
 * Funktionalität: Einheit anlegen — aus Vorlage und als freie Zeile.
 *
 * Die Excel kennt beide Wege, und beide müssen im Aktendienst dieselbe
 * Einheit ergeben: dieselbe Zeile, dieselben Summen. Der einzige Unterschied
 * ist der Verweis auf die Vorlage. Die Entwürfe baut dieselbe Funktion wie
 * die Maske (`einheitsanlage.ts`).
 */

import { afterEach, describe, expect, it } from "vitest";

import { vorlage, type Tabellenzeile } from "@s1/domaene";

import { anlageAusVorlage } from "../kontrakt/bedienschritte.js";
import { einheitsanlage } from "../kontrakt/einheitsanlage.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

async function angenommenEinEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

function zeileVon(platz: Platz, einheitId: string): Tabellenzeile {
  const zeilen = platz.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1" }).zeilen;
  const gefunden = zeilen.find((zeile) => zeile.einheitId === einheitId);
  expect(gefunden, einheitId).toBeDefined();
  return gefunden as Tabellenzeile;
}

/** Was eine Zeile zeigt, ohne das, was zwei Einheiten nie teilen. */
function inhalt(zeile: Tabellenzeile): Record<string, unknown> {
  const zellen = Object.fromEntries(Object.entries(zeile.zellen).map(([schluessel, z]) => [schluessel, z.text]));
  return { anzeige: zeile.anzeige, staerke: zeile.staerke, abschnitt: zeile.abschnittId, zellen };
}

describe("Funktionalität: Einheit anlegen", () => {
  it("Szenario: eine Einheit ohne Vorlage anlegen", async () => {
    const platz = await angenommenEinEinsatz();
    const ergebnis = await platz.dienst.bediene(
      einheitsanlage({
        einheitId: "E-FREI",
        abschnittId: "EO",
        bezeichnung: "Pumpengruppe Hude",
        organisation: "FEUERWEHR",
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 },
        reihenfolge: 2,
        herkunft: "FF Hude",
      }),
    );
    expect(ergebnis.art).toBe("geschrieben");

    const einheit = platz.dienst.zustand.einheiten["E-FREI"];
    expect(einheit?.bezeichnung.wert).toBe("Pumpengruppe Hude");
    expect(einheit?.status.wert).toBe("ANGEFORDERT");
    expect(einheit?.vorlageId).toBeUndefined();
    expect(zeileVon(platz, "E-FREI").gesamt).toBe(6);
  });

  it("Szenario: frei angelegt ergibt dieselbe Zeile wie aus der Vorlage", async () => {
    const platz = await angenommenEinEinsatz();
    const zsb = vorlage("kats-z-sb");
    if (zsb === undefined) throw new Error("Vorlage kats-z-sb fehlt");

    await platz.dienst.bediene(
      anlageAusVorlage({ einheitId: "E-VORLAGE", abschnittId: "EO", vorlage: zsb, reihenfolge: 2, organisation: "MHD" }),
    );
    await platz.dienst.bediene(
      einheitsanlage({
        einheitId: "E-FREI",
        abschnittId: "EO",
        bezeichnung: zsb.bezeichnung,
        organisation: "MHD",
        ebene: zsb.ebene,
        staerke: zsb.sollStaerke ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
        reihenfolge: 2,
      }),
    );

    expect(inhalt(zeileVon(platz, "E-FREI"))).toEqual(inhalt(zeileVon(platz, "E-VORLAGE")));
    expect(platz.dienst.zustand.einheiten["E-VORLAGE"]?.vorlageId?.wert).toBe("kats-z-sb");
    expect(platz.dienst.zustand.einheiten["E-FREI"]?.vorlageId).toBeUndefined();
    expect(platz.dienst.zustand.einheiten["E-FREI"]?.organisation.wert).toBe("MHD");
  });
});
