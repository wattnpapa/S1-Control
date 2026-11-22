/** Die Mappe für die Lagebesprechung (Stab-Review LtrStab A2, S2 FA-S2-4). */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { lagevortrag } from "./lagevortrag.js";

let n = 0;
const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");

function ereignisse(): EingehendesEreignis[] {
  n = 0;
  return [
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), n, { einheitId: "U1", abschnittId: "EA1", bezeichnung: "B-Gr 1", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 8), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    feldEreignis(h(), n, "ZeitpunktGesetzt", { einheitId: "U1", feld: "verfuegbarBis" }, null, "2026-11-22T12:00:00.000Z"),
    anlageEreignis(h(), n, "AnforderungAngelegt", { anforderungId: "A1", kennung: "ANF-1", vorgeseheneEinheitText: "FGr WP", angefordertAm: "2026-11-22T08:00:00.000Z" }),
    anlageEreignis(h(), n, "EtbEintragErfasst", { etbId: "E1", zeitpunkt: "2026-11-22T09:00:00.000Z", text: "Lagebesprechung: Schwerpunkt EA 1" }),
  ];
}

describe("Der Lagevortrag", () => {
  it("bündelt Stärke, offene Anforderungen, ablaufende Verfügbarkeit und eigene Einträge", () => {
    const liste = ereignisse();
    const v = lagevortrag(materialisiere(falteHinzu(leereFaltung(), liste)), liste, "2026-11-22T10:00:00.000Z");
    expect(v.uebersicht.gesamt.gesamt).toBe(9);
    expect(v.anforderungen.map((a) => a.kennung)).toEqual(["ANF-1"]);
    expect(v.ablaufend.map((z) => z.einheitId)).toEqual(["U1"]);
    expect(v.eintraege).toHaveLength(1);
    expect(v.eintraege[0]?.satz).toContain("Schwerpunkt EA 1");
  });
});
