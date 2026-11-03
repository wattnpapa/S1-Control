/**
 * Komponententests zur Abarbeitung des Sofortbedarfs (S4.4).
 *
 * Mehrfachauswahl, ein Ereignis je Feld, nur dort, wo sich etwas ändert;
 * „Wieder öffnen"; erledigte Zeilen blass und ausblendbar; offene Summen;
 * die Kraftstoffliste als Ausgabe.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BEISPIEL_ANSICHT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { VersorgungSofortbedarf } from "./VersorgungSofortbedarf.js";
import { abarbeitung } from "../kontrakt/versorgungsschritte.js";

afterEach(cleanup);

let attrappe: Attrappe;
const LISTE = BEISPIEL_ANSICHT.blatt.sofortbedarf;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

const bedient = (): unknown[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

describe("Die Schritte der Abarbeitung", () => {
  it("schreibt je Feld ein Ereignis und nur, wo sich etwas ändert", () => {
    expect(abarbeitung(LISTE.zeilen, new Set(["E1"]), "erledigt").map((e) => (e.nutzlast as { feld: string }).feld)).toEqual([
      "DIESEL",
      "BENZIN",
      "UNTERBRINGUNG",
      "RUHEZEIT",
    ]);
    expect(abarbeitung(LISTE.zeilen, new Set(["E1"]), "erledigt", "DIESEL")).toHaveLength(1);
    expect(abarbeitung(LISTE.zeilen, new Set(["E1"]), "offen")).toEqual([
      { typ: "SofortbedarfWiederOffen", nutzlast: { einheitId: "E1", feld: "VERPFLEGUNG" }, vorher: true, neu: false },
    ]);
    expect(abarbeitung(LISTE.zeilen, new Set(), "erledigt")).toEqual([]);
  });
});

describe("Die Unteransicht „Sofortbedarf“", () => {
  it("zeigt Erledigt je Feld, offene Summen und erledigte Zeilen blass", () => {
    render(<VersorgungSofortbedarf liste={LISTE} />);
    const tabelle = screen.getByRole("table", { name: "Sofortbedarf" });
    const rastede = within(tabelle).getByRole("row", { name: /2\. Zug FF Rastede/ });
    expect(rastede.textContent).toContain("Verpfl. ✓ · Diesel –");
    expect(within(tabelle).getByRole("row", { name: /FGr Log-V/ }).className).toBe("blass");
    expect(within(tabelle).getByRole("row", { name: /davon offen/ }).textContent).toContain("400");
  });

  it("meldet die gewählten Einheiten für ein gewähltes Feld als erledigt", async () => {
    render(<VersorgungSofortbedarf liste={LISTE} />);
    const knopf = screen.getByRole("button", { name: "Als erledigt melden (0)" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText("2. Zug FF Rastede wählen"));
    fireEvent.change(screen.getByLabelText("Feld"), { target: { value: "DIESEL" } });
    fireEvent.click(screen.getByRole("button", { name: "Als erledigt melden (1)" }));
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "SofortbedarfErledigt", nutzlast: { einheitId: "E1", feld: "DIESEL" }, vorher: null, neu: true }]);
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Als erledigt melden (0)" })).toBeDefined();
    });
  });

  it("öffnet erledigte Felder wieder", async () => {
    render(<VersorgungSofortbedarf liste={LISTE} />);
    fireEvent.click(screen.getByLabelText("FGr Log-V OV Wildeshausen wählen"));
    fireEvent.click(screen.getByRole("button", { name: "Wieder öffnen" }));
    await waitFor(() => {
      expect(bedient()).toHaveLength(2);
    });
    expect(bedient().map((e) => (e as { typ: string }).typ)).toEqual(["SofortbedarfWiederOffen", "SofortbedarfWiederOffen"]);
  });

  it("blendet erledigte Zeilen auf Wunsch aus", () => {
    render(<VersorgungSofortbedarf liste={LISTE} />);
    fireEvent.click(screen.getByRole("button", { name: "Erledigte ausblenden" }));
    expect(screen.queryByRole("row", { name: /FGr Log-V/ })).toBeNull();
  });
});
