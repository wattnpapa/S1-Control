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

  it("beschränkt sich auf die gewählte Einheit, solange der Schalter steht", async () => {
    await zeigeTagebuch("U1");
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.einheitId).toBe("U1");
    });

    fireEvent.click(screen.getByLabelText("Auf die Auswahl beschränken"));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.einheitId).toBeUndefined();
    });
  });

  it("nimmt den Abschnitt, wenn keine Einheit gewählt ist", async () => {
    await zeigeTagebuch(undefined, "EO");
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
