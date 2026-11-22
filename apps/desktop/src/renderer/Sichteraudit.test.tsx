/**
 * Regressionstests zum Audit „Sichter“ vom 2026-11-17: Nachsichten (P0-1),
 * keine Kenntnis im fremden Posteingang (P0-2), der Laufzettel bleibt, wenn
 * ein anderer Sichter zuvorkommt (P0-3), Inhalt im Laufzettel und Escape
 * (P1-2, P3-2), Eingangszeit in der Liste, blau als Vorbelegung und die
 * Warnung ohne Hauptempfänger (P1-3), der Sperrhinweis mit Stelle (P2-4)
 * und der Vermerk in der Zeile des Posteingangs (P2-5).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { quittungszeitpunkt } from "./Laufzettel.js";
import { Nachrichten } from "./Nachrichten.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, VOR_SICHTER, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { sperrerMitStelle } from "./useBearbeitungssperre.js";

afterEach(cleanup);

let attrappe: Attrappe;
const SICHTER_LAGEBILD: Lagebild = { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: ["SICHTER"], handzeichen: "Si" } };
const EINGANG: Nachrichtenzeile = {
  ...VOR_SICHTER,
  inhalt: "Pegel steigt um 20 cm.",
  anschrift: "S3",
  aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-17T09:10:00.000Z", handzeichen: "Fm" },
};

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([EINGANG, BLITZ_AN_S4]));
  useLaden.setState({ akteId: "akte-1", lagebild: SICHTER_LAGEBILD, fehler: undefined, hinweise: [] });
});

function bedient(): { typ: string; vorher?: unknown; neu?: unknown }[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

async function laufzettelZu(betreff: RegExp): Promise<HTMLElement> {
  const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Sichter" }));
  fireEvent.click(within(tabelle).getByRole("row", { name: betreff }));
  return screen.getByRole("region", { name: "Laufzettel des Sichters" });
}

describe("Sicht Sichter nach dem Audit", () => {
  it("zeigt Eingangszeit und Inhalt, belegt die Anschrift grün vor und hält Escape im Laufzettel", async () => {
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Sichter" }));
    expect(within(tabelle).getByRole("columnheader", { name: "Eingang / Beförderung" })).toBeDefined();
    const zettel = await laufzettelZu(/Lage ruhig/);
    expect(zettel.textContent).toContain("Pegel steigt um 20 cm.");
    expect((within(zettel).getByRole("checkbox", { name: "S3 grün" }) as HTMLInputElement).checked).toBe(true);
    // Eine weitere Stelle ist zuerst Mitleser; ohne Grün warnt der Zettel.
    fireEvent.click(within(zettel).getByRole("checkbox", { name: "S3 grün" }));
    expect(zettel.textContent).toContain("Kein Hauptempfänger");
    fireEvent.keyDown(within(zettel).getByLabelText("Vermerke"), { key: "Escape" });
    expect(within(zettel).getByRole("alert").textContent).toContain("verwerfen?");
    fireEvent.keyDown(within(zettel).getByLabelText("Vermerke"), { key: "Escape" });
    // Verworfen sind die Eingaben, nicht die Auswahl.
    expect(screen.getByRole("region", { name: "Laufzettel des Sichters" })).toBeDefined();
    expect((within(zettel).getByRole("checkbox", { name: "S3 grün" }) as HTMLInputElement).checked).toBe(true);
  });

  it("lässt eine gesichtete Nachricht nachsichten, mit der bisherigen Sichtung als Vorher-Wert (P0-1)", async () => {
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Sichter" }));
    fireEvent.click(screen.getByRole("button", { name: "gesichtet" }));
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Sichter" }));
    expect(within(tabelle).queryByRole("row", { name: /Lage ruhig/ })).toBeNull();
    const zettel = await laufzettelZu(/Pumpen eingetroffen/);
    expect((within(zettel).getByRole("checkbox", { name: "S4 grün" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(zettel).getByRole("checkbox", { name: "Leiter blau" }));
    fireEvent.click(within(zettel).getByRole("button", { name: /^Nachsichten \(/u }));
    await waitFor(() => expect(bedient()).toHaveLength(1));
    expect(bedient()[0]).toMatchObject({ typ: "NachrichtGesichtet", vorher: BLITZ_AN_S4.sichtung, neu: { verteiler: expect.arrayContaining([{ stelle: "LEITER", kopie: "BLAU" }]) } });
  });

  it("behält den Laufzettel, wenn ein anderer Sichter zuvorkommt, und vereinigt die Verteiler (P0-3)", async () => {
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([EINGANG]));
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const zettel = await laufzettelZu(/Lage ruhig/);
    fireEvent.click(within(zettel).getByRole("checkbox", { name: "S6 blau" }));
    const fremd = { zeitpunkt: "2026-11-17T09:12:00.000Z", handzeichen: "Zw", verteiler: [{ stelle: "S2", kopie: "ROT" }, { stelle: "S1", kopie: "GRUEN" }] };
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([{ ...EINGANG, laufzustand: "VERTEILT", sichtung: fremd }]));
    useLaden.setState({ lagebild: { ...SICHTER_LAGEBILD, lageZeiger: SICHTER_LAGEBILD.lageZeiger + 1 } });
    await waitFor(() => expect(screen.getByRole("region", { name: "Laufzettel des Sichters" }).textContent).toContain("Inzwischen von Zw gesichtet"));
    const offen = screen.getByRole("region", { name: "Laufzettel des Sichters" });
    expect((within(offen).getByRole("checkbox", { name: "S6 blau" }) as HTMLInputElement).checked).toBe(true);
    expect((within(offen).getByRole("checkbox", { name: "S1 grün" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(offen).getByRole("button", { name: /^Nachsichten \(/u }));
    await waitFor(() => expect(bedient()).toHaveLength(1));
    expect(bedient()[0]).toMatchObject({ vorher: fremd });
  });

  it("gibt im fremden Posteingang keine Kenntnis und sagt es (P0-2); der Vermerk steht in der Zeile (P2-5)", async () => {
    useLaden.setState({ lagebild: NACHRICHTEN_LAGEBILD });
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([{ ...BLITZ_AN_S4, vermerke: "Rückmeldung in 10 min" }]));
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    const zeile = within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ });
    expect(zeile.textContent).toContain("Vermerk: Rückmeldung in 10 min");
    expect(zeile.textContent).toContain("grün: bearbeiten");
    fireEvent.change(screen.getByLabelText("Posteingang von"), { target: { value: "S2" } });
    expect(screen.getByText("Nur lesen, Kenntnis gibt S2 selbst.")).toBeDefined();
    const neu = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
    fireEvent.doubleClick(within(neu).getByRole("row", { name: /Pumpen eingetroffen/ }));
    await new Promise((r) => setTimeout(r, 20));
    expect(bedient().filter((e) => e.typ === "NachrichtKenntnisGenommen")).toEqual([]);
  });

  it("quittiert mit der Zeit des Drückens, solange niemand die Quittung getippt hat (P3-1)", async () => {
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([EINGANG]));
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const zettel = await laufzettelZu(/Lage ruhig/);
    // Drei Minuten später: Wer so lange verteilt, quittiert nicht mit der Zeit des Aufschlagens.
    const spaeter = new Date(Date.now() + 3 * 60_000);
    vi.useFakeTimers({ toFake: ["Date"], now: spaeter });
    try {
      fireEvent.click(within(zettel).getByRole("button", { name: /^Sichten \(/u }));
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() => expect(bedient()).toHaveLength(1));
    expect(bedient()[0]).toMatchObject({ typ: "NachrichtGesichtet", neu: { zeitpunkt: spaeter.toISOString() } });
  });

  it("behält eine getippte Quittungszeit (P3-1)", () => {
    expect(quittungszeitpunkt(true, "2026-11-17T09:00:00.000Z", new Date("2026-11-17T09:30:00Z"))).toBe("2026-11-17T09:00:00.000Z");
    expect(quittungszeitpunkt(false, "2026-11-17T09:00:00.000Z", new Date("2026-11-17T09:30:00Z"))).toBe("2026-11-17T09:30:00.000Z");
    expect(quittungszeitpunkt(true, undefined)).toBeUndefined();
  });

  it("nennt im Sperrhinweis Stelle und Handzeichen (P2-4)", () => {
    const peer = { ...(SICHTER_LAGEBILD.peers[0] ?? {}), clientId: "b", anzeigename: "Sichtung 2", rechnername: "PC-2", veraltet: false, bearbeitet: ["N-1"], stellen: ["SICHTER"], handzeichen: "Zw" } as Lagebild["peers"][number];
    expect(sperrerMitStelle([peer], "N-1")).toBe("Sichtung 2 (Sichter · Hz. Zw)");
  });
});
