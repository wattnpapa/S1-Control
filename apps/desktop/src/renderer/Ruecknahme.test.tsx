/**
 * Rückgängig: Klartext mit Gegenstand, Rückfrage vor dem Ausführen, ehrliche
 * Auskunft bei leerem Verlauf und Sperre im beendeten Einsatz.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { Ruecknahme } from "./Ruecknahme.js";

afterEach(cleanup);

const BASIS: Lagebild = {
  einsatzId: "e1",
  einsatzName: "Hochwasser Weser",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "",
  letzterShareKontakt: "",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 0,
  einheiten: 0,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 1,
  undoObersteArt: "EinheitEntfernt",
  undoObersteObjekt: "TZ",
  lageZeiger: 0,
  einsatzStatus: "AKTIV",
  einsatzEnde: "",
};

let attrappe: Attrappe;

function setze(teil: Partial<Lagebild>): void {
  useLaden.setState({ akteId: "akte-1", lagebild: { ...BASIS, ...teil }, fehler: undefined, hinweise: [] });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("zurueck", { art: "geschrieben", ereignisId: "e9" });
});

describe("Rückgängig", () => {
  it("beschriftet den Knopf in Klartext mit dem Gegenstand", () => {
    setze({});
    render(<Ruecknahme />);
    expect(screen.getByRole("button", { name: "Rückgängig: Einheit ‚TZ‘ entfernt" })).toBeDefined();
    expect(screen.queryByText(/EinheitEntfernt/u)).toBeNull();
  });

  it("nimmt erst nach der Rückfrage zurück", async () => {
    setze({});
    render(<Ruecknahme />);
    await userEvent.click(screen.getByRole("button", { name: /Rückgängig:/u }));
    expect(attrappe.rufeDerArt("zurueck")).toHaveLength(0);
    const maske = screen.getByRole("form", { name: "Rückgängig machen?" });
    expect(within(maske).getByText(/Einheit ‚TZ‘ entfernt/u)).toBeDefined();
    expect(within(maske).getByText(/rückgängig machen\?/u)).toBeDefined();
    await userEvent.click(within(maske).getByRole("button", { name: "Rückgängig machen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("zurueck")).toHaveLength(1);
    });
  });

  it("tut bei Abbrechen nichts", async () => {
    setze({});
    render(<Ruecknahme />);
    await userEvent.click(screen.getByRole("button", { name: /Rückgängig:/u }));
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(attrappe.rufeDerArt("zurueck")).toHaveLength(0);
    expect(screen.queryByRole("form", { name: "Rückgängig machen?" })).toBeNull();
  });

  it("sagt bei leerem Verlauf ausdrücklich, dass er nach dem Neuladen leer ist", () => {
    setze({ undoTiefe: 0, undoObersteArt: undefined, undoObersteObjekt: undefined });
    render(<Ruecknahme />);
    const knopf = screen.getByRole("button", { name: "Rückgängig (Verlauf leer)" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    expect(knopf.title).toMatch(/nach dem Neuladen oder Neustart leer/u);
    expect(knopf.title).toMatch(/Einsatztagebuch/u);
  });

  it("sperrt im beendeten Einsatz mit dem Hinweis „nur lesen“", () => {
    setze({ einsatzStatus: "BEENDET" });
    render(<Ruecknahme />);
    const knopf = screen.getByRole("button", { name: /Rückgängig/u }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    expect(knopf.title).toBe("Einsatz beendet – nur lesen");
  });

  it("lässt im beendeten Einsatz die Rücknahme des Beendens zu", () => {
    setze({ einsatzStatus: "BEENDET", undoObersteArt: "EinsatzBeendet", undoObersteObjekt: "Hochwasser Weser" });
    render(<Ruecknahme />);
    expect((screen.getByRole("button", { name: /Rückgängig/u }) as HTMLButtonElement).disabled).toBe(false);
  });
});
