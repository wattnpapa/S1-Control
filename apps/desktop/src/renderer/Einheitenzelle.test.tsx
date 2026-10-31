/**
 * Zellbearbeitung der Einheitentabelle (Review-Runde 3): kein doppeltes
 * Schreiben bei Doppelklick, kein Löschen des Status per „—“, Hilfetext je
 * Zellart.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tabellenzeile, Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const zelle = (text: string, wert: unknown): Zelle => ({ text, wert, umstritten: false });

function zeile(statusWert: string, statusText: string): Tabellenzeile {
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
      status: zelle(statusText, statusWert),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
    },
  };
}

let attrappe: Attrappe;

function bereite(statusWert: string, statusText: string): void {
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 5,
    zeilen: [zeile(statusWert, statusText)],
    gesamtzahl: 1,
    von: 0,
    jeStatus: {},
  });
  attrappe.antwortet("untertabelleAnfordern", { lageZeiger: 5, einheitId: "U1", fahrzeuge: [], personen: [], auftraege: [] });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    untertabelle: undefined,
    tabellenfilter: {},
    fehler: undefined,
    hinweise: [],
  });
}

function zeigeTabelle(): void {
  render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
}

beforeEach(() => {
  bereite("ANMARSCH", "Anmarsch");
});

describe("Übernehmen in der Zelle", () => {
  it("schreibt bei einem Doppelklick auf „Übernehmen“ genau einmal", async () => {
    zeigeTabelle();
    fireEvent.click(await screen.findByRole("button", { name: /Status ändern, aktuell Anmarsch/ }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "IM_EINSATZ" } });
    const knopf = screen.getByRole("button", { name: "Übernehmen" });
    fireEvent.click(knopf);
    fireEvent.click(knopf);
    // Bis zum Ergebnis steht „…“ statt „Übernehmen“.
    expect(screen.queryByRole("button", { name: "Übernehmen" })).toBeNull();
    await waitFor(() => {
      expect(screen.queryByLabelText("Status")).toBeNull();
    });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
  });

  it("schreibt Enter und anschließendes Wegklicken in einer Textzelle nur einmal", async () => {
    zeigeTabelle();
    const zelleBezeichnung = await screen.findByText("Bergungsgruppe 1", { selector: "td" });
    fireEvent.doubleClick(zelleBezeichnung);
    const feld = screen.getByLabelText(/Bezeichnung/i) as HTMLInputElement;
    fireEvent.change(feld, { target: { value: "Bergungsgruppe 2" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    fireEvent.blur(feld);
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
  });
});

describe("Statusauswahl", () => {
  it("bietet „—“ als Schreib-Option nicht an", async () => {
    zeigeTabelle();
    fireEvent.click(await screen.findByRole("button", { name: /Status ändern, aktuell Anmarsch/ }));
    const optionen = Array.from((screen.getByLabelText("Status") as HTMLSelectElement).options).map((o) => o.value);
    expect(optionen).not.toContain("");
  });

  it("lässt eine Zelle ohne Status bearbeiten und sagt sichtbar, was fehlt", async () => {
    bereite("", "");
    zeigeTabelle();
    fireEvent.click(await screen.findByRole("button", { name: "Status setzen" }));
    const knopf = screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    expect(screen.getByText("Status wählen")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "IM_EINSATZ" } });
    expect((screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("Hilfetext", () => {
  it("unterscheidet Textzellen (Wegklicken schreibt) und Auswahlen (Wegklicken verwirft)", async () => {
    zeigeTabelle();
    const text = (await screen.findByText(/Doppelklick bearbeitet die Zelle/)).textContent ?? "";
    expect(text).toMatch(/Textzelle: Enter oder Wegklicken schreibt, Esc verwirft/);
    expect(text).toMatch(/Auswahl .*Esc oder Wegklicken verwirft/);
  });
});
