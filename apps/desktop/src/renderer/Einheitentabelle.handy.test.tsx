/**
 * Regressionstests zur Review-Runde 2: Statuswechsel auf dem Handy als Blatt
 * (Tipp daneben verwirft nicht stumm) und gesperrte Tabelle bei beendetem
 * oder archiviertem Einsatz (sichtbarer Grund, keine Schreibknöpfe).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Tabellenzeile } from "@s1/domaene";

import type { Lagebild } from "../kontrakt/index.js";
import { Einheitentabelle } from "./Einheitentabelle.js";
import { TEXT_NICHT_UEBERNOMMEN } from "./Einheitenzelle.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function zeile(): Tabellenzeile {
  const zelle = (text: string, wert: unknown) => ({ text, wert, umstritten: false });
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

function bereite(einsatzStatus: string, schmal: boolean): void {
  vi.stubGlobal("matchMedia", (abfrage: string) => ({
    matches: schmal && abfrage.includes("max-width: 700px"),
    media: abfrage,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", { lageZeiger: 5, zeilen: [zeile()], gesamtzahl: 1, von: 0, jeStatus: {} });
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
    lagebild: { einsatzStatus } as unknown as Lagebild,
  });
}

function zeige(): void {
  render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
}

describe("Statuswahl als Blatt auf dem Handy", () => {
  beforeEach(() => {
    bereite("AKTIV", true);
  });

  it("öffnet ein Dialogblatt mit Übernehmen und Abbrechen", async () => {
    zeige();
    fireEvent.click(await screen.findByRole("button", { name: /Status ändern, aktuell Anmarsch/ }));
    const blatt = screen.getByRole("dialog");
    expect(within(blatt).getByRole("button", { name: "Übernehmen" })).toBeDefined();
    expect(within(blatt).getByRole("button", { name: "Abbrechen" })).toBeDefined();
  });

  it("meldet „Nicht übernommen“ beim Tipp daneben und schreibt nichts", async () => {
    zeige();
    fireEvent.click(await screen.findByRole("button", { name: /Status ändern/ }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "IM_EINSATZ" } });
    fireEvent.click(screen.getByTestId("auswahlgrund"));
    expect(screen.getByRole("alert").textContent).toBe(TEXT_NICHT_UEBERNOMMEN);
    // Das Blatt bleibt offen, die Wahl bleibt stehen.
    expect((screen.getByLabelText("Status") as HTMLSelectElement).value).toBe("IM_EINSATZ");
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("schreibt mit „Übernehmen“ genau einen StatusGesetzt", async () => {
    zeige();
    fireEvent.click(await screen.findByRole("button", { name: /Status ändern/ }));
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "IM_EINSATZ" } });
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
  });

  it("verwirft mit „Abbrechen“", async () => {
    zeige();
    fireEvent.click(await screen.findByRole("button", { name: /Status ändern/ }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });
});

describe.each(["BEENDET", "ARCHIVIERT"])("Einsatz %s", (status) => {
  beforeEach(() => {
    bereite(status, false);
  });

  it("sperrt den Status-Chip mit sichtbarem Grund und zeigt den Hinweis über der Tabelle", async () => {
    zeige();
    const chip = await screen.findByRole("button", { name: new RegExp(TEXT_NUR_LESEN) });
    expect((chip as HTMLButtonElement).disabled).toBe(true);
    expect(chip.getAttribute("title")).toBe(TEXT_NUR_LESEN);
    fireEvent.click(chip);
    expect(screen.queryByLabelText("Status")).toBeNull();
    const hinweis = screen.getByRole("status");
    expect(hinweis.textContent).toContain(TEXT_NUR_LESEN);
    const tabelle = screen.getByRole("table");
    // Der Hinweis steht vor der Tabelle, nicht am Seitenende.
    expect(hinweis.compareDocumentPosition(tabelle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sperrt Anlegen, Verschieben und Entfernen", async () => {
    zeige();
    await screen.findByText("Bergungsgruppe 1");
    for (const name of [/Aus Vorlage/, /Verschieben/, /Entfernen/, /Aufteilen/]) {
      expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    // Auch mit Markierung bleiben sie gesperrt.
    fireEvent.click(screen.getByText("Deich Nord"));
    expect((screen.getByRole("button", { name: /Entfernen/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Einsatz aktiv", () => {
  it("zeigt keinen Sperrhinweis und lässt den Status-Chip bedienen", async () => {
    bereite("AKTIV", false);
    zeige();
    const chip = await screen.findByRole("button", { name: /Status ändern, aktuell Anmarsch/ });
    expect((chip as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
