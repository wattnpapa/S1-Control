/**
 * Banner und Abgleich bei Unterbrechung und Wiederverbindung (P0-2, P0-3, P1-1, P1-2).
 */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { setzeBruecke, type Bruecke } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { MELDUNG_KEINE_VERBINDUNG, MELDUNG_NICHT_GESPEICHERT, MELDUNG_UNKLAR, useVerbindung } from "./verbindung.js";
import { Verbindungsbanner } from "./Verbindungsbanner.js";
import type { Ruf } from "../kontrakt/index.js";

const rufe: Ruf[] = [];

beforeEach(() => {
  rufe.length = 0;
  const bruecke: Bruecke = {
    plattform: "web",
    electron: "keine",
    async ruf(anfrage) {
      rufe.push(anfrage);
      return { ok: true, wert: null };
    },
    aufMitteilung: () => () => undefined,
  };
  setzeBruecke(bruecke);
  useVerbindung.getState().zuruecksetzen();
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Verbindungsbanner", () => {
  it("bleibt unsichtbar, solange alles in Ordnung ist oder nichts überwacht wird", () => {
    render(<Verbindungsbanner />);
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => useVerbindung.getState().meldeKontakt(Date.now()));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("sagt bei Ausfall die Folge in Klartext: veraltet, nicht gespeichert, gesperrt", () => {
    render(<Verbindungsbanner />);
    act(() => {
      useVerbindung.getState().meldeKontakt(Date.now() - 3000);
      useVerbindung.getState().meldeAusfall(Date.now());
    });
    const banner = screen.getByRole("alert");
    expect(banner.textContent).toMatch(/Keine Verbindung zum Dienst seit \d+ s/);
    expect(banner.textContent).toContain("Eingaben werden nicht gespeichert");
    expect(banner.textContent).toContain("neu verbunden");
  });

  it("lädt nach der Wiederverbindung Stand und Ansichten neu und nimmt die Fehlermeldungen zurück", async () => {
    render(<Verbindungsbanner />);
    useLaden.setState({
      fehler: MELDUNG_NICHT_GESPEICHERT,
      hinweise: [
        { nummer: 1, stufe: "warnung", text: MELDUNG_KEINE_VERBINDUNG },
        { nummer: 2, stufe: "warnung", text: "Ein anderer Hinweis." },
      ],
    });
    act(() => {
      useVerbindung.getState().meldeKontakt(Date.now() - 3000);
      useVerbindung.getState().meldeAusfall(Date.now());
    });
    expect(rufe).toHaveLength(0);

    await act(async () => {
      useVerbindung.getState().meldeKontakt(Date.now());
      await Promise.resolve();
    });

    expect(rufe).toContainEqual({ art: "standAnfordern", akteId: "akte-1" });
    expect(useLaden.getState().fehler).toBeUndefined();
    expect(useLaden.getState().hinweise.map((h) => h.text)).toEqual(["Ein anderer Hinweis."]);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Wieder verbunden");
  });

  it("lädt nach einem Schreibruf mit unbekanntem Ausgang neu, sobald der Dienst wieder antwortet", async () => {
    render(<Verbindungsbanner />);
    act(() => useVerbindung.getState().meldeKontakt(Date.now()));
    await act(async () => {
      useVerbindung.getState().meldeUnklar();
      await Promise.resolve();
    });
    expect(rufe).toContainEqual({ art: "standAnfordern", akteId: "akte-1" });
  });

  it("wartet bei Unklar während der Unterbrechung auf die Wiederverbindung", async () => {
    render(<Verbindungsbanner />);
    act(() => {
      useVerbindung.getState().meldeKontakt(Date.now() - 1000);
      useVerbindung.getState().meldeAusfall(Date.now());
      useVerbindung.getState().meldeUnklar();
    });
    expect(rufe).toHaveLength(0);
  });
});

describe("Verbindungsmeldungen im Store", () => {
  it("führt dieselbe Verbindungsmeldung nur einmal in den Hinweisen", () => {
    useLaden.getState().melde("warnung", MELDUNG_UNKLAR);
    useLaden.getState().melde("warnung", MELDUNG_UNKLAR);
    useLaden.getState().melde("warnung", "Etwas anderes.");
    useLaden.getState().melde("warnung", "Etwas anderes.");
    expect(useLaden.getState().hinweise.map((h) => h.text)).toEqual([MELDUNG_UNKLAR, "Etwas anderes.", "Etwas anderes."]);
  });

  it("lässt fremde Fehlerbilder bei der Wiederverbindung stehen", () => {
    useLaden.setState({ fehler: "Der Share ist voll." });
    useLaden.getState().entferneVerbindungsmeldungen();
    expect(useLaden.getState().fehler).toBe("Der Share ist voll.");
  });
});
