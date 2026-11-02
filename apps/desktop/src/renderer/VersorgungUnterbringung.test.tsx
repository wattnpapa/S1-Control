/**
 * Komponententests zur Unteransicht „Unterbringung" (S4.2).
 *
 * Die Belegung rechnet Ring 2; hier steht, was die Oberfläche schreibt:
 * Anlage und Änderung als Maske, Auflösen mit Pflichtgrund, Zuweisung in
 * der Zelle mit Doppelklick, Enter und Esc — und dass „überbelegt" an der
 * Karte steht statt verweigert zu werden.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BEISPIEL_ANSICHT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { VersorgungUnterbringung } from "./VersorgungUnterbringung.js";
import { zuweisung } from "../kontrakt/versorgungsschritte.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

function zeichne(): void {
  render(<VersorgungUnterbringung bedarf={BEISPIEL_ANSICHT.blatt.unterbringung} belegung={BEISPIEL_ANSICHT.blatt.belegung} />);
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Der Zuweisungsschritt", () => {
  it("baut Zuweisung, Umbelegung, Aufhebung oder nichts", () => {
    expect(zuweisung("E1", undefined, "U1")).toMatchObject({ typ: "EinheitUntergebracht", vorher: null, neu: "U1" });
    expect(zuweisung("E1", "U1", "U2")).toMatchObject({ typ: "EinheitUntergebracht", vorher: "U1", neu: "U2" });
    expect(zuweisung("E1", "U1", "")).toMatchObject({ typ: "UnterbringungAufgehoben", vorher: "U1", neu: null });
    expect(zuweisung("E1", "U1", "U1")).toBeUndefined();
    expect(zuweisung("E1", undefined, "")).toBeUndefined();
  });
});

describe("Die Unteransicht „Unterbringung“", () => {
  it("zeigt die Unterkünfte mit Belegung und Überbelegung als Marke", () => {
    zeichne();
    const halle = screen.getByRole("article", { name: "Turnhalle BBS Haarentor" });
    expect(within(halle).getByText("24 frei")).toBeDefined();
    expect(within(halle).getByRole("img").getAttribute("aria-label")).toBe("belegt 96 von 120");
    expect(within(screen.getByRole("article", { name: "Gerätehaus Rastede" })).getByText("⚠ überbelegt")).toBeDefined();
  });

  it("legt eine Unterkunft über die Maske an", async () => {
    zeichne();
    fireEvent.click(screen.getByRole("button", { name: "Unterkunft anlegen" }));
    const maske = screen.getByRole("form", { name: "Unterkunft anlegen" });
    fireEvent.change(within(maske).getByLabelText("Name"), { target: { value: "Turnhalle Nord" } });
    fireEvent.change(within(maske).getByLabelText("Kapazität (Plätze)"), { target: { value: "40" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Unterkunft anlegen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "UnterkunftAngelegt", nutzlast: expect.objectContaining({ name: "Turnhalle Nord", kapazitaet: 40, unterkunftId: expect.stringMatching(/^UK-/) }) },
      ]);
    });
  });

  it("schreibt beim Ändern nur die geänderten Felder mit ihrem Vorwert", async () => {
    zeichne();
    fireEvent.click(within(screen.getByRole("article", { name: "Gerätehaus Rastede" })).getByRole("button", { name: "Ändern" }));
    const maske = screen.getByRole("form", { name: "Unterkunft ändern" });
    fireEvent.change(within(maske).getByLabelText("Kapazität (Plätze)"), { target: { value: "24" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "UnterkunftGeaendert", nutzlast: { unterkunftId: "U2", feld: "kapazitaet" }, vorher: 12, neu: 24, vorwertPruefen: true },
      ]);
    });
  });

  it("fragt beim Auflösen einen Grund", async () => {
    zeichne();
    fireEvent.click(within(screen.getByRole("article", { name: "Gerätehaus Rastede" })).getByRole("button", { name: "Auflösen …" }));
    const maske = screen.getByRole("form", { name: /auflösen/ });
    expect((within(maske).getByRole("button", { name: "Auflösen" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(maske).getByRole("textbox"), { target: { value: "Halle gesperrt" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Auflösen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "UnterkunftAufgeloest", nutzlast: { unterkunftId: "U2" }, vorher: null, neu: true, grund: "Halle gesperrt" }]);
    });
  });

  it("weist in der Zelle per Doppelklick und Enter zu; Esc verwirft", async () => {
    zeichne();
    const zeile = screen.getByRole("row", { name: /2\. Zug FF Hude/ });
    expect(within(zeile).getAllByText("Anmarsch").at(-1)?.className).toContain("marke-zustand");
    fireEvent.doubleClick(within(zeile).getByTitle(/Unterkunft wählen/));
    let wahl = screen.getByLabelText("Unterkunft für 2. Zug FF Hude");
    expect(within(wahl).getByRole("option", { name: /Turnhalle BBS Haarentor \(24 frei\)/ })).toBeDefined();
    fireEvent.change(wahl, { target: { value: "U2" } });
    fireEvent.keyDown(wahl, { key: "Escape" });
    expect(bedient()).toEqual([]);

    fireEvent.doubleClick(within(zeile).getByTitle(/Unterkunft wählen/));
    wahl = screen.getByLabelText("Unterkunft für 2. Zug FF Hude");
    fireEvent.change(wahl, { target: { value: "U1" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "EinheitUntergebracht", nutzlast: { einheitId: "Z1" }, vorher: null, neu: "U1", vorwertPruefen: true }]);
    });
  });

  it("hebt eine Zuweisung über „ohne Unterkunft“ auf", async () => {
    zeichne();
    const zeile = screen.getByRole("row", { name: /2\. Zug FF Rastede/ });
    fireEvent.doubleClick(within(zeile).getByText("Turnhalle BBS Haarentor"));
    const wahl = screen.getByLabelText("Unterkunft für 2. Zug FF Rastede");
    fireEvent.change(wahl, { target: { value: "" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "UnterbringungAufgehoben", nutzlast: { einheitId: "E1" }, vorher: "U1", neu: null, vorwertPruefen: true }]);
    });
  });

  it("bietet die Belegungsliste als Ausgabe an", async () => {
    attrappe.antwortet("ausgabeErzeugen", { pfad: "/share/ausgaben/belegung_1.html", bytes: 10 });
    zeichne();
    fireEvent.click(screen.getByRole("button", { name: "Belegungsliste als HTML" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("ausgabeErzeugen")[0]).toMatchObject({ ausgabe: "belegung", format: "html" });
    });
  });
});
