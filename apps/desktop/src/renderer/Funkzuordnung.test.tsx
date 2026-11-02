/**
 * Komponententests zur Zelle „Rufgruppe" in der Zuordnung des Blattes
 * „Funkplan" (Option 5b).
 *
 * Gemessen wird, was die Zelle schreibt: Doppelklick öffnet, Enter schreibt
 * mit dem Wert, den die Zelle beim Öffnen sah, Esc verwirft; „keine
 * Rufgruppe" schreibt `null`; „Neue Rufgruppe anlegen …" öffnet die Anlage
 * und setzt die neue Gruppe danach an derselben Einheit. Die Zelle sperrt
 * ihre Einheit, solange sie offen ist.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Funkplan } from "./Funkplan.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { FUNK_ANSICHT } from "./pruefhilfen/funkplanbeispiel.js";
import { BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { NEUE_RUFGRUPPE } from "./Rufgruppenzelle.js";
import { CODE_VORWERT } from "../kontrakt/index.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("funkplanAnfordern", FUNK_ANSICHT);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

async function zeile(name: RegExp): Promise<HTMLElement> {
  render(<Funkplan />);
  return screen.findByRole("row", { name });
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Die Zelle „Rufgruppe“ der Zuordnung", () => {
  it("bietet alle geltenden Gruppen, „keine“ und „Neue Rufgruppe anlegen …“ an; Esc verwirft", async () => {
    const z = await zeile(/FGr WP OV Cloppenburg/);
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    const wahl = screen.getByLabelText("Rufgruppe für FGr WP OV Cloppenburg");
    const optionen = within(wahl).getAllByRole("option").map((o) => o.textContent);
    expect(optionen).toEqual([
      "THW_OL_FUE (TMO · Führung)",
      "THW_OL_EA2 (TMO · Arbeitsgruppe EA 2)",
      "DMO 310 (DMO · EA 3 Evakuierung)",
      "2 m K 55 G/U (Analog · Ortsfunk FF Hude)",
      "— keine Rufgruppe —",
      "Neue Rufgruppe anlegen …",
    ]);
    expect((wahl as HTMLSelectElement).value).toBe("R2");
    expect(attrappe.letzterRuf("sperre")).toEqual({ art: "sperre", akteId: "akte-1", entitaetId: "E2" });
    fireEvent.change(wahl, { target: { value: "R3" } });
    fireEvent.keyDown(wahl, { key: "Escape" });
    expect(bedient()).toEqual([]);
    expect(screen.queryByLabelText("Rufgruppe für FGr WP OV Cloppenburg")).toBeNull();
    await waitFor(() => {
      expect(attrappe.letzterRuf("sperre")).toEqual({ art: "sperre", akteId: "akte-1", entitaetId: "E2", frei: true });
    });
  });

  it("schreibt mit Enter über denselben Bedienschritt wie die Einheitentabelle", async () => {
    const z = await zeile(/FGr WP OV Cloppenburg/);
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    const wahl = screen.getByLabelText("Rufgruppe für FGr WP OV Cloppenburg");
    fireEvent.change(wahl, { target: { value: "R3" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E2" }, vorher: "R2", neu: "R3", vorwertPruefen: true }]);
    });
  });

  it("schreibt „keine Rufgruppe“ als null und eine unveränderte Wahl gar nicht", async () => {
    const z = await zeile(/Abschnittsleitung EA 1/);
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    let wahl = screen.getByLabelText("Rufgruppe für Abschnittsleitung EA 1 Deich Nord");
    fireEvent.keyDown(wahl, { key: "Enter" });
    expect(bedient()).toEqual([]);
    fireEvent.keyDown(within(z).getByTitle(/Rufgruppe wählen/), { key: "Enter" });
    wahl = screen.getByLabelText("Rufgruppe für Abschnittsleitung EA 1 Deich Nord");
    fireEvent.change(wahl, { target: { value: "" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E1" }, vorher: "R1", neu: null, vorwertPruefen: true }]);
    });
  });

  it("zeigt „ohne“ in Bernstein und setzt eine Einheit ohne Gruppe mit vorher null", async () => {
    const z = await zeile(/FGr Notversorgung 2/);
    expect(within(z).getByText("ohne").className).toContain("warn");
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    const wahl = screen.getByLabelText("Rufgruppe für FGr Notversorgung 2 OV Cloppenburg");
    fireEvent.change(wahl, { target: { value: "R1" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E5" }, vorher: null, neu: "R1", vorwertPruefen: true }]);
    });
  });

  it("zeigt die DMO-Marke in der Zelle", async () => {
    const z = await zeile(/FGr N 2 OV Cloppenburg/);
    const zelle = within(z).getByTitle(/Rufgruppe wählen/);
    expect(within(zelle).getByText("DMO").className).toContain("warn");
    expect(within(zelle).getByText("DMO 310")).toBeDefined();
  });

  it("legt aus der Zelle eine neue Rufgruppe an und setzt sie an derselben Einheit", async () => {
    const z = await zeile(/SEG DLRG Oldenburg/);
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    const wahl = screen.getByLabelText("Rufgruppe für SEG DLRG Oldenburg");
    // Die aufgelöste Gruppe steht nicht zur Wahl; die Zelle beginnt bei „keine“.
    expect((wahl as HTMLSelectElement).value).toBe("");
    fireEvent.change(wahl, { target: { value: NEUE_RUFGRUPPE } });
    const maske = screen.getByRole("form", { name: "Rufgruppe anlegen" });
    expect(within(maske).getByText(/„SEG DLRG Oldenburg“ dieser Rufgruppe zugeordnet/)).toBeDefined();
    fireEvent.change(within(maske).getByLabelText("Name"), { target: { value: "DLRG Kanal 4" } });
    fireEvent.change(within(maske).getByLabelText("Betriebsart"), { target: { value: "ANALOG" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Rufgruppe anlegen" }));
    await waitFor(() => {
      expect(bedient()).toHaveLength(2);
    });
    const [anlage, setzen] = bedient() as [{ nutzlast: { rufgruppeId: string } }, unknown];
    expect(anlage).toMatchObject({ typ: "RufgruppeAngelegt", nutzlast: { betriebsart: "ANALOG", name: "DLRG Kanal 4" } });
    expect(setzen).toEqual({ typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E6" }, vorher: "R5", neu: anlage.nutzlast.rufgruppeId, vorwertPruefen: true });
  });

  it("meldet eine Abweisung wegen fremder Änderung als Hinweis", async () => {
    attrappe.antwortet("bedienen", { art: "abgewiesen", meldung: "Wurde inzwischen von Lage 2 geändert (neu: R1). Neu laden?", code: CODE_VORWERT, dauerhafterHinweis: false });
    const z = await zeile(/FGr WP OV Cloppenburg/);
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    const wahl = screen.getByLabelText("Rufgruppe für FGr WP OV Cloppenburg");
    fireEvent.change(wahl, { target: { value: "R3" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(useLaden.getState().hinweise.at(-1)?.text).toMatch(/FGr WP OV Cloppenburg: .*Lage 2/);
    });
  });

  it("zeigt, wenn ein anderer Arbeitsplatz die Einheit bearbeitet, und öffnet erst beim zweiten Versuch", async () => {
    const peer = { clientId: "c2", anzeigename: "Lage 2", rechnername: "r2", veraltet: false, bearbeitet: ["E2"] };
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, peers: [peer] } as never });
    const z = await zeile(/FGr WP OV Cloppenburg/);
    expect(within(z).getByText(/wird von Lage 2 bearbeitet/)).toBeDefined();
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    expect(screen.queryByLabelText("Rufgruppe für FGr WP OV Cloppenburg")).toBeNull();
    fireEvent.doubleClick(within(z).getByTitle(/Rufgruppe wählen/));
    expect(screen.getByLabelText("Rufgruppe für FGr WP OV Cloppenburg")).toBeDefined();
  });
});
