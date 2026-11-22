/**
 * Das Blatt „Übersicht“ (Stab-Review 2026-11-22): Kräfte nach Status je
 * Abschnitt und alle Aufträge. Gerechnet wird in der Projektion
 * (`stabsuebersicht.test.ts`); hier geht es um Ruf und Darstellung.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Stabsuebersicht as Uebersicht } from "@s1/domaene";

import { Stabsuebersicht } from "./Stabsuebersicht.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const NULL = { IM_EINSATZ: 0, EINSATZBEREIT: 0, RUHE: 0, NICHT_EINSATZBEREIT: 0, OHNE: 0 };

const UEBERSICHT: Uebersicht = {
  kraefte: [
    { abschnittId: "EA2", name: "EA 2 Innenstadt", tiefe: 1, je: { ...NULL, IM_EINSATZ: 19, RUHE: 9 }, gesamt: 28, erwartet: 6 },
    { abschnittId: "UA21", name: "UA 2.1 Pumpstelle", tiefe: 2, je: { ...NULL, IM_EINSATZ: 19 }, gesamt: 19, erwartet: 6 },
  ],
  anmarsch: 12,
  gesamt: { abschnittId: "GESAMT", name: "Gesamt", tiefe: 0, je: { ...NULL, IM_EINSATZ: 19, RUHE: 9 }, gesamt: 28, erwartet: 18 },
  auftraege: [
    { auftragId: "A1", text: "Pumpen Marktplatz", einheitId: "U1", einheit: "B-Gr 1", abschnitt: "UA 2.1 Pumpstelle", von: "2026-11-22T15:00:00.000Z", offen: true },
    { auftragId: "A3", text: "Erkunden", einheitId: "U2", einheit: "ZTr", abschnitt: "EA 2 Innenstadt", von: "2026-11-22T13:00:00.000Z", bis: "2026-11-22T13:30:00.000Z", offen: false },
  ],
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("stabsuebersichtAnfordern", { lageZeiger: 7, uebersicht: UEBERSICHT });
  useLaden.setState({ akteId: "akte-1", lagebild: { lageZeiger: 7 } as never, fehler: undefined, hinweise: [] });
});

describe("Das Blatt „Übersicht“", () => {
  it("holt die Übersicht eigens und zeigt Köpfe je Abschnitt mit Unterabschnitten", async () => {
    render(<Stabsuebersicht />);
    const kraefte = await screen.findByRole("region", { name: "Kräfte nach Status" });
    expect(attrappe.letzterRuf("stabsuebersichtAnfordern")?.akteId).toBe("akte-1");
    const ea = within(kraefte).getByRole("rowheader", { name: "EA 2 Innenstadt" }).closest("tr") as HTMLElement;
    expect(within(ea).getAllByRole("cell").map((zelle) => zelle.textContent)).toEqual(["19", "–", "9", "–", "–", "28", "6"]);
    expect(within(kraefte).getByText(/12 erwartet/)).toBeDefined();
  });

  it("zeigt zuerst nur offene Aufträge aller Einheiten, Erledigte auf Wunsch", async () => {
    render(<Stabsuebersicht />);
    const auftraege = await screen.findByRole("region", { name: "Aufträge" });
    expect(within(auftraege).getByText("Pumpen Marktplatz")).toBeDefined();
    expect(within(auftraege).getByText("B-Gr 1")).toBeDefined();
    expect(within(auftraege).queryByText("Erkunden")).toBeNull();
    fireEvent.click(within(auftraege).getByLabelText(/Erledigte zeigen \(1\)/));
    await waitFor(() => {
      expect(within(auftraege).getByText("Erkunden")).toBeDefined();
    });
  });
});
