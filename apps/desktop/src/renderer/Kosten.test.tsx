/**
 * Komponententests zur Kostenübersicht (M5.2).
 *
 * Die **Rechnung** prüfen die Tests in Ring 2 und die Goldfiles; hier steht
 * die Verdrahtung: dass die Ansicht eigens geholt wird (M3.7), dass eine
 * geänderte Zahl genau ein `KostenParameterGeaendert` mit dem `vorher`-Wert
 * dieses Fensters schickt (§2.2a) und dass Escape den Entwurf verwirft.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Kostenblatt } from "@s1/domaene";

import { Kosten } from "./Kosten.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const BLATT: Kostenblatt = {
  parameter: {
    psaKostenProSatz: 180,
    vdaProTag: 150,
    ukVerpflegungProTag: 20,
    geplanteEinsatztage: 5,
  },
  zeilen: [
    {
      einheitId: "E1",
      abschnittId: "EO1",
      abschnittName: "Deich Nord",
      bezeichnung: "1. Bergungsgruppe",
      organisation: "THW",
      koepfe: 9,
      psaSaetzeProTag: 1,
      psaProTag: 1620,
      vdaUkProTag: 1530,
      personentage: 45,
      gesamt: 15750,
    },
  ],
  summe: { koepfe: 9, psaProTag: 1620, vdaUkProTag: 1530, personentage: 45, gesamt: 15750 },
  ausgenommen: 2,
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("kostenAnfordern", { lageZeiger: 7, blatt: BLATT });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    kosten: undefined,
    lagebild: { einsatzId: "2026-09-08_uebung_ab12cd" } as never,
    fehler: undefined,
    hinweise: [],
  });
});

async function zeigeKosten(): Promise<void> {
  render(<Kosten />);
  await waitFor(() => {
    expect(screen.getByText("1. Bergungsgruppe")).toBeDefined();
  });
}

describe("Die Kostenübersicht", () => {
  it("holt das Blatt eigens, sobald eine Akte offen ist", async () => {
    await zeigeKosten();
    expect(attrappe.letzterRuf("kostenAnfordern")?.akteId).toBe("akte-1");
  });

  it("zeigt Beträge mit zwei Nachkommastellen und rechtsbündig", async () => {
    await zeigeKosten();
    // 15.750,00 € — Punkt als Tausendertrennung, Komma als Dezimaltrenner,
    // und zwar ohne `Intl`: Zwei Rechner mit verschiedenen Gebietsdaten
    // zeigten sonst verschiedene Zahlen.
    expect(screen.getAllByText("15.750,00 €").length).toBeGreaterThan(0);
  });

  it("schickt bei einer geänderten Zahl genau ein Ereignis mit dem gesehenen Vorher-Wert", async () => {
    await zeigeKosten();
    const feld = screen.getByLabelText("Kosten pro Satz PSA (€)");
    fireEvent.change(feld, { target: { value: "200" } });
    fireEvent.keyDown(feld, { key: "Enter" });

    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("KostenParameterGeaendert");
    expect(entwurf?.nutzlast).toEqual({
      einsatzId: "2026-09-08_uebung_ab12cd",
      feld: "psaKostenProSatz",
    });
    expect(entwurf?.vorher).toBe(180);
    expect(entwurf?.neu).toBe(200);
  });

  it("versteht das Komma als Dezimaltrennzeichen", async () => {
    await zeigeKosten();
    const feld = screen.getByLabelText("VDA pro Tag und Kraft (€)");
    fireEvent.change(feld, { target: { value: "155,50" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.neu).toBe(155.5);
    });
  });

  it("schickt nichts, wenn die Zahl unverändert bestätigt wird", async () => {
    await zeigeKosten();
    const feld = screen.getByLabelText("Geplante Einsatztage");
    fireEvent.change(feld, { target: { value: "5" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    // Ein Ereignis ohne Änderung wäre eine Zeile im Tagebuch, die nichts sagt.
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("verwirft den Entwurf bei Escape und stellt den Wert wieder her", async () => {
    await zeigeKosten();
    const feld = screen.getByLabelText("Geplante Einsatztage") as HTMLInputElement;
    fireEvent.change(feld, { target: { value: "9" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    await waitFor(() => {
      expect(feld.value).toBe("5");
    });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("nennt, wie viele Einheiten aus der Rechnung fallen", async () => {
    await zeigeKosten();
    expect(screen.getByText(/2 Einheit\(en\) fallen aus der Rechnung/)).toBeDefined();
  });
});
