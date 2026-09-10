/**
 * Komponententests zum Blatt der Führungsstelle (M5.4).
 *
 * Die fachliche Wirkung steht in `szenarien-fuest.test.ts`; hier steht die
 * Verdrahtung — vor allem die eine Stelle, an der ein Fenster mehr weiß als
 * der Zustand: Der Schichtplan zeigt nur Tage, die schon beschrieben sind
 * (§5.7), und für den ersten Eintrag eines Tages braucht es trotzdem eine
 * Zelle.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Fuestansicht } from "../kontrakt/index.js";

import { Fuehrungsstelle } from "./Fuehrungsstelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const ANSICHT: Fuestansicht = {
  lageZeiger: 11,
  bloecke: [
    {
      teileinheit: "Stab",
      zeilen: [
        {
          id: "D1",
          teileinheit: "Stab",
          funktion: "Ltr FüSt",
          schicht: "TAG",
          reihenfolge: 1,
          rolle: "fuehrer",
          besetzung: "Mennenga, Fokke",
          besetzt: true,
          entfernt: false,
        },
        {
          id: "D2",
          teileinheit: "Stab",
          funktion: "SGL 1",
          schicht: "NACHT",
          reihenfolge: 2,
          rolle: "unterfuehrer",
          besetzung: "",
          besetzt: false,
          entfernt: false,
        },
      ],
      summeJeSchicht: { TAG: { fuehrer: 1, unterfuehrer: 0, mannschaft: 0 } },
    },
  ],
  plan: {
    tage: ["2026-09-10"],
    zeilen: [
      {
        dienstpostenId: "D1",
        teileinheit: "Stab",
        funktion: "Ltr FüSt",
        schicht: "TAG",
        tage: { "2026-09-10": "Mennenga, Fokke" },
      },
      { dienstpostenId: "D2", teileinheit: "Stab", funktion: "SGL 1", schicht: "NACHT", tage: {} },
    ],
  },
  staerke: [
    { teileinheit: "Stab", schicht: "TAG", staerke: { fuehrer: 1, unterfuehrer: 0, mannschaft: 0 } },
  ],
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("fuestAnfordern", ANSICHT);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", fuest: undefined, fehler: undefined, hinweise: [] });
});

async function zeige(): Promise<void> {
  render(<Fuehrungsstelle />);
  await waitFor(() => {
    expect(screen.getByText("Ltr FüSt")).toBeDefined();
  });
}

describe("Das Blatt der Führungsstelle", () => {
  it("holt Dienstposten, Plan und Stärke in einem Ruf", async () => {
    await zeige();
    // Drei Sichten auf dieselbe Menge; drei Rufe holten die Posten dreimal.
    expect(attrappe.rufeDerArt("fuestAnfordern")).toHaveLength(1);
  });

  it("zeigt die Rolle, die aus der Funktion folgt", async () => {
    await zeige();
    const zeile = screen.getByText("Ltr FüSt").closest("tr") as HTMLElement;
    expect(zeile.textContent).toContain("Fü");
  });

  it("schickt die Besetzung mit dem gesehenen Vorher-Wert", async () => {
    await zeige();
    const feld = screen.getByLabelText("Besetzung SGL 1 NACHT");
    fireEvent.change(feld, { target: { value: "van Rijsinge, Nils" } });
    fireEvent.keyDown(feld, { key: "Enter" });

    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("DienstpostenBesetzt");
    // §3.2: Ein unbesetzter Posten ist `null` und nicht "" — sonst hinge am
    // Vorher-Wert eine Unterscheidung, die es im Zustand nicht gibt.
    expect(entwurf?.vorher).toBeNull();
    expect(entwurf?.neu).toBe("van Rijsinge, Nils");
  });

  it("räumt den Posten, wenn das Feld geleert wird", async () => {
    await zeige();
    const feld = screen.getByLabelText("Besetzung Ltr FüSt TAG");
    fireEvent.change(feld, { target: { value: "" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.neu).toBeNull();
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.vorher).toBe("Mennenga, Fokke");
  });

  it("verlangt beim Entfernen einen Grund (§2.4)", async () => {
    const frage = vi.spyOn(globalThis, "prompt").mockReturnValue("Sachgebiet nicht besetzt");
    await zeige();
    fireEvent.click(screen.getAllByText("Entfernen")[0] as HTMLElement);
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("DienstpostenEntfernt");
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.grund).toBe("Sachgebiet nicht besetzt");
    frage.mockRestore();
  });

  it("legt einen Posten ans Ende seines Teilbereichs", async () => {
    await zeige();
    fireEvent.change(screen.getByLabelText("Funktion"), { target: { value: "FüGeh SG 2" } });
    fireEvent.click(screen.getByText("Dienstposten anlegen"));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("DienstpostenAngelegt");
    });
    const nutzlast = attrappe.letzterRuf("bedienen")?.entwurf.nutzlast as {
      reihenfolge?: number;
      teileinheit?: string;
    };
    // Zwei Posten im Stab, der neue bekommt die drei — wer ergänzt, ergänzt
    // unten und nicht mitten hinein.
    expect(nutzlast.reihenfolge).toBe(3);
    expect(nutzlast.teileinheit).toBe("Stab");
  });

  it("öffnet eine Spalte für einen Tag, der noch nicht beschrieben ist", async () => {
    await zeige();
    expect(screen.queryByLabelText("Plan D1 2026-09-12")).toBeNull();

    fireEvent.change(screen.getByLabelText("Tag anzeigen"), { target: { value: "2026-09-12" } });
    fireEvent.click(screen.getByText("Spalte öffnen"));

    // Die Spalten kommen aus den Daten (§5.7); für den ersten Eintrag eines
    // Tages braucht es trotzdem eine Zelle. Sie ist reine Fenstersache und
    // steht nicht im Store.
    await waitFor(() => {
      expect(screen.getByLabelText("Plan D1 2026-09-12")).toBeDefined();
    });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("schreibt eine Planzelle mit dem Paar aus Posten und Datum", async () => {
    await zeige();
    const zelle = screen.getByLabelText("Plan D2 2026-09-10");
    fireEvent.change(zelle, { target: { value: "Meyer, Anton / SGL 1" } });
    fireEvent.blur(zelle);

    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("SchichtplanEintragGesetzt");
    expect(entwurf?.nutzlast).toEqual({ dienstpostenId: "D2", datum: "2026-09-10" });
    expect(entwurf?.vorher).toBeNull();
  });

  it("schickt nichts, wenn eine Planzelle unverändert verlassen wird", async () => {
    await zeige();
    const zelle = screen.getByLabelText("Plan D1 2026-09-10");
    fireEvent.blur(zelle);
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("zeigt die Stärke aus K17 je Teileinheit und Schicht", async () => {
    await zeige();
    expect(screen.getByText(/Stab · TAG: 1\/0\/0/)).toBeDefined();
  });
});
