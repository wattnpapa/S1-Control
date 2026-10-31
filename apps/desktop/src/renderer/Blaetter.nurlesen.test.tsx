/**
 * Beendeter Einsatz (Review-Runde 3): Kosten, Führungsstelle, Eingangskorb und
 * Anforderungen sperren Felder und Zeilenknöpfe schon vorher und sagen
 * sichtbar, warum – statt erst nach dem Klick abzuweisen oder still zu verwerfen.
 * Dazu: Inline-Felder behalten ihre Eingabe, wenn das Schreiben nicht ankommt.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Anforderungszeile, Kostenblatt, Meldungszeile } from "@s1/domaene";
import type { Fuestansicht, Lagebild } from "../kontrakt/index.js";

import { Anforderungen } from "./Anforderungen.js";
import { Eingangskorb } from "./Eingangskorb.js";
import { Fuehrungsstelle } from "./Fuehrungsstelle.js";
import { Kosten } from "./Kosten.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { MELDUNG_NICHT_GESPEICHERT } from "./verbindung.js";

afterEach(cleanup);

const BEDIENE = useLaden.getState().bediene;
let attrappe: Attrappe;

function lage(status: "AKTIV" | "BEENDET"): Lagebild {
  return { einsatzStatus: status, einsatzId: "E-1" } as unknown as Lagebild;
}

const BLATT: Kostenblatt = {
  parameter: { psaKostenProSatz: 180, vdaProTag: 150, ukVerpflegungProTag: 20, geplanteEinsatztage: 5 },
  zeilen: [],
  summe: { koepfe: 0, psaProTag: 0, vdaUkProTag: 0, personentage: 0, gesamt: 0 },
  ausgenommen: 0,
};

const FUEST: Fuestansicht = {
  lageZeiger: 1,
  bloecke: [
    {
      teileinheit: "Stab",
      zeilen: [
        { id: "D1", teileinheit: "Stab", funktion: "Ltr FüSt", schicht: "TAG", reihenfolge: 1, rolle: "fuehrer", besetzung: "Mennenga", besetzt: true, entfernt: false },
      ],
      summeJeSchicht: {},
    },
  ],
  plan: { tage: [], zeilen: [] },
  staerke: [],
} as unknown as Fuestansicht;

function anforderung(zustand: Anforderungszeile["zustand"]): Anforderungszeile {
  return {
    id: "A1",
    kennung: "ANF-1",
    zustand,
    angefordertAm: "2026-09-10T09:00:00+02:00",
    vorgeseheneEinheitText: "BGr",
    vorgesehenerAuftrag: "",
    bemerkung: "",
    storniert: false,
    hinweise: [],
  } as unknown as Anforderungszeile;
}

function meldung(): Meldungszeile {
  return {
    id: "m1",
    zustand: "NEU",
    einheitSchluessel: "k",
    stand: "2026-09-10T08:00:00+02:00",
    empfangenAm: "2026-09-10T08:05:00+02:00",
    quelle: "SCAN",
    signatur: "GUELTIG",
    bezeichnung: "Oldenburg",
    organisation: "THW",
    staerke: "0/1/8",
    uebernommeneFelder: [],
    fassung: 1,
    fassungen: 1,
    kopf: true,
  } as unknown as Meldungszeile;
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("kostenAnfordern", { lageZeiger: 7, blatt: BLATT });
  attrappe.antwortet("fuestAnfordern", FUEST);
  attrappe.antwortet("anforderungenAnfordern", {
    lageZeiger: 9,
    zeilen: [anforderung("OFFEN")],
    von: 0,
    gesamtzahl: 1,
    jeZustand: {},
  });
  attrappe.antwortet("eingangskorbAnfordern", {
    lageZeiger: 12,
    zeilen: [meldung()],
    von: 0,
    gesamtzahl: 1,
    jeZustand: { NEU: 1, GEAENDERT: 0, UEBERNOMMEN: 0, ABGELEHNT: 0 },
    offen: 1,
  });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-1" });
  useLaden.setState({
    bediene: BEDIENE,
    akteId: "akte-1",
    kosten: undefined,
    fuest: undefined,
    anforderungen: undefined,
    anforderungsfilter: {},
    eingangskorb: undefined,
    fehler: undefined,
    hinweise: [],
    lagebild: lage("BEENDET"),
  });
});

describe("Beendeter Einsatz", () => {
  it("sperrt die Kosten-Felder und sagt es im Blatt", async () => {
    render(<Kosten />);
    const feld = (await screen.findByLabelText("Kosten pro Satz PSA (€)")) as HTMLInputElement;
    expect(feld.disabled).toBe(true);
    expect(screen.getByTestId("nurlesen").textContent).toMatch(/Einsatz beendet – nur lesen/);
  });

  it("sperrt Dienstposten anlegen, Besetzung und Entfernen", async () => {
    render(<Fuehrungsstelle />);
    await screen.findByText("Ltr FüSt");
    expect((screen.getByRole("button", { name: "Dienstposten anlegen" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Entfernen" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText("Besetzung Ltr FüSt TAG") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByTestId("nurlesen")).toBeDefined();
  });

  it("sperrt die Zeilenknöpfe der Anforderungen", async () => {
    render(<Anforderungen />);
    const zusagen = (await screen.findByRole("button", { name: "Zusagen" })) as HTMLButtonElement;
    expect(zusagen.disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Stornieren" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("nurlesen")).toBeDefined();
  });

  it("sperrt Ablehnen im Eingangskorb", async () => {
    render(<Eingangskorb />);
    const knopf = (await screen.findByRole("button", { name: "Ablehnen" })) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    expect(screen.getByTestId("nurlesen")).toBeDefined();
  });
});

describe("Inline-Felder bei nicht angekommenem Schreiben", () => {
  beforeEach(() => {
    useLaden.setState({
      lagebild: lage("AKTIV"),
      bediene: () => {
        useLaden.setState({ fehler: MELDUNG_NICHT_GESPEICHERT });
        return Promise.resolve(undefined);
      },
    });
  });

  it("behält die Besetzung im Feld und zeigt den Hinweis am Feld", async () => {
    render(<Fuehrungsstelle />);
    const feld = (await screen.findByLabelText("Besetzung Ltr FüSt TAG")) as HTMLInputElement;
    fireEvent.change(feld, { target: { value: "Neuer Name" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/Nicht gespeichert/);
    });
    expect(feld.value).toBe("Neuer Name");
  });

  it("behält den Kostenwert im Feld und zeigt den Hinweis am Feld", async () => {
    render(<Kosten />);
    const feld = (await screen.findByLabelText("VDA pro Tag und Kraft (€)")) as HTMLInputElement;
    fireEvent.change(feld, { target: { value: "999" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/Nicht gespeichert/);
    });
    expect(feld.value).toBe("999");
  });

  it("nennt eine ungültige Kostenzahl am Feld statt sie still zu verwerfen", async () => {
    render(<Kosten />);
    const feld = (await screen.findByLabelText("VDA pro Tag und Kraft (€)")) as HTMLInputElement;
    fireEvent.change(feld, { target: { value: "abc" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    expect(screen.getByText(/Bitte eine Zahl ab 0 eingeben/)).toBeDefined();
    expect(feld.value).toBe("abc");
  });

  it("lässt den Ablehnungsgrund im Dialog stehen, bis das Schreiben bestätigt ist", async () => {
    render(<Eingangskorb />);
    fireEvent.click(await screen.findByRole("button", { name: "Ablehnen" }));
    const grund = screen.getByLabelText("Grund (Pflicht)") as HTMLInputElement;
    fireEvent.change(grund, { target: { value: "Doppelt gemeldet" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Ablehnen" }).at(-1) as HTMLElement);
    await waitFor(() => {
      expect(screen.getAllByRole("alert").some((a) => /Nicht gespeichert/.test(a.textContent ?? ""))).toBe(true);
    });
    expect((screen.getByLabelText("Grund (Pflicht)") as HTMLInputElement).value).toBe("Doppelt gemeldet");
  });
});
