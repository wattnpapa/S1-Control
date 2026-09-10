/**
 * Komponententests zur Anforderungsansicht (M5.3).
 *
 * Die fachliche Wirkung steht in `szenarien-anforderungen.test.ts`; hier
 * steht die Verdrahtung. Der wichtigste Satz: **Angeboten wird nur, was den
 * Zustand ändert.** Eine Zusage auf eine bereits geltende Erledigung wäre
 * nach §5.6.2 wirkungslos, und ein Knopf dafür wäre ein Versprechen, das der
 * Fold nicht hält.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Anforderungszeile } from "@s1/domaene";

import { Anforderungen } from "./Anforderungen.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zeile(id: string, teil: Partial<Anforderungszeile> = {}): Anforderungszeile {
  return {
    id,
    kennung: `ANF-${id}`,
    zustand: "OFFEN",
    angefordertAm: "2026-09-10T09:00:00+02:00",
    vorgeseheneEinheitText: "BGr THW OV Varel",
    vorgesehenerAuftrag: "Ablösung Deichverteidigung",
    bemerkung: "",
    storniert: false,
    hinweise: [],
    ...teil,
  };
}

let attrappe: Attrappe;

function antworte(zeilen: readonly Anforderungszeile[]): void {
  attrappe.antwortet("anforderungenAnfordern", {
    lageZeiger: 9,
    zeilen,
    von: 0,
    gesamtzahl: zeilen.length,
    jeZustand: { OFFEN: 1, ZUGESAGT: 1, EINGETROFFEN: 1, STORNIERT: 0 },
  });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  antworte([zeile("A1")]);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    anforderungen: undefined,
    anforderungsfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

async function zeige(): Promise<void> {
  render(<Anforderungen />);
  await waitFor(() => {
    expect(screen.getByText("ANF-A1")).toBeDefined();
  });
}

describe("Die Anforderungsansicht", () => {
  it("holt die Liste eigens, sobald eine Akte offen ist", async () => {
    await zeige();
    expect(attrappe.letzterRuf("anforderungenAnfordern")?.akteId).toBe("akte-1");
  });

  it("zeigt den abgeleiteten Zustand als eigene Spalte", async () => {
    await zeige();
    expect(screen.getByText("OFFEN")).toBeDefined();
  });

  it("legt eine Anforderung als Form (b) an — ohne vorher und ohne neu", async () => {
    await zeige();
    fireEvent.change(screen.getByLabelText("Vorgesehene Einheit"), {
      target: { value: "FGr N THW OV Jever" },
    });
    fireEvent.click(screen.getByText("Anfordern"));

    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("AnforderungAngelegt");
    // §2.2: Bei Form (b) **ist** die Nutzlast die Anlage; ein Vorher-Wert
    // existiert nicht, und §2.2a prüft an ihr nichts.
    expect(entwurf?.vorher).toBeUndefined();
    expect(entwurf?.neu).toBeUndefined();
    const nutzlast = entwurf?.nutzlast as { vorgeseheneEinheitText?: string; angefordertAm?: string };
    expect(nutzlast.vorgeseheneEinheitText).toBe("FGr N THW OV Jever");
    expect(nutzlast.angefordertAm).toBeDefined();
  });

  it("bietet bei OFFEN nur Zusagen und Stornieren an", async () => {
    await zeige();
    expect(screen.getByText("Zusagen")).toBeDefined();
    expect(screen.getByText("Stornieren")).toBeDefined();
    expect(screen.queryByText("Eingetroffen")).toBeNull();
    expect(screen.queryByText("Zusage zurück")).toBeNull();
  });

  it("bietet bei EINGETROFFEN keine Zusage mehr an — sie wäre wirkungslos", async () => {
    antworte([zeile("A1", { zustand: "EINGETROFFEN", erledigtAm: "2026-09-10T15:40:00+02:00" })]);
    await zeige();
    // §5.6.2 Nr. 2: Eine Zusage, die auf eine geltende Erledigung trifft,
    // ändert den Zustand nicht. Ein Knopf dafür wäre irreführend.
    expect(screen.queryByText("Zusagen")).toBeNull();
    expect(screen.getByText("Eintreffen zurück")).toBeDefined();
  });

  it("schickt die Zusage mit dem Schlüssel, den der Fold plausibilisiert", async () => {
    await zeige();
    fireEvent.click(screen.getByText("Zusagen"));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("AbloesungZugesagt");
    expect((entwurf?.neu as { zugesagtFuer?: string }).zugesagtFuer).toBeDefined();
  });

  it("verlangt beim Storno einen Grund und schickt ihn mit (§2.4)", async () => {
    const frage = vi.spyOn(globalThis, "prompt").mockReturnValue("Kräfte anderweitig gebunden");
    await zeige();
    fireEvent.click(screen.getByText("Stornieren"));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.grund).toBe("Kräfte anderweitig gebunden");
    frage.mockRestore();
  });

  it("schickt nichts, wenn der Grund des Stornos leer bleibt", async () => {
    const frage = vi.spyOn(globalThis, "prompt").mockReturnValue("");
    await zeige();
    fireEvent.click(screen.getByText("Stornieren"));
    // Ohne Grund weist der Aktendienst das Ereignis ab (§2.4); die Abweisung
    // wäre für den Bediener nicht erklärbar.
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    frage.mockRestore();
  });

  it("filtert über die Zustände und deutet keine Auswahl als „alle“", async () => {
    await zeige();
    fireEvent.click(screen.getByLabelText(/Offen/));
    await waitFor(() => {
      expect(attrappe.letzterRuf("anforderungenAnfordern")?.zustaende).toEqual(["OFFEN"]);
    });
    fireEvent.click(screen.getByLabelText(/Offen/));
    await waitFor(() => {
      expect(attrappe.letzterRuf("anforderungenAnfordern")?.zustaende).toBeUndefined();
    });
  });
});
