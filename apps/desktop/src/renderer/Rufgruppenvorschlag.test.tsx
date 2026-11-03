/**
 * Der Namensvorschlag der Rufgruppe: Tippen schlägt Gruppen aus dem
 * Fleetmapping vor, Klick und Pfeil+Enter übernehmen, jeder andere Name bleibt
 * möglich (Enter bestätigt dann den getippten Text).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Funkplan } from "./Funkplan.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { FUNK_ANSICHT } from "./pruefhilfen/funkplanbeispiel.js";
import { BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { Rufgruppenvorschlag } from "./Rufgruppenvorschlag.js";

afterEach(cleanup);

function Huelle({ gewaehlt }: { readonly gewaehlt: (name: string) => void }): React.JSX.Element {
  const [name, setzeName] = useState("");
  return <Rufgruppenvorschlag wert={name} aufAenderung={setzeName} aufWahl={(e) => { setzeName(e.name); gewaehlt(e.name); }} />;
}

describe("Rufgruppenvorschlag", () => {
  it("zeigt erst beim Tippen Vorschläge mit Ordner und Kurzwahl", () => {
    render(<Huelle gewaehlt={() => undefined} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "gbib-1" } });
    const option = within(screen.getByRole("listbox")).getByRole("option", { name: /T_BC-GBIB-1/ });
    expect(option.textContent).toContain("T_LV BW › Biberach");
    expect(option.textContent).toContain("Kurzwahl 56");
  });

  it("übernimmt einen Klick auf einen Vorschlag", () => {
    const gewaehlt: string[] = [];
    render(<Huelle gewaehlt={(n) => gewaehlt.push(n)} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "t_bund-02" } });
    fireEvent.click(within(screen.getByRole("listbox")).getByRole("option", { name: /T_BUND-02/ }));
    expect(gewaehlt).toEqual(["T_BUND-02"]);
    expect((screen.getByRole("combobox") as HTMLInputElement).value).toBe("T_BUND-02");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("übernimmt mit Pfeil ab und Enter den markierten Vorschlag", () => {
    const gewaehlt: string[] = [];
    render(<Huelle gewaehlt={(n) => gewaehlt.push(n)} />);
    const feld = screen.getByRole("combobox");
    fireEvent.change(feld, { target: { value: "t_bund" } });
    fireEvent.keyDown(feld, { key: "ArrowDown" });
    fireEvent.keyDown(feld, { key: "Enter" });
    expect(gewaehlt).toEqual(["T_BUND-01"]);
  });

  it("lässt Enter ohne markierten Vorschlag durchfallen und zeigt den Hinweis zur eigenen Rufgruppe", () => {
    const gewaehlt: string[] = [];
    render(<Huelle gewaehlt={(n) => gewaehlt.push(n)} />);
    const feld = screen.getByRole("combobox");
    fireEvent.change(feld, { target: { value: "T_BUND" } });
    expect(fireEvent.keyDown(feld, { key: "Enter" })).toBe(true);
    expect(gewaehlt).toEqual([]);
    expect(screen.getByText(/Nicht im Fleetmapping/)).toBeDefined();
  });

  it("schließt die Liste mit Esc, ohne den Text zu ändern", () => {
    render(<Huelle gewaehlt={() => undefined} />);
    const feld = screen.getByRole("combobox");
    fireEvent.change(feld, { target: { value: "T_BUND" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect((feld as HTMLInputElement).value).toBe("T_BUND");
  });
});

describe("Rufgruppe anlegen mit Vorschlag", () => {
  let attrappe: Attrappe;
  beforeEach(() => {
    attrappe = baueAttrappe();
    attrappe.antwortet("funkplanAnfordern", FUNK_ANSICHT);
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
    useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
  });
  const entwuerfe = (): unknown[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

  async function maskeOeffnen(): Promise<HTMLElement> {
    render(<Funkplan />);
    await waitFor(() => {
      expect(screen.getByRole("table", { name: "Zuordnung je Rufgruppe" })).toBeDefined();
    });
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    return screen.getByRole("form", { name: "Rufgruppe anlegen" });
  }

  it("legt die gewählte Fleetmapping-Gruppe als TMO an, auch wenn vorher DMO stand", async () => {
    const maske = await maskeOeffnen();
    fireEvent.change(within(maske).getByLabelText("Betriebsart"), { target: { value: "DMO" } });
    fireEvent.change(within(maske).getByRole("combobox"), { target: { value: "t_lvnw-1" } });
    fireEvent.click(within(maske).getByRole("option", { name: /T_LVNW-1/ }));
    fireEvent.click(within(maske).getByRole("button", { name: "Rufgruppe anlegen" }));
    await waitFor(() => {
      expect(entwuerfe()).toEqual([
        { typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: expect.stringMatching(/^RG-/), betriebsart: "TMO", name: "T_LVNW-1" } },
      ]);
    });
  });

  it("legt eine abweichende Rufgruppe mit dem getippten Namen an", async () => {
    const maske = await maskeOeffnen();
    fireEvent.change(within(maske).getByRole("combobox"), { target: { value: "T_LVNW-1 Sonder" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Rufgruppe anlegen" }));
    await waitFor(() => {
      expect(entwuerfe()).toEqual([
        { typ: "RufgruppeAngelegt", nutzlast: { rufgruppeId: expect.stringMatching(/^RG-/), betriebsart: "TMO", name: "T_LVNW-1 Sonder" } },
      ]);
    });
  });
});
