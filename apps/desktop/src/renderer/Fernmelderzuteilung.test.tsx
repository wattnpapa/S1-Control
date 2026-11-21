/**
 * Fernmelder Fm1 bis Fm3 als eigene Stellen (2026-11-21): Stellenwahl,
 * Zuteilung durch den LdF und die Warteschlange des Fernmelders.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import { Warteschlange } from "./Fernmeldezentrale.js";
import { eigeneZuerst, fernmelderbeschriftung, mirZugeteilt, nurZugeteilte } from "./fernmelderzuteilung.js";
import { ARBEITSPLATZSTELLEN } from "./nachrichtenformate.js";
import { ersteSicht } from "./Nachrichtenkopf.js";
import { VOR_SICHTER } from "./pruefhilfen/nachrichtenbeispiel.js";
import { nachrichtenzahl } from "./Reiterzeile.js";
import { Stellenabfrage, TEXT_FMZ_AUFGETEILT, abfolge } from "./Stellenabfrage.js";
import { stelleFehlt } from "./Stellenvorbehalt.js";

afterEach(cleanup);

function ausgang(id: string, fernmelder?: string): Nachrichtenzeile {
  return {
    ...VOR_SICHTER,
    id,
    richtung: "AUSGANG",
    richtungKurz: "A",
    betreff: `Betreff ${id}`,
    laufzustand: "VOR_FMZ",
    ...(fernmelder === undefined ? {} : { vorschlag: { mittel: "FUNK", fernmelder, zeitpunkt: "2026-11-21T09:00:00.000Z", handzeichen: "Ld" } }),
  };
}

const ZEILEN = [ausgang("A1", "Fm1"), ausgang("A2"), ausgang("A3", "Fm2"), ausgang("A4", "fm2")];

describe("Zuteilung und Ordnung", () => {
  it("stellt die eigenen Zuteilungen voran, dann die ohne Zuteilung, dann die der anderen", () => {
    expect(eigeneZuerst(ZEILEN, ["FM2"]).map((z) => z.id)).toEqual(["A3", "A4", "A2", "A1"]);
    expect(nurZugeteilte(ZEILEN, ["FM2"]).map((z) => z.id)).toEqual(["A3", "A4"]);
    expect(mirZugeteilt(ZEILEN[0] as Nachrichtenzeile, ["FM1"])).toBe(true);
  });

  it("lässt die Ordnung ohne eigene Fernmelderstelle unverändert — LdF und Altwert FMZ", () => {
    expect(eigeneZuerst(ZEILEN, ["LDF"])).toBe(ZEILEN);
    expect(eigeneZuerst(ZEILEN, ["FMZ"])).toBe(ZEILEN);
  });

  it("beschriftet die Wahl mit dem Platz, der den Fernmelder besetzt", () => {
    expect(fernmelderbeschriftung("Fm2", { Fm2: "Meyer" })).toBe("Fm2 · Meyer");
    expect(fernmelderbeschriftung("Fm3", { Fm2: "Meyer" })).toBe("Fm3 (nicht besetzt)");
    expect(fernmelderbeschriftung("Arbeitsplatz 1", {})).toBe("Arbeitsplatz 1");
    expect(fernmelderbeschriftung("Fm1", undefined)).toBe("Fm1");
  });
});

describe("Warteschlange eines Fernmelders", () => {
  it("zeigt die Zuteilungen zuoberst mit „für Sie“ und blendet mit „nur meine“ den Rest aus", () => {
    render(<Warteschlange zeilen={ZEILEN} jetzt="2026-11-21T09:30:00.000Z" gewaehltId={undefined} nurLesen={false} aufWahl={vi.fn()} aufSchritt={vi.fn()} stellen={["FM2"]} />);
    const tabelle = screen.getByRole("table", { name: "Nachrichten vor der FmZ" });
    const zeilen = within(tabelle).getAllByRole("row").slice(1);
    expect(zeilen.map((z) => within(z).getByRole("rowheader").textContent)).toEqual(["Betreff A3", "Betreff A4", "Betreff A2", "Betreff A1"]);
    expect(within(tabelle).getAllByText("für Sie")).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: "nur meine (Fm2)" }));
    expect(within(screen.getByRole("table", { name: "Nachrichten vor der FmZ" })).getAllByRole("row")).toHaveLength(3);
  });

  it("hat für den LdF und den Altwert FMZ keinen Umschalter", () => {
    render(<Warteschlange zeilen={ZEILEN} jetzt="2026-11-21T09:30:00.000Z" gewaehltId={undefined} nurLesen={false} aufWahl={vi.fn()} aufSchritt={vi.fn()} stellen={["FMZ"]} />);
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByText("für Sie")).toBeNull();
  });
});

describe("Stellen LdF und Fm1 bis Fm3 statt FmZ", () => {
  it("bietet Fm1 bis Fm3 zur Wahl, die FmZ nicht mehr; die Stationen stehen vorn", () => {
    expect(ARBEITSPLATZSTELLEN).toEqual(expect.arrayContaining(["LDF", "FM1", "FM2", "FM3"]));
    expect(ARBEITSPLATZSTELLEN).not.toContain("FMZ");
    expect(abfolge(ARBEITSPLATZSTELLEN).slice(0, 5)).toEqual(["LDF", "FM1", "FM2", "FM3", "SICHTER"]);
  });

  it("belegt den Altwert FMZ nicht vor und sagt, dass die Stelle aufgeteilt ist", () => {
    render(<Stellenabfrage vorbelegung={{ stellen: ["FMZ"], handzeichen: "Ka" }} aufBestaetigen={vi.fn()} aufAbbrechen={vi.fn()} />);
    expect(screen.getByText(TEXT_FMZ_AUFGETEILT)).toBeTruthy();
    expect((screen.getByRole("checkbox", { name: "Fm2" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("führt einen Fernmelder in die Sicht der FmZ, zählt seine Warteschlange und lässt ihn befördern", () => {
    expect(ersteSicht(["FM3"])).toBe("fmz");
    expect(ersteSicht(["LDF", "FM1"])).toBe("ldf");
    expect(nachrichtenzahl({ neuFuerStellen: 1, vorFmz: 2, vorSichter: 4 } as never, ["FM1"])).toBe(3);
    expect(stelleFehlt("befoerderung", ["FM2"], [])).toBe(false);
    expect(stelleFehlt("befoerderung", ["S4"], [])).toBe(true);
    // Ersatzregel: Ohne besetzten LdF teilt der Fernmelder selbst zu.
    expect(stelleFehlt("vorschlag", ["FM1"], [])).toBe(false);
    expect(stelleFehlt("vorschlag", ["FM1"], [{ veraltet: false, stellen: ["LDF"] }])).toBe(true);
  });
});
