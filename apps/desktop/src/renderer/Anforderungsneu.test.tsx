/**
 * „Anfordern“ im Blatt (Review-Runde 3): Klartext statt wirkungslosem Knopf,
 * Rückfrage bei doppelter Kennung, Verwerfen nach „Unklar“.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Anforderungszeile } from "@s1/domaene";

import { Anforderungsneu, TEXT_KENNUNG_VORHANDEN, vergesseUngeklaerte } from "./Anforderungsneu.js";
import { TEXT_UNKLAR } from "./Anlegeversuch.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { MELDUNG_UNKLAR } from "./verbindung.js";

afterEach(cleanup);

const BEDIENE = useLaden.getState().bediene;
let attrappe: Attrappe;

function vorhandene(kennung: string): Anforderungszeile {
  return {
    id: "A0",
    kennung,
    zustand: "OFFEN",
    angefordertAm: "2026-09-10T09:00:00+02:00",
    vorgeseheneEinheitText: "BGr",
    vorgesehenerAuftrag: "",
    bemerkung: "",
    storniert: false,
    hinweise: [],
  } as unknown as Anforderungszeile;
}

function ansicht(zeilen: readonly Anforderungszeile[]) {
  return { lageZeiger: 1, zeilen, von: 0, gesamtzahl: zeilen.length, jeZustand: {}, einheitenwahl: [] } as never;
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  vergesseUngeklaerte();
  useLaden.setState({ bediene: BEDIENE, akteId: "akte-1", anforderungen: ansicht([]), fehler: undefined, hinweise: [], lagebild: undefined });
});

function tippe(bezeichnung: string, wert: string): void {
  fireEvent.change(screen.getByLabelText(bezeichnung), { target: { value: wert } });
}

describe("Anfordern mit nur einer Kennung", () => {
  it("sagt sichtbar am Knopf, was fehlt, und schreibt nichts", () => {
    render(<Anforderungsneu einheitenwahl={[]} />);
    expect(screen.getByTestId("anfordern-fehlt").textContent).toMatch(/Kennung allein reicht nicht/);
    tippe("Kennung", "ANF-7");
    fireEvent.click(screen.getByRole("button", { name: "Anfordern" }));
    expect(screen.getByRole("alert").textContent).toMatch(/Kennung allein genügt nicht/);
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("verschwindet, sobald ein Auftrag dasteht", () => {
    render(<Anforderungsneu einheitenwahl={[]} />);
    tippe("Vorgesehener Auftrag", "Deich sichern");
    expect(screen.queryByTestId("anfordern-fehlt")).toBeNull();
  });
});

describe("Doppelte Kennung", () => {
  it("fragt nach und legt erst mit dem zweiten Druck an", async () => {
    useLaden.setState({ anforderungen: ansicht([vorhandene("ANF-1")]) });
    render(<Anforderungsneu einheitenwahl={[]} />);
    tippe("Kennung", " anf-1 ");
    tippe("Vorgesehener Auftrag", "Deich");
    fireEvent.click(screen.getByRole("button", { name: "Anfordern" }));
    expect(screen.getByText(TEXT_KENNUNG_VORHANDEN)).toBeDefined();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Trotzdem anlegen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
  });
});

describe("Verwerfen nach „Unklar“", () => {
  async function unklarGesendet(): Promise<void> {
    useLaden.setState({
      bediene: async () => {
        useLaden.setState({ fehler: MELDUNG_UNKLAR });
        return undefined;
      },
    });
    tippe("Kennung", "ANF-9");
    tippe("Vorgesehener Auftrag", "Deich");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Anfordern" }));
      await Promise.resolve();
    });
    await screen.findByText(TEXT_UNKLAR);
  }

  it("fragt nach, behält die Warnung als Hinweis und fragt bei gleicher Kennung erneut nach", async () => {
    const urspruenglich = useLaden.getState().bediene;
    render(<Anforderungsneu einheitenwahl={[]} />);
    await unklarGesendet();
    fireEvent.click(screen.getByRole("button", { name: "Eingabe verwerfen" }));
    expect(screen.getByText(/Trotzdem verwerfen\?/)).toBeDefined();
    expect((screen.getByLabelText("Kennung") as HTMLInputElement).value).toBe("ANF-9");
    fireEvent.click(screen.getByRole("button", { name: "Trotzdem verwerfen" }));
    expect((screen.getByLabelText("Kennung") as HTMLInputElement).value).toBe("");
    expect(useLaden.getState().hinweise.some((h) => h.text.includes("„ANF-9“") && h.text.includes("Unklar"))).toBe(true);

    // Dieselbe Kennung noch einmal: keine stille Doppelanlage.
    useLaden.setState({ bediene: urspruenglich, fehler: undefined });
    tippe("Kennung", "ANF-9");
    tippe("Vorgesehener Auftrag", "Deich");
    fireEvent.click(screen.getByRole("button", { name: "Anfordern" }));
    expect(screen.getByText(TEXT_KENNUNG_VORHANDEN)).toBeDefined();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("meldet nach dem Neuladen, dass die Anforderung nicht gefunden wurde", async () => {
    render(<Anforderungsneu einheitenwahl={[]} />);
    await unklarGesendet();
    fireEvent.click(screen.getByRole("button", { name: "Eingabe verwerfen" }));
    fireEvent.click(screen.getByRole("button", { name: "Trotzdem verwerfen" }));
    act(() => {
      useLaden.setState({ anforderungen: ansicht([vorhandene("ANF-ANDERE")]) });
    });
    expect(useLaden.getState().hinweise.some((h) => h.text.includes("nicht gefunden"))).toBe(true);
  });
});
