/**
 * Funktionalität: Tastaturbedienung — das BDD-Szenario zu M3.6.
 *
 * Es ist das einzige der drei BDD-Pakete, das **nicht** in den Worker gehört:
 * Wovon es handelt, ist die Bedienung, und die findet im Fenster statt. Es
 * läuft deshalb gegen die echten Komponenten mit `@testing-library/react`,
 * über eine Brückenattrappe an der Stelle, an der im Betrieb das Preload
 * steht.
 *
 * Was es prüft, ist die DoD wörtlich: „Enter/Escape in allen Masken, Strg+D
 * für ‚jetzt‘, Kürzel für Anlegen/Verschieben/Suchen, Abkürzungsliste als
 * Hilfefenster.“
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Baumknoten, Tabellenzeile, Zelle } from "@s1/domaene";

import { Abschnittsbaum } from "./Abschnittsbaum.js";
import { Einheitentabelle } from "./Einheitentabelle.js";
import { Hilfe } from "./Hilfe.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function knoten(id: string, name: string): Baumknoten {
  return {
    id,
    name,
    typ: "EINSATZORT",
    reihenfolge: 1,
    tiefe: 0,
    eigeneStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
    summenStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
    einheiten: 0,
    einheitenSumme: 0,
    zaehlt: true,
    systemAbschnitt: false,
    kinder: [],
  };
}

function zelle(text: string, wert: unknown): Zelle {
  return { text, wert, umstritten: false };
}

function zeile(id: string, bezeichnung: string): Tabellenzeile {
  return {
    einheitId: id,
    abschnittId: "EO",
    reihenfolge: 1,
    anzeige: bezeichnung,
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    gesamt: 9,
    entfernt: false,
    aufgegangen: false,
    hinweise: [],
    zellen: {
      bezeichnung: zelle(bezeichnung, bezeichnung),
      status: zelle("IM_EINSATZ", "IM_EINSATZ"),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
      verfuegbarBis: zelle("", null),
    },
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("baumAnfordern", { lageZeiger: 1, baum: [knoten("EO", "Deich Nord")] });
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 1,
    zeilen: [zeile("U1", "Bergungsgruppe 1")],
    gesamtzahl: 1,
    von: 0,
  });
  attrappe.antwortet("untertabelleAnfordern", {
    lageZeiger: 1,
    einheitId: "U1",
    fahrzeuge: [],
    personen: [],
    auftraege: [],
  });
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
});

describe("Funktionalität: Tastaturbedienung", () => {
  it("Szenario: Strg+N öffnet die Anlagemaske des Abschnittsbaums", async () => {
    render(<Abschnittsbaum gewaehlt={undefined} aufWahl={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Deich Nord")).toBeDefined();
    });

    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    expect(screen.getByLabelText("Abschnitt anlegen")).toBeDefined();
  });

  it("Szenario: Escape schließt die Maske, ohne zu schreiben", async () => {
    render(<Abschnittsbaum gewaehlt={undefined} aufWahl={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Deich Nord")).toBeDefined();
    });
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    const feld = screen.getByLabelText("Name");
    fireEvent.change(feld, { target: { value: "EA Nord" } });

    fireEvent.keyDown(feld, { key: "Escape" });
    expect(screen.queryByLabelText("Abschnitt anlegen")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("Szenario: Enter bestätigt die Maske", async () => {
    render(<Abschnittsbaum gewaehlt={undefined} aufWahl={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Deich Nord")).toBeDefined();
    });
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    const feld = screen.getByLabelText("Name");
    fireEvent.change(feld, { target: { value: "EA Nord" } });
    fireEvent.submit(feld.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("AbschnittAngelegt");
    });
  });

  it("Szenario: im Eingabefeld greift Strg+N nicht", async () => {
    render(<Abschnittsbaum gewaehlt={undefined} aufWahl={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Deich Nord")).toBeDefined();
    });
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    const feld = screen.getByLabelText("Name");

    // Wer „neuer Abschnitt" tippt, will beim n kein zweites Formular. Der
    // Druck geht an das Feld und nicht an die Ansicht.
    fireEvent.keyDown(feld, { key: "n", ctrlKey: true });
    expect(screen.getAllByLabelText("Abschnitt anlegen")).toHaveLength(1);
  });

  it("Szenario: Strg+F springt in die Suche der Einheitentabelle", async () => {
    render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
    });

    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText("Suche"));
  });

  it("Szenario: Strg+M öffnet die Verschiebemaske für die markierten Einheiten", async () => {
    render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
    });

    // Ohne Markierung tut das Kürzel nichts: Es gäbe nichts zu verschieben.
    fireEvent.keyDown(window, { key: "m", ctrlKey: true });
    expect(screen.queryByLabelText(/verschieben/)).toBeNull();

    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    fireEvent.keyDown(window, { key: "m", ctrlKey: true });
    expect(screen.getByLabelText("1 Einheit(en) verschieben")).toBeDefined();
  });

  it("Szenario: Strg+D schreibt „jetzt“ in ein Zeitfeld", async () => {
    render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
    });
    // Die Ressourcenplanung zuschalten — dort steht „Verfügbar bis".
    fireEvent.click(screen.getByLabelText("RESSOURCENPLANUNG"));
    const spalte = screen.getByRole("columnheader", { name: "Verfügbar bis" });
    expect(spalte).toBeDefined();

    // Die Zelle wird über die Stelle ihrer Spalte gesucht und nicht über
    // ihren Text: Sie ist leer, und eine leere Zelle hat keinen.
    const koepfe = screen.getAllByRole("columnheader").map((kopf) => kopf.textContent);
    const stelle = koepfe.indexOf("Verfügbar bis");
    // Die erste Spalte ist der Abschnitt und steht als `rowheader`; die
    // Datenzellen beginnen deshalb eine Stelle später.
    const zellen = screen.getAllByRole("cell");
    fireEvent.doubleClick(zellen[stelle - 1] as HTMLElement);
    const feld = screen.getByLabelText("Verfügbar bis");
    fireEvent.keyDown(feld, { key: "d", ctrlKey: true });

    // Das Kürzel der Excel für genau diesen Handgriff (`=Now` in die aktive
    // Zelle). Geprüft wird die Form, nicht die Sekunde.
    expect((feld as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("Szenario: die Abkürzungsliste steht als Hilfefenster bereit", () => {
    render(<Hilfe aufSchliessen={() => undefined} />);
    expect(screen.getByLabelText("Hilfe")).toBeDefined();
    expect(screen.getByText("Zugtrupp")).toBeDefined();
    // Und die Tastenkarte steht daneben, aus derselben Liste, aus der die
    // Kürzel greifen.
    expect(screen.getByText("Strg+H")).toBeDefined();
  });
});
