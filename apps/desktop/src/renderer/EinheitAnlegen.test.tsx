/**
 * Komponententests zur Anlegemaske (M3.2): ohne Vorlage, Filter, Tastatur.
 *
 * Gemessen wird der abgeschickte Entwurf. Dass beide Wege dieselbe Einheit
 * ergeben, misst `szenarien-anlage.test.ts` am Aktendienst.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { EinheitAnlegen } from "./EinheitAnlegen.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

let attrappe: Attrappe;
let geschlossen = 0;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  geschlossen = 0;
  useLaden.setState({
    akteId: "akte-1",
    baum: {
      lageZeiger: 5,
      baum: [{ id: "EO", name: "Deich Nord", typ: "EINSATZORT", tiefe: 0, kinder: [] }],
    } as never,
    tabelle: undefined,
    fehler: undefined,
    hinweise: [],
  });
});

function zeigeMaske(): HTMLFormElement {
  render(
    <EinheitAnlegen
      abschnittId="EO"
      aufSchliessen={() => {
        geschlossen += 1;
      }}
    />,
  );
  return screen.getByLabelText("Einheit anlegen") as HTMLFormElement;
}

function nutzlast(): Record<string, unknown> {
  const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
  expect(entwurf?.typ).toBe("EinheitGemeldet");
  return entwurf?.nutzlast as Record<string, unknown>;
}

function optionen(): string[] {
  return within(screen.getByRole("listbox", { name: "Vorlagen" }))
    .getAllByRole("option")
    .map((option) => option.querySelector("strong")?.textContent ?? "");
}

describe("Einheit anlegen", () => {
  it("legt ohne Vorlage eine freie Zeile an", async () => {
    const maske = zeigeMaske();
    fireEvent.click(screen.getByRole("button", { name: "Ohne Vorlage" }));
    const knopf = within(maske).getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "FW LZ Hude" } });
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "FEUERWEHR" } });
    fireEvent.change(screen.getByLabelText("Ebene"), { target: { value: "ZUG" } });
    fireEvent.change(screen.getByLabelText("Führer"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Unterführer"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Mannschaft"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("Herkunft"), { target: { value: "FF Hude" } });
    expect(knopf.disabled).toBe(false);
    fireEvent.click(knopf);

    await waitFor(() => {
      expect(geschlossen).toBe(1);
    });
    const werte = nutzlast();
    expect(werte).toMatchObject({
      abschnittId: "EO",
      bezeichnung: "FW LZ Hude",
      organisation: "FEUERWEHR",
      ebene: "ZUG",
      staerke: { fuehrer: 1, unterfuehrer: 3, mannschaft: 18 },
      status: "ANGEFORDERT",
      hierarchie: [{ art: "ORTSVERBAND", name: "FF Hude" }],
    });
    expect("vorlageId" in werte).toBe(false);
  });

  it("sperrt die freie Zeile bei ungültiger Stärke", () => {
    const maske = zeigeMaske();
    fireEvent.click(screen.getByRole("button", { name: "Ohne Vorlage" }));
    fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "X" } });
    fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "DRK" } });
    fireEvent.change(screen.getByLabelText("Ebene"), { target: { value: "TRUPP" } });
    fireEvent.change(screen.getByLabelText("Mannschaft"), { target: { value: "8a" } });
    expect((within(maske).getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("filtert nach Text, Katalog und Organisation", () => {
    zeigeMaske();
    fireEvent.change(screen.getByLabelText("Nur Katalog"), { target: { value: "FEUERWEHR" } });
    expect(optionen()).toEqual(["LZ FW", "ZTr", "LGr", "LSt", "LTr"]);
    // Katalognamen stehen ausgeschrieben, nicht als Schlüssel.
    expect(screen.getByRole("option", { name: "KatS-StAN Nds" })).toBeDefined();

    fireEvent.change(screen.getByLabelText("Nur Katalog"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Vorlage suchen"), { target: { value: "sanität" } });
    expect(optionen()).toEqual(["Z SB", "Gr San"]);

    fireEvent.change(screen.getByLabelText("Nur Organisation"), { target: { value: "FEUERWEHR" } });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByText(/Keine Vorlage passt/)).toBeDefined();
  });

  it("wählt mit Tippen, Pfeil und Enter und bestätigt mit dem zweiten Enter", async () => {
    const maske = zeigeMaske();
    const suche = screen.getByLabelText("Vorlage suchen");
    // Die Maske setzt den Fokus ins erste Feld — das ist die Suche.
    expect(document.activeElement).toBe(suche);

    fireEvent.change(suche, { target: { value: "sanität" } });
    fireEvent.keyDown(suche, { key: "ArrowDown" });
    expect(suche.getAttribute("aria-activedescendant")).toBe("vorlage-kats-z-sb-gr-san");
    fireEvent.keyDown(suche, { key: "ArrowUp" });
    expect(suche.getAttribute("aria-activedescendant")).toBe("vorlage-kats-z-sb");

    // Erstes Enter wählt und wird verbraucht …
    expect(fireEvent.keyDown(suche, { key: "Enter" })).toBe(false);
    expect(within(screen.getByRole("listbox", { name: "Vorlagen" })).getByRole("option", { selected: true }).id).toBe(
      "vorlage-kats-z-sb",
    );
    expect(screen.getByText(/Soll 1\/3\/18, Annahme/)).toBeDefined();
    // … das zweite fällt zum Formular durch.
    expect(fireEvent.keyDown(suche, { key: "Enter" })).toBe(true);

    fireEvent.change(within(maske).getByLabelText("Organisation"), { target: { value: "JUH" } });
    fireEvent.submit(maske);
    await waitFor(() => {
      expect(geschlossen).toBe(1);
    });
    expect(nutzlast()).toMatchObject({
      bezeichnung: "Z SB",
      organisation: "JUH",
      ebene: "ZUG",
      vorlageId: "kats-z-sb",
      staerke: { fuehrer: 1, unterfuehrer: 3, mannschaft: 18 },
    });
  });

  it("belegt die Organisation einer Vorlage mit ihrem ersten Träger vor", () => {
    const maske = zeigeMaske();
    fireEvent.change(screen.getByLabelText("Vorlage suchen"), { target: { value: "Gr Tau" } });
    fireEvent.click(screen.getByRole("option", { name: /Gr Tau/ }));
    const organisation = within(maske).getByLabelText("Organisation") as HTMLSelectElement;
    expect(organisation.value).toBe("DLRG");
  });
});
