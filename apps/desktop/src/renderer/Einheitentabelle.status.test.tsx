/**
 * Regressionstests zum Statuswechsel in der Einheitentabelle (Review P0-2):
 * Eine Auswahl gilt erst mit Enter oder „Übernehmen“; Escape, „Abbrechen“ und
 * Wegklicken schreiben nichts. Dazu die Spaltenreihenfolge (Name, Status vorn).
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Spalte, Tabellenzeile, Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { spaltenFuerAnzeige } from "./Einheitenspalten.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const zelle = (text: string, wert: unknown): Zelle => ({ text, wert, umstritten: false });

function zeile(): Tabellenzeile {
  return {
    einheitId: "U1",
    abschnittId: "EO",
    abschnittName: "Deich Nord",
    reihenfolge: 1,
    anzeige: "Bergungsgruppe 1",
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    gesamt: 9,
    entfernt: false,
    zaehlklasse: "ist",
    aufgegangen: false,
    hinweise: [],
    zellen: {
      bezeichnung: zelle("Bergungsgruppe 1", "Bergungsgruppe 1"),
      status: zelle("Anmarsch", "ANMARSCH"),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
    },
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", { lageZeiger: 5, zeilen: [zeile()], gesamtzahl: 1, von: 0, jeStatus: {} });
  attrappe.antwortet("untertabelleAnfordern", { lageZeiger: 5, einheitId: "U1", fahrzeuge: [], personen: [], auftraege: [] });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", baum: undefined, tabelle: undefined, tagebuch: undefined, untertabelle: undefined, tabellenfilter: {}, fehler: undefined, hinweise: [] });
});

async function oeffneStatusauswahl(): Promise<HTMLSelectElement> {
  render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
  const chip = await screen.findByRole("button", { name: /Status ändern, aktuell Anmarsch/ });
  fireEvent.click(chip); // ein Tipp, kein Doppelklick
  return screen.getByLabelText("Status") as HTMLSelectElement;
}

describe("Statuswechsel per Auswahl", () => {
  it("öffnet die Auswahl mit einem Tipp auf den Status-Chip", async () => {
    const auswahl = await oeffneStatusauswahl();
    expect(auswahl.value).toBe("ANMARSCH");
    expect(screen.getByRole("button", { name: "Übernehmen" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeDefined();
  });

  it("schreibt beim bloßen Auswählen nichts", async () => {
    const auswahl = await oeffneStatusauswahl();
    fireEvent.change(auswahl, { target: { value: "IM_EINSATZ" } });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("verwirft beim Wegklicken (Blur) ohne zu schreiben", async () => {
    const auswahl = await oeffneStatusauswahl();
    fireEvent.change(auswahl, { target: { value: "IM_EINSATZ" } });
    fireEvent.blur(auswahl);
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("verwirft mit Escape und mit „Abbrechen“", async () => {
    const auswahl = await oeffneStatusauswahl();
    fireEvent.change(auswahl, { target: { value: "IM_EINSATZ" } });
    fireEvent.keyDown(auswahl, { key: "Escape" });
    expect(screen.queryByLabelText("Status")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Status ändern/ }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByLabelText("Status")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("schreibt mit Enter genau einen StatusGesetzt", async () => {
    const auswahl = await oeffneStatusauswahl();
    fireEvent.change(auswahl, { target: { value: "IM_EINSATZ" } });
    fireEvent.keyDown(auswahl, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("StatusGesetzt");
  });

  it("schreibt mit dem Knopf „Übernehmen“, auch wenn der Blur vorausgeht", async () => {
    const auswahl = await oeffneStatusauswahl();
    fireEvent.change(auswahl, { target: { value: "IM_EINSATZ" } });
    const knopf = screen.getByRole("button", { name: "Übernehmen" });
    // Der Fokus wandert auf den Knopf: kein Verwerfen.
    fireEvent.blur(auswahl, { relatedTarget: knopf });
    fireEvent.click(knopf);
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
  });
});

describe("Spaltenreihenfolge", () => {
  it("stellt Bezeichnung und Status nach vorn und lässt den Rest in Reihenfolge", () => {
    const sp = (schluessel: string): Spalte => ({ schluessel }) as Spalte;
    const ergebnis = spaltenFuerAnzeige([sp("fuestKennung"), sp("bezeichnung"), sp("geraete"), sp("status"), sp("staerke")]);
    expect(ergebnis.map((spalte) => spalte.schluessel)).toEqual(["bezeichnung", "status", "fuestKennung", "geraete", "staerke"]);
  });

  it("zeigt Status in der Tabelle direkt nach der Bezeichnung", async () => {
    render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
    await screen.findByText("Bergungsgruppe 1");
    const koepfe = screen.getAllByRole("columnheader").map((kopf) => kopf.textContent);
    expect(koepfe.slice(0, 3)).toEqual(["Abschnitt", "Bezeichnung", "Status"]);
  });
});
