/**
 * Die Spaltengruppe „Funk" der Einheitentabelle (KONZEPT-FUNKPLAN.md §6,
 * Option 5c).
 *
 * Gemessen wird: dass die Gruppe am Umschalter „Funk" heißt und in der
 * Vorbelegung fehlt, dass die Auswahl der Zelle aus der Tabellenansicht kommt
 * (die Rufgruppen sind Daten des Einsatzes, keine feste Liste), dass „DMO"
 * und „ohne" als Marke an der Zelle stehen und dass die Zelle
 * `EinheitRufgruppeGesetzt` mit dem gesehenen Vorwert schreibt — dasselbe
 * Ereignis wie die Zelle im Blatt „Funkplan".
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tabellenzeile, Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { auswahleintraege } from "./Einheitenzelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zelle(text: string, wert: unknown): Zelle {
  return { text, wert, umstritten: false };
}

function zeile(id: string, bezeichnung: string, rufgruppe: Zelle, teil: Partial<Tabellenzeile> = {}): Tabellenzeile {
  return {
    einheitId: id,
    abschnittId: "EO",
    abschnittName: "Deich Nord",
    reihenfolge: 1,
    anzeige: bezeichnung,
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    gesamt: 9,
    entfernt: false,
    zaehlklasse: "ist",
    aufgegangen: false,
    hinweise: [],
    zellen: {
      bezeichnung: zelle(bezeichnung, bezeichnung),
      status: zelle("IM_EINSATZ", "IM_EINSATZ"),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
      rufgruppe,
      funkrufname: zelle("Heros Oldenburg 21/52", undefined),
    },
    ...teil,
  };
}

const AUSWAHL = [
  { wert: "R1", titel: "THW_OL_FUE", betriebsart: "TMO" },
  { wert: "R3", titel: "DMO 310", betriebsart: "DMO" },
];

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 5,
    zeilen: [
      zeile("U1", "Bergungsgruppe 1", zelle("THW_OL_FUE", "R1")),
      zeile("U2", "Fachgruppe N", zelle("DMO 310", "R3")),
      zeile("U3", "FGr Notversorgung", zelle("", null), { zaehlklasse: "erwartet" }),
      zeile("U4", "SEG DLRG", zelle("THW_OL_BR (aufgelöst)", "R5")),
      zeile("U5", "Abgerückte Gruppe", zelle("", null), { zaehlklasse: "beendet" }),
    ],
    gesamtzahl: 5,
    von: 0,
    jeStatus: {},
    auswahlwerte: { rufgruppe: AUSWAHL },
  });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("sperre", null);
  useLaden.setState({
    akteId: "akte-1",
    lagebild: undefined,
    baum: undefined,
    tabelle: undefined,
    tabellenfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

async function mitFunk(): Promise<void> {
  render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
  await waitFor(() => {
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
  });
  expect(screen.queryByRole("columnheader", { name: "Rufgruppe" })).toBeNull();
  fireEvent.click(screen.getByRole("checkbox", { name: "Funk" }));
}

describe("Die Spaltengruppe „Funk“ der Einheitentabelle", () => {
  it("heißt am Umschalter „Funk“ und zeigt Rufgruppe und Funkrufname", async () => {
    await mitFunk();
    expect(screen.getByRole("columnheader", { name: "Rufgruppe" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Funkrufname" })).toBeDefined();
    expect(screen.getAllByText("Heros Oldenburg 21/52").length).toBeGreaterThan(0);
  });

  it("setzt „DMO“ und „ohne“ als Marke, aber nicht an beendeten Einheiten", async () => {
    await mitFunk();
    const dmo = screen.getByRole("row", { name: /Fachgruppe N/ });
    expect(within(dmo).getByText("DMO").className).toContain("warn");
    const erwartet = screen.getByRole("row", { name: /FGr Notversorgung/ });
    expect(within(erwartet).getByText("ohne").className).toContain("warn");
    // Die Gruppe ist aufgelöst: Die Einheit steht ohne Rufgruppe da, bis jemand sie umsetzt.
    expect(within(screen.getByRole("row", { name: /SEG DLRG/ })).getByText("ohne")).toBeDefined();
    expect(within(screen.getByRole("row", { name: /Abgerückte Gruppe/ })).queryByText("ohne")).toBeNull();
    expect(within(screen.getByRole("row", { name: /Bergungsgruppe 1/ })).queryByText("ohne")).toBeNull();
  });

  it("bietet die Rufgruppen der Tabellenansicht an und schreibt EinheitRufgruppeGesetzt mit Vorwert", async () => {
    await mitFunk();
    fireEvent.doubleClick(screen.getByText("THW_OL_FUE"));
    const feld = screen.getByLabelText("Rufgruppe");
    expect(within(feld).getAllByRole("option").map((o) => o.textContent)).toEqual(["—", "THW_OL_FUE", "DMO 310"]);
    fireEvent.change(feld, { target: { value: "R3" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf).toEqual({
        typ: "EinheitRufgruppeGesetzt",
        nutzlast: { einheitId: "U1" },
        vorher: "R1",
        neu: "R3",
        vorwertPruefen: true,
      });
    });
  });

  it("setzt eine Einheit ohne Gruppe mit vorher null", async () => {
    await mitFunk();
    const z = screen.getByRole("row", { name: /FGr Notversorgung/ });
    fireEvent.doubleClick(within(z).getByText("ohne").closest("td") as HTMLElement);
    const feld = screen.getByLabelText("Rufgruppe");
    fireEvent.change(feld, { target: { value: "R1" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf).toMatchObject({ typ: "EinheitRufgruppeGesetzt", vorher: null, neu: "R1" });
    });
  });
});

describe("auswahleintraege", () => {
  it("nimmt bei werteAus die Liste der Ansicht und hält einen nicht mehr wählbaren Wert sichtbar", () => {
    const spalte = { schluessel: "rufgruppe", kopf: "Rufgruppe", excel: "—", gruppe: "FUNK", art: "auswahl", werteAus: "rufgruppen" } as const;
    expect(auswahleintraege(spalte, AUSWAHL)).toEqual(AUSWAHL);
    expect(auswahleintraege(spalte, undefined)).toEqual([]);
    expect(auswahleintraege(spalte, AUSWAHL, { wert: "R5", titel: "THW_OL_BR (aufgelöst)" })[0]).toEqual({ wert: "R5", titel: "THW_OL_BR (aufgelöst)" });
    const status = { schluessel: "status", kopf: "Status", excel: "Z", gruppe: "GRUNDDATEN", art: "auswahl", werte: ["RUHE"] } as const;
    expect(auswahleintraege(status, undefined)).toEqual([{ wert: "RUHE", titel: "Ruhe" }]);
  });
});
