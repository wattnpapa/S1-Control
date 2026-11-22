/**
 * Die Zeilen der Monitorlisten: Warteschlange, Lageticker, Aufträge,
 * Sofortbedarf und „Funk still".
 */

import { describe, expect, it } from "vitest";

import { monitorFunkansicht } from "./pruefhilfen/monitorfunkbeispiel.js";
import { TICKER, WARTENDE } from "./pruefhilfen/monitorlistenbeispiel.js";
import { BEISPIEL_STAERKETAFEL } from "./pruefhilfen/staerketafelbeispiel.js";
import { BEISPIEL_ANSICHT } from "./pruefhilfen/versorgungsbeispiel.js";
import { auftragszeilen, sofortbedarfssumme, sofortbedarfszeilen, stillzeilen, tickerzeilen, warteschlangenzeilen } from "./monitorListen.js";

describe("Monitorlisten", () => {
  it("stellt in der Warteschlange Blitz vor Sofort vor einfach, längste Wartezeit zuerst, ohne Inhalt", () => {
    const z = warteschlangenzeilen(WARTENDE);
    expect(z.map((x) => x.schluessel)).toEqual(["W2", "W3", "W1", "W5"]);
    expect(z[0]).toMatchObject({ warn: true, zellen: ["Blitz", "E", "folgt", "EA 1 Deich Nord", "vor dem Sichter", "4 min"] });
    expect(z[1]?.warn).toBe(true);
    expect(z[2]?.warn).toBe(false);
    expect(z.flatMap((x) => x.zellen).join(" ")).not.toContain("geheim");
  });

  it("lässt im Lageticker die Stammdatenpflege weg und markiert Rücknahmen", () => {
    const z = tickerzeilen(TICKER);
    expect(z).toHaveLength(3);
    expect(z.find((x) => x.zellen[1]?.startsWith("Zurückgenommen"))?.warn).toBe(true);
  });

  it("gruppiert Aufträge nach Abschnitt in der Ordnung der Stärketafel", () => {
    const z = auftragszeilen(BEISPIEL_STAERKETAFEL.tafel) ?? [];
    expect(z.map((x) => (x.gruppe === true ? `[${x.zellen[0] ?? ""}]` : x.schluessel))).toEqual(["[LK Friesland]", "A1", "A3", "[Stadt Wilhelmshaven]", "A2"]);
    expect(z.find((x) => x.schluessel === "A2")).toMatchObject({ warn: true, zellen: ["101030", "BGr OV Varel", "Sandsäcke füllen, Halle 3", "Nicht einsatzbereit"] });
    expect(auftragszeilen({ ...BEISPIEL_STAERKETAFEL.tafel, auftraege: undefined } as never)).toBeUndefined();
  });

  it("nennt beim Sofortbedarf nur offene Felder und die offene Summe", () => {
    const liste = BEISPIEL_ANSICHT.blatt.sofortbedarf;
    const z = sofortbedarfszeilen(liste);
    expect(z.length).toBeGreaterThan(0);
    expect(z.every((x) => (x.zellen[3] ?? "") !== "")).toBe(true);
    expect(sofortbedarfssumme(liste)).toMatch(/^offen gesamt: /);
    expect(sofortbedarfssumme({ ...liste, offen: { verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: 0, ruhezeit: 0, zeilen: 0 } })).toBe("");
  });

  it("nennt still gewordene Einheiten mit Rufgruppe und Alter, jede einmal", () => {
    const ansicht = monitorFunkansicht();
    const z = stillzeilen(ansicht.plan, ansicht.jetzt);
    const still = z.filter((x) => x.zellen[3] === "still");
    expect(still.length).toBeGreaterThan(0);
    expect(still[0]?.zellen[2]).not.toBe("—");
    expect(new Set(z.map((x) => x.schluessel)).size).toBe(z.length);
  });
});
