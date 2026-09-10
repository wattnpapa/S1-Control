/**
 * Komponententests zum Eingangskorb (M6.1, M6.2).
 *
 * Die fachliche Wirkung steht in `szenarien-eeb.test.ts`; hier steht die
 * Verdrahtung — und die eine Stelle, an der die Oberfläche eine Regel des
 * Konzepts durchsetzt: §2.4 macht den Grund einer Ablehnung zur Pflicht, und
 * ohne ihn darf gar nichts geschickt werden.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Meldungszeile } from "@s1/domaene";

import { Eingangskorb } from "./Eingangskorb.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zeile(id: string, teil: Partial<Meldungszeile> = {}): Meldungszeile {
  return {
    id,
    zustand: "NEU",
    einheitSchluessel: "org:THW||c12|Oldenburg",
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
    ...teil,
  };
}

let attrappe: Attrappe;

function antworte(zeilen: readonly Meldungszeile[], offen = 1): void {
  attrappe.antwortet("eingangskorbAnfordern", {
    lageZeiger: 12,
    zeilen,
    von: 0,
    gesamtzahl: zeilen.length,
    jeZustand: { NEU: offen, GEAENDERT: 0, UEBERNOMMEN: 0, ABGELEHNT: 0 },
    offen,
  });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  antworte([zeile("m1")]);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    eingangskorb: undefined,
    eingangsfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

async function zeige(): Promise<void> {
  render(<Eingangskorb />);
  await waitFor(() => {
    expect(screen.getByText("Oldenburg")).toBeDefined();
  });
}

describe("Der Eingangskorb", () => {
  it("holt den Korb eigens und nennt die Zahl der offenen Meldungen", async () => {
    await zeige();
    expect(attrappe.letzterRuf("eingangskorbAnfordern")?.akteId).toBe("akte-1");
    expect(screen.getByText(/1 offen/)).toBeDefined();
  });

  it("zeigt den abgeleiteten Zustand als Ampel", async () => {
    await zeige();
    expect(screen.getByText("NEU")).toBeDefined();
  });

  it("verlangt beim Ablehnen einen Grund und schickt ihn mit (§2.4)", async () => {
    const frage = vi.spyOn(globalThis, "prompt").mockReturnValue("Doppelt gemeldet");
    await zeige();
    fireEvent.click(screen.getByText("Ablehnen"));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("EebMeldungAbgelehnt");
    expect(entwurf?.grund).toBe("Doppelt gemeldet");
    expect(entwurf?.neu).toBe(true);
    frage.mockRestore();
  });

  it("schickt nichts, wenn der Grund leer bleibt", async () => {
    const frage = vi.spyOn(globalThis, "prompt").mockReturnValue("");
    await zeige();
    fireEvent.click(screen.getByText("Ablehnen"));
    // Der Aktendienst wiese es ab (§2.4); eine Abweisung wäre für den
    // Bediener nicht erklärbar.
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    frage.mockRestore();
  });

  it("nimmt die Ablehnung ohne Grund zurück", async () => {
    antworte([zeile("m1", { zustand: "ABGELEHNT" })], 0);
    await zeige();
    fireEvent.click(screen.getByText("Ablehnung zurück"));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    // §5.8.1: dieselbe Art mit `neu = false`, und dann ohne Pflicht-Grund.
    expect(entwurf?.typ).toBe("EebMeldungAbgelehnt");
    expect(entwurf?.neu).toBe(false);
    expect(entwurf?.grund).toBeUndefined();
  });

  it("bietet die Rücknahme der Übernahme nur bei einer übernommenen Meldung an", async () => {
    await zeige();
    expect(screen.queryByText("Übernahme zurück")).toBeNull();

    cleanup();
    antworte([zeile("m1", { zustand: "UEBERNOMMEN", einheitId: "E-abc" })], 0);
    await zeige();
    expect(screen.getByText("Übernahme zurück")).toBeDefined();
  });

  it("setzt den Meldestatus über die Auswahl", async () => {
    await zeige();
    fireEvent.change(screen.getByLabelText("Meldestatus Oldenburg"), {
      target: { value: "ABGERUECKT" },
    });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("EebMeldeStatusGesetzt");
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.neu).toBe("ABGERUECKT");
  });

  it("schaltet auf die jüngste Fassung je Reihe um (K26)", async () => {
    await zeige();
    fireEvent.click(screen.getByLabelText("Nur jüngste Fassung"));
    await waitFor(() => {
      expect(attrappe.letzterRuf("eingangskorbAnfordern")?.nurKoepfe).toBe(true);
    });
  });

  it("öffnet die Fassungen einer Reihe erst auf Verlangen", async () => {
    antworte([zeile("m1", { fassung: 2, fassungen: 3 })]);
    await zeige();
    // Vorher wird die Reihe nicht geholt: Der Dialog geht auf, wird gelesen
    // und wieder geschlossen — im Store zu stehen hieße, ihn bei jedem
    // Zeigerstand mitzuerneuern (M3.7).
    expect(attrappe.rufeDerArt("eingangskorbAnfordern")).toHaveLength(1);

    fireEvent.click(screen.getByText("2 von 3"));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("eingangskorbAnfordern")).toHaveLength(2);
    });
    expect(attrappe.letzterRuf("eingangskorbAnfordern")?.einheitSchluessel).toBe(
      "org:THW||c12|Oldenburg",
    );
  });

  it("zeigt eine unsignierte Meldung ohne Aufregung", async () => {
    antworte([zeile("m1", { signatur: "" })]);
    await zeige();
    // §5.8.1: Die Signatur entscheidet nichts. Ein Strich ist die richtige
    // Anzeige, kein Warnzeichen.
    expect(screen.getByText("—")).toBeDefined();
  });
});
