/**
 * Die Summenzeilen unter der Einheitentabelle zählen nach der einen Zählregel:
 * Ist-Stärke, erwartet und „Alle erfassten Einheiten“ stehen getrennt und
 * widersprechen dem Kopf nicht.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import type { Spalte, Tabellenzeile } from "@s1/domaene";
import { afterEach, describe, expect, it } from "vitest";

import { Tabellensumme, tabellensummen } from "./Tabellensumme.js";

afterEach(cleanup);

function zeile(id: string, f: number, u: number, m: number, teil: Partial<Tabellenzeile>): Tabellenzeile {
  return {
    einheitId: id,
    abschnittId: "EO",
    abschnittName: "EO",
    reihenfolge: 1,
    anzeige: id,
    staerke: { fuehrer: f, unterfuehrer: u, mannschaft: m },
    gesamt: f + u + m,
    zaehlklasse: "ist",
    entfernt: false,
    aufgegangen: false,
    hinweise: [],
    zellen: {},
    ...teil,
  };
}

const ZEILEN = [
  zeile("A", 0, 1, 8, {}),
  zeile("B", 1, 0, 3, {}),
  zeile("C", 0, 1, 5, { zaehlklasse: "erwartet" }),
  zeile("D", 0, 0, 2, { zaehlklasse: "beendet" }),
  zeile("E", 0, 0, 9, { zaehlklasse: "ausserhalb", entfernt: true }),
];

describe("tabellensummen", () => {
  it("zählt Ist, erwartet und alle erfassten Einheiten getrennt; Entfernte nie", () => {
    const summen = tabellensummen(ZEILEN);
    expect(summen.ist).toEqual({ fuehrer: 1, unterfuehrer: 1, mannschaft: 11 });
    expect(summen.erwartet).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 5 });
    expect(summen.alle).toEqual({ fuehrer: 1, unterfuehrer: 2, mannschaft: 18 });
  });

  it("ändert die Ist-Summe, wenn sich der Status (die Klasse) einer Zeile ändert", () => {
    const geaendert = ZEILEN.map((z) => (z.einheitId === "C" ? { ...z, zaehlklasse: "ist" as const } : z));
    expect(tabellensummen(geaendert).ist).toEqual({ fuehrer: 1, unterfuehrer: 2, mannschaft: 16 });
    expect(tabellensummen(geaendert).erwartet).toEqual({ fuehrer: 0, unterfuehrer: 0, mannschaft: 0 });
  });
});

describe("Tabellensumme", () => {
  const spalten = [
    { schluessel: "bezeichnung", kopf: "Bezeichnung", art: "text" },
    { schluessel: "staerke", kopf: "Stärke", art: "staerke" },
    { schluessel: "gesamt", kopf: "Gesamt", art: "berechnet" },
  ] as unknown as Spalte[];

  it("beschriftet die Zeilen ehrlich und trennt sie von der Ist-Stärke", () => {
    render(
      <table>
        <Tabellensumme zeilen={ZEILEN} spalten={spalten} ausschnitt={false} />
      </table>,
    );
    const ist = screen.getByText("Ist-Stärke").closest("tr") as HTMLElement;
    expect(within(ist).getByText("1/1/11")).toBeDefined();
    expect(within(ist).getByText("13")).toBeDefined();
    const alle = screen.getByText("Alle erfassten Einheiten").closest("tr") as HTMLElement;
    expect(within(alle).getByText("1/2/18")).toBeDefined();
    expect(screen.getByText("Erwartet")).toBeDefined();
  });

  it("nennt den Ausschnitt und lässt die Erwartet-Zeile ohne erwartete Kräfte weg", () => {
    render(
      <table>
        <Tabellensumme zeilen={[ZEILEN[0] as Tabellenzeile]} spalten={spalten} ausschnitt />
      </table>,
    );
    expect(screen.getByText("Ist-Stärke (Ausschnitt)")).toBeDefined();
    expect(screen.queryByText(/^Erwartet/)).toBeNull();
  });

  it("fasst Beschriftung und Zahlen in einer Zelle zusammen, damit sie beim Scrollen beisammen bleiben", () => {
    render(
      <table>
        <Tabellensumme zeilen={ZEILEN} spalten={spalten} ausschnitt={false} />
      </table>,
    );
    const zelle = screen.getByText("Alle erfassten Einheiten").closest("th") as HTMLElement;
    expect(zelle.getAttribute("colspan")).toBe(String(spalten.length + 1));
    expect(within(zelle).getByText("1/2/18")).toBeDefined();
    expect(within(zelle).getByText("21")).toBeDefined();
  });
});
