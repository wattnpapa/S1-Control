/**
 * Funktionalität: die Stammdaten des Einsatzes — das Blatt „Stammdaten“ der Excel.
 *
 * Beim Anlegen trägt der Einsatz als FüSt-Namen den Namen des Arbeitsplatzes;
 * erst die Stammdaten machen daraus den Namen, der auf jedem Ausdruck stehen
 * soll. Gemessen wird die echte Strecke: Entwurf aus `bedienschritte.ts`,
 * Prüfung im Aktendienst, Fold, Lagebild, Ausgabe und Rücknahme.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion } from "@s1/domaene";

import { stammdatenAenderung } from "../kontrakt/bedienschritte.js";
import { lagebildMit, type Lagebild } from "../kontrakt/index.js";
import { EINSATZ_ID, grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

async function angenommenEinEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

/** Das Lagebild, wie der Renderer es zusammensetzt: volles Bild, dann Deltas. */
function letztesLagebild(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}

describe("Szenario: Die Führungsstelle trägt ihre Stammdaten ein", () => {
  it("schreibt je Feld ein Ereignis und zeigt das Ergebnis im Lagebild", async () => {
    const platz = await angenommenEinEinsatz();
    const fuest = await platz.dienst.bediene(
      stammdatenAenderung(EINSATZ_ID, "fuestName", "FueSt Oldenburg", "FüSt Weser-Ems"),
    );
    const oben = await platz.dienst.bediene(
      stammdatenAenderung(EINSATZ_ID, "uebergeordneteFuestName", null, "TEL Landkreis Oldenburg"),
    );
    expect(fuest.art).toBe("geschrieben");
    expect(oben.art).toBe("geschrieben");

    expect(projektion.einsatzstammdaten(platz.dienst.zustand)).toMatchObject({
      fuestName: "FüSt Weser-Ems",
      uebergeordneteFuestName: "TEL Landkreis Oldenburg",
    });
    await platz.dienst.takt();
    expect(letztesLagebild(platz)?.stammdaten).toMatchObject({
      name: "Hochwasser Weser-Ems",
      fuestName: "FüSt Weser-Ems",
      uebergeordneteFuestName: "TEL Landkreis Oldenburg",
    });
  });

  it("weist einen leeren FüSt-Namen ab, bevor eine Zeile entsteht", async () => {
    const platz = await angenommenEinEinsatz();
    const vorher = platz.dienst.zustand;
    const ergebnis = await platz.dienst.bediene(
      stammdatenAenderung(EINSATZ_ID, "fuestName", "FueSt Oldenburg", "   "),
    );
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: "SCHEMA" });
    expect(platz.dienst.zustand).toBe(vorher);
  });

  it("weist eine unbekannte Einsatzart ab", async () => {
    const platz = await angenommenEinEinsatz();
    const ergebnis = await platz.dienst.bediene(stammdatenAenderung(EINSATZ_ID, "art", "EINSATZ", "MANÖVER"));
    expect(ergebnis.art).toBe("abgewiesen");
  });

  it("nimmt eine Änderung mit Strg+Z zurück — der alte Name gilt wieder", async () => {
    const platz = await angenommenEinEinsatz();
    await platz.dienst.bediene(stammdatenAenderung(EINSATZ_ID, "fuestName", "FueSt Oldenburg", "FüSt Neu"));
    const zurueck = await platz.dienst.zurueck();
    expect(zurueck.art).toBe("geschrieben");
    expect(projektion.einsatzstammdaten(platz.dienst.zustand)?.fuestName).toBe("FueSt Oldenburg");
  });
});
