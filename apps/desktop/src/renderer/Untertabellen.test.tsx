/**
 * Komponententests zu den Untertabellen einer Einheit — der Erfassungsweg für
 * Aufträge, Fahrzeuge und Personen.
 *
 * Die fachliche Wirkung steht in `worker/szenarien-einheitsteile.test.ts`;
 * hier steht die Verdrahtung: welcher Knopf welche Maske öffnet, welcher
 * Entwurf beim Bestätigen hinausgeht, und dass alles ohne Maus geht — der
 * Fokus steht im ersten Feld, Enter übernimmt, Escape verwirft.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { zeitpunktText, type Tabellenzeile, type Untertabelle } from "@s1/domaene";

import { Untertabellen } from "./Untertabellen.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const VON = "2026-10-30T13:30:00.000Z";

const DATEN: Untertabelle = {
  fahrzeuge: [
    { id: "F1", typ: "GKW", bezeichnung: "GKW 1", kennzeichen: "THW-84123", entfernt: false },
    { id: "F2", typ: "MTW", bezeichnung: "", entfernt: true },
  ],
  personen: [{ id: "P1", name: "Anna Muster", rolle: "UNTERFUEHRER", entfernt: false }],
  auftraege: [{ id: "A1", text: "Deich sichern", von: VON, beendet: false }],
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("untertabelleAnfordern", { lageZeiger: 3, einheitId: "U1", ...DATEN });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    untertabelle: undefined,
    tabelle: {
      lageZeiger: 3,
      zeilen: [{ einheitId: "U1", abschnittId: "EO", abschnittName: "Deich Nord" } as Tabellenzeile],
      gesamtzahl: 1,
      von: 0,
      jeStatus: {},
    },
    fehler: undefined,
    hinweise: [],
  });
});

async function zeige(): Promise<void> {
  render(<Untertabellen einheitId="U1" />);
  await waitFor(() => {
    expect(screen.getByText(/Deich sichern/)).toBeDefined();
  });
}

function knopf(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

function entwurf() {
  return attrappe.letzterRuf("bedienen")?.entwurf;
}

describe("Die Untertabellen", () => {
  it("zeigen Rolle und Zeiten als Wort und Uhrzeit, nicht als Schlüssel", async () => {
    await zeige();
    expect(screen.getByText(/Anna Muster · Unterführer/)).toBeDefined();
    expect(screen.getByText(`${zeitpunktText(VON)}– Deich sichern`)).toBeDefined();
    expect(screen.getByText(/GKW — GKW 1 \(THW-84123\)/)).toBeDefined();
  });

  it("erfassen einen Auftrag mit Enter — Fokus im ersten Feld, Ort der Einheit, Beginn jetzt", async () => {
    await zeige();
    fireEvent.click(knopf("Auftrag erfassen"));
    const feld = screen.getByLabelText("Auftrag");
    expect(document.activeElement).toBe(feld);
    expect(screen.getByText("Ort: Deich Nord")).toBeDefined();

    fireEvent.change(feld, { target: { value: "Sandsäcke füllen" } });
    fireEvent.submit(feld.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(entwurf()?.typ).toBe("AuftragErfasst");
    });
    expect(entwurf()?.nutzlast).toMatchObject({
      einheitId: "U1",
      abschnittId: "EO",
      text: "Sandsäcke füllen",
      quelle: "MANUELL",
    });
    const von = (entwurf()?.nutzlast as { von: string }).von;
    expect(Math.abs(new Date(von).getTime() - Date.now())).toBeLessThan(60_000);
    await waitFor(() => {
      expect(screen.queryByLabelText("Auftrag erfassen", { selector: "form" })).toBeNull();
    });
    // Danach sofort frisch: die Untertabelle und die Tabelle mit Spalte K.
    expect(attrappe.rufeDerArt("untertabelleAnfordern").length).toBeGreaterThan(1);
    expect(attrappe.rufeDerArt("tabelleAnfordern").length).toBeGreaterThan(0);
  });

  it("verwerfen eine Erfassung mit Escape, ohne zu schreiben", async () => {
    await zeige();
    fireEvent.click(knopf("Fahrzeug erfassen"));
    const feld = screen.getByLabelText("Typ");
    fireEvent.change(feld, { target: { value: "GKW" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    expect(screen.queryByLabelText("Fahrzeug erfassen", { selector: "form" })).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("lesen einen getippten Beginn und weisen einen unlesbaren ab", async () => {
    await zeige();
    fireEvent.click(knopf("Auftrag erfassen"));
    fireEvent.change(screen.getByLabelText("Auftrag"), { target: { value: "Deich sichern" } });
    const beginn = screen.getByLabelText("Beginn");
    fireEvent.change(beginn, { target: { value: "morgen" } });
    fireEvent.submit(beginn.closest("form") as HTMLFormElement);
    expect(screen.getByRole("alert").textContent).toContain("keine lesbare Zeitangabe");
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);

    // Strg+D schreibt „jetzt“, wie in der Zelle der Tabelle.
    fireEvent.keyDown(beginn, { key: "d", ctrlKey: true });
    expect((beginn as HTMLInputElement).value).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
  });

  it("legen ein Fahrzeug mit den Feldern des Schemas an", async () => {
    await zeige();
    fireEvent.click(knopf("Fahrzeug erfassen"));
    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "MLW IV" } });
    fireEvent.change(screen.getByLabelText("Kennzeichen"), { target: { value: "THW-90001" } });
    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "NICHT_EINSATZBEREIT" } });
    fireEvent.click(knopf("Erfassen"));

    await waitFor(() => {
      expect(entwurf()?.typ).toBe("FahrzeugAngelegt");
    });
    expect(entwurf()?.nutzlast).toEqual({
      fahrzeugId: expect.stringMatching(/^F-/) as unknown,
      einheitId: "U1",
      typ: "MLW IV",
      kennzeichen: "THW-90001",
      status: "NICHT_EINSATZBEREIT",
    });
  });

  it("verlangen bei der Person Geschlecht und Verpflegung, statt sie vorzubelegen", async () => {
    await zeige();
    fireEvent.click(knopf("Person erfassen"));
    fireEvent.change(screen.getByLabelText("Nachname"), { target: { value: "Meier" } });
    fireEvent.change(screen.getByLabelText("Vorname"), { target: { value: "Jan" } });
    expect(knopf("Erfassen").hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Geschlecht"), { target: { value: "MAENNLICH" } });
    fireEvent.change(screen.getByLabelText("Verpflegung"), { target: { value: "VEGAN" } });
    fireEvent.change(screen.getByLabelText("Rolle"), { target: { value: "FUEHRER" } });
    fireEvent.click(knopf("Erfassen"));

    await waitFor(() => {
      expect(entwurf()?.typ).toBe("PersonHinzugefuegt");
    });
    expect(entwurf()?.nutzlast).toMatchObject({
      einheitId: "U1",
      nachname: "Meier",
      vorname: "Jan",
      rolle: "FUEHRER",
      geschlecht: "MAENNLICH",
      ernaehrung: "VEGAN",
    });
  });

  it("setzen einen Auftrag als erledigt — Ende mit „jetzt“ vorbelegt, Enter übernimmt", async () => {
    await zeige();
    fireEvent.click(knopf("Auftrag erledigt"));
    const ende = screen.getByLabelText("Ende") as HTMLInputElement;
    expect(document.activeElement).toBe(ende);
    expect(ende.value).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);
    fireEvent.submit(ende.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(entwurf()?.typ).toBe("AuftragBeendet");
    });
    expect(entwurf()).toMatchObject({ nutzlast: { auftragId: "A1" }, vorher: null });
    expect(typeof entwurf()?.neu).toBe("string");
  });

  it("entfernen ein Fahrzeug nur mit Grund (§2.4)", async () => {
    await zeige();
    fireEvent.click(knopf("Fahrzeug entfernen"));
    expect(knopf("Entfernen").hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Grund (Pflicht)"), { target: { value: "Motorschaden" } });
    fireEvent.click(knopf("Entfernen"));

    await waitFor(() => {
      expect(entwurf()).toMatchObject({
        typ: "FahrzeugEntfernt",
        nutzlast: { fahrzeugId: "F1" },
        neu: true,
        grund: "Motorschaden",
      });
    });
  });

  it("nehmen einen Auftrag auch ohne Grund zurück", async () => {
    await zeige();
    fireEvent.click(knopf("Auftrag zurücknehmen"));
    fireEvent.click(knopf("Zurücknehmen"));
    await waitFor(() => {
      expect(entwurf()).toMatchObject({ typ: "AuftragZurueckgenommen", nutzlast: { auftragId: "A1" }, neu: true });
    });
  });

  it("stellen ein entferntes Fahrzeug mit einem Druck wieder her", async () => {
    await zeige();
    fireEvent.click(knopf("Fahrzeug wiederherstellen"));
    await waitFor(() => {
      expect(entwurf()).toMatchObject({ typ: "FahrzeugWiederhergestellt", nutzlast: { fahrzeugId: "F2" }, vorher: true, neu: false });
    });
  });

  it("lassen die Maske bei einer Abweisung offen und nennen den Grund", async () => {
    attrappe.antwortet("bedienen", {
      art: "abgewiesen",
      meldung: "Der Auftrag braucht einen Text.",
      dauerhafterHinweis: false,
    });
    await zeige();
    fireEvent.click(knopf("Auftrag erfassen"));
    fireEvent.change(screen.getByLabelText("Auftrag"), { target: { value: "x" } });
    fireEvent.click(knopf("Erfassen"));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Der Auftrag braucht einen Text.");
    });
    expect(screen.getByLabelText("Auftrag")).toBeDefined();
  });
});
