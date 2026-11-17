/**
 * Lesen im Blatt „Nachrichten": Knopf der Auswahlleiste und Doppelklick gehen
 * denselben Weg (Ansicht öffnet, Kenntnisnahme wird geschrieben), die Ansicht
 * schließt oben, unten und mit Escape, und die Spalte Nr. sagt „folgt (FmZ)".
 * Mit echtem Zeigerablauf (userEvent) statt einzelner Ereignisse.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLaden } from "./laden.js";
import { Nachrichten } from "./Nachrichten.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, GELESEN_AN_S1, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";

afterEach(cleanup);
let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_AN_S4, GELESEN_AN_S1]));
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: NACHRICHTEN_LAGEBILD, fehler: undefined, hinweise: [] });
});

describe("Lesen: Knopf und Doppelklick", () => {
  it("Knopf der Leiste nach echtem Zeigerablauf öffnet die Ansicht", async () => {
    const benutzer = userEvent.setup();
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    await benutzer.click(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
    await benutzer.click(within(screen.getByRole("toolbar", { name: "Auswahl" })).getByRole("button", { name: /^Lesen/ }));
    expect(screen.getByRole("dialog", { name: "Nachricht E 26" })).toBeDefined();
    await waitFor(() => expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1));
  });

  it("Leertaste auf dem Knopf", async () => {
    const benutzer = userEvent.setup();
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    await benutzer.click(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
    within(screen.getByRole("toolbar", { name: "Auswahl" })).getByRole("button", { name: /^Lesen/ }).focus();
    await benutzer.keyboard(" ");
    expect(screen.queryByRole("dialog", { name: "Nachricht E 26" })).not.toBeNull();
  });

  it("bleibt offen, wenn die Zeile nach dem Lesen aus der Liste fällt", async () => {
    const benutzer = userEvent.setup();
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    await benutzer.click(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
    await benutzer.click(within(screen.getByRole("toolbar", { name: "Auswahl" })).getByRole("button", { name: /^Lesen/ }));
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([GELESEN_AN_S1]));
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, lageZeiger: 99 } });
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Nachrichten: Posteingang" })).queryByText("Pumpen eingetroffen")).toBeNull());
    expect(screen.queryByRole("dialog", { name: "Nachricht E 26" })).not.toBeNull();
  });

  it("Doppelklick und Knopf schreiben dieselbe Kenntnisnahme", async () => {
    const benutzer = userEvent.setup();
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    await benutzer.dblClick(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
    expect(screen.getByRole("dialog", { name: "Nachricht E 26" })).toBeDefined();
    await waitFor(() => expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1));
    expect(attrappe.rufeDerArt("bedienen")[0]?.entwurf).toMatchObject({ typ: "NachrichtKenntnisGenommen", nutzlast: { nachrichtId: "N-blitz", stelle: "S4" } });
  });

  it("schließt oben, unten und mit Escape auch ohne Fokus im Dialog", async () => {
    const benutzer = userEvent.setup();
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    const oeffne = async (): Promise<HTMLElement> => {
      await benutzer.dblClick(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
      return screen.getByRole("dialog", { name: "Nachricht E 26" });
    };
    await benutzer.click(within(await oeffne()).getByRole("button", { name: "Fenster schließen" }));
    expect(screen.queryByRole("dialog", { name: "Nachricht E 26" })).toBeNull();
    await benutzer.click(within(await oeffne()).getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("dialog", { name: "Nachricht E 26" })).toBeNull();
    const dialog = await oeffne();
    await benutzer.click(within(dialog).getByRole("heading"));
    (document.activeElement as HTMLElement | null)?.blur();
    await benutzer.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Nachricht E 26" })).toBeNull();
  });

  it("zeigt „folgt (FmZ)“ für eine aufgegebene Nachricht ohne Nummer, sonst „—“", async () => {
    attrappe.antwortet(
      "nachrichtenAnfordern",
      nachrichtenansicht([
        { ...BLITZ_AN_S4, id: "N-aus", nummer: undefined, laufzustand: "VOR_FMZ", betreff: "Aufgegeben" },
        { ...GELESEN_AN_S1, id: "N-ohne", nummer: undefined, betreff: "Ohne Nummer verteilt" },
      ]),
    );
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    const folgt = within(within(tabelle).getByRole("row", { name: /Aufgegeben/ })).getByText("folgt (FmZ)");
    expect(folgt.getAttribute("title")).toBe("Die Nachweisungsnummer vergibt die Fernmeldezentrale");
    const ohne = within(tabelle).getByRole("row", { name: /Ohne Nummer verteilt/ });
    expect(within(ohne).getByText("—")).toBeDefined();
    expect(within(ohne).queryByText("folgt (FmZ)")).toBeNull();
  });
});
