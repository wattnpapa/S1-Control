/**
 * Komponententests zur Tagebuch-Ansicht (M3.3).
 *
 * Die DoD verlangt zwei Aussagen: „ETB zeigt jede Änderung" und „Undo sichtbar
 * als Kompensation". Die erste misst `szenarien-tagebuch.test.ts` an der
 * echten Strecke — dort steht auch, dass drei Änderungen an einem Feld drei
 * Zeilen ergeben. Hier steht, dass die Ansicht die Filter richtig stellt und
 * eine Rücknahme als solche kenntlich macht.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tagebuchzeile } from "@s1/domaene";

import { Tagebuch, uhrzeit } from "./Tagebuch.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zeile(teil: Partial<Tagebuchzeile> = {}): Tagebuchzeile {
  return {
    ereignisId: "a-0000000001",
    typ: "StatusGesetzt",
    hlcText: "0000000000001-00000-aa",
    wanduhr: "2026-09-10T14:30:07+02:00",
    akteur: "Bediener 1",
    rechner: "fuest-laptop",
    clientId: "a",
    satz: "Bergungsgruppe 1: Status gesetzt: ANMARSCH → IM_EINSATZ",
    einheitId: "U1",
    abschnittId: "EO",
    ...teil,
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("tagebuchAnfordern", {
    lageZeiger: 9,
    zeilen: [zeile()],
    gesamtzahl: 1,
    von: 0,
  });
  useLaden.setState({
    akteId: "akte-1",
    tagebuch: undefined,
    tagebuchfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

async function zeigeTagebuch(einheitId?: string, abschnittId?: string): Promise<void> {
  render(<Tagebuch einheitId={einheitId} abschnittId={abschnittId} />);
  await waitFor(() => {
    expect(screen.getByText(/Status gesetzt/)).toBeDefined();
  });
}

describe("Die Tagebuch-Ansicht", () => {
  it("zeigt Zeit, Satz, Akteur und Rechner", async () => {
    await zeigeTagebuch();
    // Die Uhrzeit steht in der Zone des Fensters; der Läufer kann in einer
    // anderen stehen als die Führungsstelle. Geprüft wird deshalb die Form
    // und die Minute, nicht die Stunde — die Wanduhr ist ohnehin nur Anzeige
    // und nie Ordnung (§2.6).
    expect(screen.getByText(/^10\.09\. \d{2}:30:07$/)).toBeDefined();
    expect(screen.getByText("Bediener 1")).toBeDefined();
    expect(screen.getByText("fuest-laptop")).toBeDefined();
  });

  it("zeigt standardmäßig alle Einträge und beschränkt sich erst auf Wunsch auf die gewählte Einheit", async () => {
    await zeigeTagebuch("U1");
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")).toBeDefined();
    });
    expect(attrappe.letzterRuf("tagebuchAnfordern")?.einheitId).toBeUndefined();
    expect(screen.queryByText("Alle anzeigen")).toBeNull();

    fireEvent.click(screen.getByLabelText("Auf die Auswahl beschränken"));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.einheitId).toBe("U1");
    });
  });

  it("nennt den wirksamen Filter mit Zählung und bietet „Alle anzeigen“ an", async () => {
    await zeigeTagebuch("U1");
    const elf = Array.from({ length: 11 }, (_, nummer) => zeile({ ereignisId: `a-${String(nummer).padStart(10, "0")}` }));
    attrappe.antwortet("tagebuchAnfordern", { lageZeiger: 9, zeilen: elf, gesamtzahl: 11, von: 0 });
    fireEvent.change(screen.getByLabelText("Suche"), { target: { value: "x" } });
    fireEvent.change(screen.getByLabelText("Suche"), { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByText("11 Einträge")).toBeDefined();
    });
    attrappe.antwortet("tagebuchAnfordern", { lageZeiger: 9, zeilen: [zeile(), zeile()], gesamtzahl: 2, von: 0 });
    fireEvent.click(screen.getByLabelText("Auf die Auswahl beschränken"));
    await waitFor(() => {
      expect(screen.getByText(/2 von 11 Einträgen \(Filter: Auswahl\)/)).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Alle anzeigen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.einheitId).toBeUndefined();
    });
    expect((screen.getByLabelText("Auf die Auswahl beschränken") as HTMLInputElement).checked).toBe(false);
  });

  it("trägt eine freie Meldung mit Quelle und Zeit als Tagebucheintrag ein", async () => {
    await zeigeTagebuch();
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisse: 1 } as never);
    fireEvent.click(screen.getByRole("button", { name: "Eintrag hinzufügen" }));
    const speichern = screen.getByRole("button", { name: "Eintrag speichern" }) as HTMLButtonElement;
    expect(speichern.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Was wurde gemeldet?"), { target: { value: "Deich bei km 4 sickert" } });
    fireEvent.change(screen.getByLabelText("Quelle"), { target: { value: "Telefon" } });
    fireEvent.change(screen.getByLabelText("Zeit der Meldung"), { target: { value: "0630" } });
    fireEvent.click(speichern);
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("EtbEintragErfasst");
    });
    const nutzlast = attrappe.letzterRuf("bedienen")?.entwurf.nutzlast as Record<string, string>;
    expect(nutzlast["text"]).toBe("Telefon: Deich bei km 4 sickert");
    expect(new Date(nutzlast["zeitpunkt"] ?? "").getMinutes()).toBe(30);
    expect(nutzlast["etbId"]).toMatch(/^ETB-/);
  });

  it("nimmt den Abschnitt, wenn keine Einheit gewählt ist", async () => {
    await zeigeTagebuch(undefined, "EO");
    fireEvent.click(screen.getByLabelText("Auf die Auswahl beschränken"));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.abschnittId).toBe("EO");
    });
  });

  it("zeigt auf Wunsch nur Rücknahmen und Berichtigungen", async () => {
    await zeigeTagebuch();
    fireEvent.click(screen.getByLabelText("Nur Rücknahmen und Berichtigungen"));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.nurRuecknahmen).toBe(true);
    });
  });

  it("macht eine Kompensation als Rücknahme kenntlich (§6 U1, U4)", async () => {
    attrappe.antwortet("tagebuchAnfordern", {
      lageZeiger: 9,
      zeilen: [zeile({ undoOf: "a-0000000007", grund: "Falsch gemeldet" })],
      gesamtzahl: 1,
      von: 0,
    });
    await zeigeTagebuch();
    // Beide Zeilen bleiben stehen (U4); ohne Kennzeichnung erkennt niemand,
    // welche die andere zurücknimmt.
    expect(screen.getByText("Rücknahme")).toBeDefined();
    expect(screen.getByText(/Grund: Falsch gemeldet/)).toBeDefined();
  });

  it("nennt den Ausschnitt, wenn nicht alles gezeigt wird", async () => {
    attrappe.antwortet("tagebuchAnfordern", {
      lageZeiger: 9,
      zeilen: [zeile()],
      gesamtzahl: 4_213,
      von: 0,
    });
    await zeigeTagebuch();
    expect(screen.getByText("1 von 4213 Einträgen")).toBeDefined();
  });
});

describe("uhrzeit", () => {
  it("zeigt Datum und Uhrzeit ohne Jahr", () => {
    // Ein Einsatz dauert Stunden bis Tage; das Jahr in jeder der 50.000
    // Zeilen wäre Rauschen.
    expect(uhrzeit("2026-09-10T14:30:07+02:00")).toMatch(/^10\.09\. \d{2}:30:07$/);
  });

  it("rät bei einem unlesbaren Zeitpunkt nicht", () => {
    expect(uhrzeit("kein Zeitpunkt")).toBe("unbekannt");
  });
});
