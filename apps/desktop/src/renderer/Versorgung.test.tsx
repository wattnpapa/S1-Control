/**
 * Komponententests zum Blatt „Versorgung" (S4.1).
 *
 * Die Rechnung prüft Ring 2; hier steht die Verdrahtung: das KPI-Band aus dem
 * Lagebild, der eigene Ruf mit Zeigerstand, der Horizont 24/48 h und dass
 * jede Unteransicht zeigt, was die Ansicht trägt — samt Zählregel im Fuß.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BEISPIEL_ANSICHT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { BLAETTER } from "./blaetter.js";
import { Versorgung } from "./Versorgung.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("versorgungAnfordern", BEISPIEL_ANSICHT);
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

async function geladen(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByRole("table", { name: "Mahlzeitenplan" })).toBeDefined();
  });
}

describe("Das Blatt „Versorgung“", () => {
  it("steht als Reiter zwischen Führungsstelle und Kosten", () => {
    const schluessel = BLAETTER.map((b) => b.schluessel);
    expect(schluessel.indexOf("versorgung")).toBe(schluessel.indexOf("fuest") + 1);
    expect(schluessel.indexOf("kosten")).toBe(schluessel.indexOf("versorgung") + 1);
  });

  it("zeigt im KPI-Band die Zahlen aus dem Lagebild, Anmarsch getrennt", async () => {
    render(<Versorgung />);
    const band = screen.getByLabelText("Zahlen des Tages");
    expect(within(band).getByText("268")).toBeDefined();
    expect(within(band).getByText(/Portionen Abend 1800/)).toBeDefined();
    expect(within(band).getByText("142")).toBeDefined();
    expect(within(band).getByText("+24")).toBeDefined();
    await geladen();
  });

  it("holt die Ansicht mit eigenem Ruf und zeigt den Plan mit Anmarsch „nicht enthalten“", async () => {
    render(<Versorgung />);
    await geladen();
    expect(attrappe.rufeDerArt("versorgungAnfordern")[0]).toEqual({ art: "versorgungAnfordern", akteId: "akte-1", stunden: 24 });
    const plan = screen.getByRole("table", { name: "Mahlzeitenplan" });
    expect(within(plan).getByText("EA 1 Deich Nord")).toBeDefined();
    expect(within(plan).getByText("nicht enthalten")).toBeDefined();
    expect(screen.getByText(/alle erfassten Einheiten der Einsatzbereiche/)).toBeDefined();
  });

  it("schaltet auf „Nächste 24 h“ und weitet auf 48 h", async () => {
    render(<Versorgung />);
    await geladen();
    fireEvent.click(screen.getByRole("button", { name: "Nächste 24 h" }));
    expect(screen.getByRole("article", { name: "Abend 1800" }).className).toContain("naechste");
    expect(screen.getByText("nicht eingerechnet")).toBeDefined();
    expect(screen.getByText(/2\. Zug FF Hude/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "48 h" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("versorgungAnfordern").some((r) => r.stunden === 48)).toBe(true);
    });
  });

  it("zeigt das Logistikblatt mit Fußnote, den Bedarf und den Sofortbedarf", async () => {
    render(<Versorgung />);
    await geladen();
    fireEvent.click(screen.getByRole("button", { name: "Bereiche · Schichten" }));
    expect(within(screen.getByRole("table", { name: "Logistikblatt" })).getByText("Angefordert / Anmarsch")).toBeDefined();
    expect(screen.getByText(/Männl\. ist abgeleitet/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Unterbringung" }));
    const bedarf = screen.getByRole("table", { name: "Übernachtungsbedarf" });
    expect(within(bedarf).getByText("2. Zug FF Rastede")).toBeDefined();
    expect(within(bedarf).getByText(/Anmarsch getrennt: 22 Betten/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Sofortbedarf" }));
    const sofort = screen.getByRole("table", { name: "Sofortbedarf" });
    expect(within(sofort).getAllByText("400")).toHaveLength(2);
  });

  it("holt beim neuen Zeigerstand neu", async () => {
    render(<Versorgung />);
    await geladen();
    const vorher = attrappe.rufeDerArt("versorgungAnfordern").length;
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, lageZeiger: 13 } });
    await waitFor(() => {
      expect(attrappe.rufeDerArt("versorgungAnfordern").length).toBe(vorher + 1);
    });
  });
});
