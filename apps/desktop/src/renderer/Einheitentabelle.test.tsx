/**
 * Komponententests zur Einheitentabelle (M3.2).
 *
 * Sie messen die Verdrahtung: dass ein Doppelklick eine Zelle bearbeitbar
 * macht, dass Enter das richtige Ereignis mit dem gesehenen `vorher` schickt,
 * dass eine unveränderte Eingabe **nichts** schreibt und dass die
 * Spaltengruppen der Excel zuschaltbar sind. Die fachliche Wirkung steht in
 * `szenarien-einheiten.test.ts`, die Regeln in `bedienschritte.test.ts`.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { projektion, type Tabellenzeile, type Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zelle(text: string, wert: unknown, umstritten = false): Zelle {
  return { text, wert, umstritten };
}

function zeile(id: string, bezeichnung: string, teil: Partial<Tabellenzeile> = {}): Tabellenzeile {
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
      organisation: zelle("THW", "THW"),
      status: zelle("IM_EINSATZ", "IM_EINSATZ"),
      schicht: zelle("", null),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
      weiblich: zelle("0", null),
    },
    ...teil,
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 5,
    zeilen: [zeile("U1", "Bergungsgruppe 1"), zeile("U2", "Fachgruppe N")],
    gesamtzahl: 2,
    von: 0,
  });
  attrappe.antwortet("untertabelleAnfordern", {
    lageZeiger: 5,
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

async function zeigeTabelle(einheitId?: string): Promise<void> {
  render(
    <Einheitentabelle abschnittId={undefined} einheitId={einheitId} aufEinheit={() => undefined} />,
  );
  await waitFor(() => {
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
  });
}

describe("Die Einheitentabelle", () => {
  it("zeigt die Grunddaten und die Stärke, aber nicht die ausgeblendeten Gruppen", async () => {
    await zeigeTabelle();
    // Die Vorbelegung folgt der Excel: L:Y, AC:AI und AN:AW sind in der
    // Vorlage ausgeblendet und per Menü zuschaltbar.
    expect(screen.getByRole("columnheader", { name: "Bezeichnung" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Weibl." })).toBeNull();
    expect(projektion.SICHTBARE_GRUPPEN_VORBELEGUNG).toEqual(["GRUNDDATEN", "STAERKE"]);
  });

  it("schaltet eine Spaltengruppe zu und wieder ab", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByRole("button", { name: "Logistik" }));
    expect(screen.getByRole("columnheader", { name: "Weibl." })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Logistik" }));
    expect(screen.queryByRole("columnheader", { name: "Weibl." })).toBeNull();
  });

  it("lässt die Grunddaten nicht wegschalten", async () => {
    await zeigeTabelle();
    // Eine Tabelle ohne Bezeichnung und Status ist keine Lage.
    expect(screen.getByRole("button", { name: "Grunddaten" }).hasAttribute("disabled")).toBe(true);
  });

  it("schreibt eine Inline-Änderung mit dem gesehenen Vorher-Wert (§2.2a)", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    const feld = screen.getByLabelText("Bezeichnung");
    fireEvent.change(feld, { target: { value: "Bergungsgruppe Nord" } });
    fireEvent.keyDown(feld, { key: "Enter" });

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("EinheitStammdatenGeaendert");
    expect(entwurf?.vorher).toBe("Bergungsgruppe 1");
    expect(entwurf?.neu).toBe("Bergungsgruppe Nord");
  });

  it("schreibt nichts, wenn sich der Wert nicht geändert hat", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    fireEvent.keyDown(screen.getByLabelText("Bezeichnung"), { key: "Enter" });
    // Ein Ereignis, das denselben Wert noch einmal setzt, steht für immer im
    // Protokoll und erzeugt bei einem zweiten Arbeitsplatz einen
    // Konfliktkandidaten ohne fachlichen Anlass.
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("verwirft die Bearbeitung mit Escape", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    const feld = screen.getByLabelText("Bezeichnung");
    fireEvent.change(feld, { target: { value: "Ganz anders" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    expect(screen.queryByLabelText("Bezeichnung")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("macht eine berechnete Spalte nicht bearbeitbar", async () => {
    await zeigeTabelle();
    // „Gesamt" ist in der Excel eine Formel; sie zu schreiben hieße, eine
    // Summe gegen ihre Summanden setzen zu können.
    fireEvent.doubleClick(screen.getAllByText("9")[0] as HTMLElement);
    expect(screen.queryByLabelText("Gesamt")).toBeNull();
  });

  it("markiert eine umstrittene Zelle (§3.8)", async () => {
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 5,
      zeilen: [
        zeile("U1", "Bergungsgruppe 1", {
          zellen: {
            ...zeile("U1", "Bergungsgruppe 1").zellen,
            status: zelle("RUHE", "RUHE", true),
          },
        }),
      ],
      gesamtzahl: 1,
      von: 0,
    });
    await zeigeTabelle();
    expect(screen.getByLabelText("Konflikthinweis")).toBeDefined();
  });

  it("sperrt die Mehrfachhandlungen, solange nichts markiert ist", async () => {
    await zeigeTabelle();
    expect(screen.getByRole("button", { name: /Verschieben/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Zusammenführen" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    expect(screen.getByRole("button", { name: /Verschieben/ }).hasAttribute("disabled")).toBe(false);
    // Zusammenführen braucht mindestens zwei — mit einer einzigen Einheit
    // gäbe es nichts zusammenzuführen.
    expect(screen.getByRole("button", { name: "Zusammenführen" }).hasAttribute("disabled")).toBe(true);
  });

  it("markiert mehrere Einheiten mit Strg und öffnet die Verschiebemaske", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"), { ctrlKey: true });
    fireEvent.click(screen.getByText("Fachgruppe N"), { ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Verschieben/ }));
    expect(screen.getByLabelText("2 Einheit(en) verschieben")).toBeDefined();
  });

  it("nennt unter der Tabelle den Ausschnitt, wenn nicht alles gezeigt wird", async () => {
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 5,
      zeilen: [zeile("U1", "Bergungsgruppe 1")],
      gesamtzahl: 150,
      von: 0,
    });
    await zeigeTabelle();
    expect(screen.getByText("1 von 150 Einheiten")).toBeDefined();
  });

  it("reicht die Suche als Filter an den Worker weiter", async () => {
    await zeigeTabelle();
    fireEvent.change(screen.getByLabelText("Suche"), { target: { value: "Fachgruppe" } });
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.suche).toBe("Fachgruppe");
    });
  });
});
