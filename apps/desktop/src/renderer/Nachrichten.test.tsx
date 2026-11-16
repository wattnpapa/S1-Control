/**
 * Komponententests zum Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md §6, N1).
 *
 * Die Rechnung prüft Ring 2; hier steht die Verdrahtung: Reiter, eigener Ruf
 * mit den Stellen der Sitzung, Band, Zeilen mit Kopiefarbe und Marken, die
 * Schritte der Auswahl (Lesen mit Kenntnisnahme, Erledigt, Antworten) und
 * der Laufzettel des Sichters mit S2 rot vorbelegt.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BLAETTER } from "./blaetter.js";
import { useLaden } from "./laden.js";
import { Nachrichten, ersteSicht } from "./Nachrichten.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, GELESEN_AN_S1, NACHRICHTEN_LAGEBILD, VOR_SICHTER, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;
const aufTagebuch = vi.fn();

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_AN_S4, GELESEN_AN_S1]));
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: NACHRICHTEN_LAGEBILD, fehler: undefined, hinweise: [] });
  aufTagebuch.mockReset();
});

async function geladen(): Promise<HTMLElement> {
  render(<Nachrichten aufTagebuch={aufTagebuch} />);
  return waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
}

function bedient(): { typ: string; nutzlast?: unknown; vorher?: unknown; neu?: unknown; vorwertPruefen?: boolean }[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Das Blatt „Nachrichten“", () => {
  it("steht als Reiter zwischen Eingang und Führungsstelle", () => {
    const schluessel = BLAETTER.map((b) => b.schluessel);
    expect(schluessel.indexOf("nachrichten")).toBe(schluessel.indexOf("eingang") + 1);
    expect(schluessel.indexOf("fuest")).toBe(schluessel.indexOf("nachrichten") + 1);
  });

  it("holt den Posteingang mit den Stellen der Sitzung und zeigt das Band, Vorrang in Bernstein", async () => {
    await geladen();
    expect(attrappe.rufeDerArt("nachrichtenAnfordern")[0]).toEqual({ art: "nachrichtenAnfordern", akteId: "akte-1", anzahl: 100, sicht: "posteingang", stellen: ["S1", "S4"] });
    const band = screen.getByLabelText("Zahlen der Nachrichten");
    expect(within(band).getByText("mit Vorrang offen").closest(".kpi")?.className).toContain("warn");
    expect(within(band).getByText("über der Schwelle").closest(".kpi")?.className).not.toContain("warn");
    expect(within(band).getByText("neu für meine Stellen").closest(".kpi")?.textContent).toBe("1neu für meine Stellen");
  });

  it("zeigt je Zeile Kopiefarbe, Marken, Vorrang, Nummer und Abfassungszeit als Datum-Zeit-Gruppe", async () => {
    const tabelle = await geladen();
    const blitz = within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ });
    expect(blitz.className).toContain("kopie-gruen");
    expect(within(blitz).getByText("Kopie grün")).toBeDefined();
    expect(within(blitz).getByText("neu")).toBeDefined();
    expect(within(blitz).getByText("Blitz").className).toContain("fehler");
    expect(within(blitz).getByText("26")).toBeDefined();
    expect(within(blitz).getByText("161045nov26")).toBeDefined();
    const gelesen = within(tabelle).getByRole("row", { name: /Verpflegung 18 Uhr/ });
    expect(gelesen.className).toContain("kopie-blau");
    expect(within(gelesen).getByText("gelesen")).toBeDefined();
  });

  it("filtert mit den Chips und sucht über den Ruf", async () => {
    await geladen();
    fireEvent.click(screen.getByRole("button", { name: /neu/ }));
    fireEvent.change(screen.getByLabelText("Suche über Betreff, Inhalt, Absender und Anschrift"), { target: { value: "Pumpen" } });
    await waitFor(() => {
      expect(attrappe.letzterRuf("nachrichtenAnfordern")).toMatchObject({ zustaende: ["NEU"], suche: "Pumpen" });
    });
  });

  it("„Lesen“ schlägt den Vordruck auf und nimmt nur für eigene Stellen Kenntnis", async () => {
    const tabelle = await geladen();
    fireEvent.click(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
    fireEvent.click(within(screen.getByRole("toolbar", { name: "Auswahl" })).getByRole("button", { name: /^Lesen/ }));
    expect(screen.getByRole("dialog", { name: "Nachricht E 26" })).toBeDefined();
    await waitFor(() => expect(bedient()).toHaveLength(1));
    expect(bedient()[0]).toMatchObject({ typ: "NachrichtKenntnisGenommen", nutzlast: { nachrichtId: "N-blitz", stelle: "S4" }, neu: { handzeichen: "Mü" } });
  });

  it("„Erledigt“ schreibt je eigener Stelle, „Antworten“ öffnet die Maske mit getauschter Anschrift", async () => {
    const tabelle = await geladen();
    fireEvent.click(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
    const leiste = screen.getByRole("toolbar", { name: "Auswahl" });
    fireEvent.click(within(leiste).getByRole("button", { name: /^Erledigt/ }));
    await waitFor(() => expect(bedient()).toEqual([{ typ: "NachrichtErledigt", nutzlast: { nachrichtId: "N-blitz", stelle: "S4" }, vorher: null, neu: true }]));
    fireEvent.click(within(leiste).getByRole("button", { name: /^Antworten/ }));
    const maske = screen.getByRole("form", { name: "Antworten" });
    expect((within(maske).getByLabelText("Anschrift") as HTMLInputElement).value).toBe("OV Wildeshausen");
    expect((within(maske).getByLabelText("Betreff") as HTMLInputElement).value).toBe("Antwort: Pumpen eingetroffen");
  });

  it("öffnet mit Strg+N die Maske „Nachricht verfassen“", async () => {
    await geladen();
    await userEvent.keyboard("{Control>}n{/Control}");
    expect(screen.getByRole("form", { name: "Nachricht verfassen" })).toBeDefined();
  });

  it("zeigt im Sichter den Laufzettel mit S2 rot vorbelegt und sichtet mit Vorwert-Prüfung", async () => {
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([VOR_SICHTER]));
    render(<Nachrichten aufTagebuch={aufTagebuch} />);
    fireEvent.click(screen.getByRole("button", { name: "Sichter" }));
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Sichter" }));
    fireEvent.click(within(tabelle).getByRole("row", { name: /Lage ruhig/ }));
    const zettel = screen.getByRole("region", { name: "Laufzettel des Sichters" });
    expect((within(zettel).getByLabelText("Handzeichen") as HTMLInputElement).value).toBe("Mü");
    expect((within(zettel).getByLabelText("Kopie für S2") as HTMLSelectElement).value).toBe("ROT");
    fireEvent.click(within(zettel).getByRole("checkbox", { name: "S4" }));
    fireEvent.click(within(zettel).getByRole("button", { name: "Sichten" }));
    await waitFor(() => expect(bedient()).toHaveLength(1));
    expect(bedient()[0]).toMatchObject({
      typ: "NachrichtGesichtet",
      nutzlast: { nachrichtId: "N-offen" },
      vorher: null,
      vorwertPruefen: true,
      neu: { handzeichen: "Mü", verteiler: [{ stelle: "S2", kopie: "ROT" }, { stelle: "S4", kopie: "GRUEN" }] },
    });
    expect(attrappe.rufeDerArt("sperre")[0]).toMatchObject({ entitaetId: "N-offen" });
  });

  it("beginnt beim Sichter mit der Sicht Sichter, sonst im Posteingang", () => {
    expect(ersteSicht(["SICHTER"])).toBe("sichter");
    expect(ersteSicht(["S1", "SICHTER"])).toBe("posteingang");
    expect(ersteSicht([])).toBe("posteingang");
  });
});
