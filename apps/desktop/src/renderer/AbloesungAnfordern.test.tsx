/**
 * Regression (Review Runde 2, P0): „Anfordern“ im leeren Dialog „Ablösung
 * anfordern“ schrieb eine Anforderung ohne Angaben und machte die Anzeige
 * unlesbar. Jetzt ist der Knopf gesperrt, und der Dialog nennt den Grund.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tabellenzeile } from "@s1/domaene";

import { AbloesungAnfordern } from "./AbloesungAnfordern.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  useLaden.setState({ akteId: "akte-1" });
});

const zeile = { einheitId: "E1", anzeige: "1. BGr", zellen: {} } as unknown as Tabellenzeile;

describe("Maske „Ablösung anfordern“", () => {
  it("sperrt das leere Formular und sagt in Klartext, was fehlt", () => {
    render(<AbloesungAnfordern zeile={zeile} aufSchliessen={() => undefined} />);
    expect(screen.getByRole("alert").textContent).toMatch(/Vorgesehene Einheit, Vorgesehener Auftrag oder Kennung/);
    const knopf = screen.getByText("Anfordern") as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    fireEvent.submit(screen.getByRole("form"));
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("gibt den Knopf frei, sobald die Ablösung benannt ist", () => {
    render(<AbloesungAnfordern zeile={zeile} aufSchliessen={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Vorgesehene Einheit"), { target: { value: "BGr Varel" } });
    expect((screen.getByText("Anfordern") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
