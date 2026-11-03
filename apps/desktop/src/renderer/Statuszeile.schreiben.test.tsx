/**
 * Rechts in der Statuszeile: „Rückgängig" mit dem Namen des letzten Schritts
 * und die Bestätigung nach dem Schreiben (Entwurf „Entlastung", 3.3, 6e).
 */

import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Lagebild } from "../kontrakt/index.js";
import { BESTAETIGUNG_MS } from "./bestaetigungsfolge.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { Statuszeile } from "./Statuszeile.js";

const JETZT = Date.parse("2026-09-10T08:00:30.000Z");

const LAGEBILD = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "2026-09-10T08:00:22.000Z",
  letzterShareKontakt: "2026-09-10T08:00:29.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 1,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 1,
  undoObersteArt: "StatusGesetzt",
  undoObersteObjekt: "FGr WP 1",
  lageZeiger: 0,
  einsatzStatus: "AKTIV",
} as unknown as Lagebild;

let attrappe: Attrappe;

function zeige(teil: Partial<Lagebild> = {}): void {
  const lagebild = { ...LAGEBILD, ...teil };
  useLaden.setState({ akteId: "akte-1", lagebild });
  render(<Statuszeile lagebild={lagebild} jetzt={JETZT} />);
}

beforeEach(() => {
  attrappe = baueAttrappe();
  useLaden.setState({ letzteBestaetigung: undefined, fehler: undefined, hinweise: [] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Rückgängig in der Statuszeile", () => {
  it("nennt den letzten Schritt mit Gegenstand und steht in der Fußzeile", () => {
    zeige();
    const fuss = screen.getByRole("contentinfo", { name: "Statuszeile" });
    const knopf = within(fuss).getByRole("button", { name: "Rückgängig: Status der Einheit ‚FGr WP 1‘ geändert" });
    expect(knopf.textContent).toBe("↶ Rückgängig: Status der Einheit ‚FGr WP 1‘ geändert");
    expect((knopf as HTMLButtonElement).disabled).toBe(false);
  });

  it("sagt grau, dass nichts zurückzunehmen ist, und erklärt es im Titel", () => {
    zeige({ undoTiefe: 0, undoObersteArt: undefined, undoObersteObjekt: undefined });
    const knopf = screen.getByRole("button", { name: "Rückgängig: nichts zurückzunehmen" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    expect(knopf.title).toMatch(/Verlauf gilt nur für diese Sitzung/u);
  });

  it("nimmt nach der Rückfrage zurück und bestätigt die Rücknahme links daneben", async () => {
    attrappe.antwortet("zurueck", { art: "geschrieben", ereignisId: "e9" });
    zeige();
    await userEvent.click(screen.getByRole("button", { name: /Rückgängig:/u }));
    const maske = screen.getByRole("form", { name: "Rückgängig machen?" });
    await userEvent.click(within(maske).getByRole("button", { name: "Rückgängig machen" }));
    expect(
      await screen.findByText("✓ Zurückgenommen: Status der Einheit ‚FGr WP 1‘ geändert · gespeichert"),
    ).toBeDefined();
    expect(attrappe.rufeDerArt("zurueck")).toHaveLength(1);
  });

  it("öffnet die Rückfrage auch mit Strg+Z, nicht aber im Eingabefeld und nicht bei leerem Verlauf", async () => {
    zeige();
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(screen.getByRole("form", { name: "Rückgängig machen?" })).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(attrappe.rufeDerArt("zurueck")).toHaveLength(0);
    cleanup();

    zeige({ undoTiefe: 0, undoObersteArt: undefined, undoObersteObjekt: undefined });
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(screen.queryByRole("form", { name: "Rückgängig machen?" })).toBeNull();
    cleanup();

    zeige();
    render(<input aria-label="Notiz" />);
    await userEvent.click(screen.getByLabelText("Notiz"));
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(screen.queryByRole("form", { name: "Rückgängig machen?" })).toBeNull();
  });

  it("fehlt ohne offenen Einsatz", () => {
    render(<Statuszeile lagebild={undefined} jetzt={JETZT} />);
    expect(screen.queryByRole("button", { name: /Rückgängig/u })).toBeNull();
  });
});

describe("Die Bestätigung nach dem Schreiben", () => {
  it("erscheint nach einem eigenen Schreiben und verschwindet nach zehn Sekunden", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "e3" });
    zeige();
    expect(screen.queryByText(/gespeichert/u)).toBeNull();

    await act(async () => {
      await useLaden.getState().bediene({ typ: "StatusGesetzt" });
    });
    // Das Lagebild hat sich in diesem Test nicht bewegt: Es steht der Vorgang
    // ohne Gegenstand — der des vorigen Schritts wäre falsch.
    const marke = screen.getByText("✓ Status der Einheit geändert · gespeichert");
    expect(marke.className).toBe("bestaetigung");
    expect(marke.getAttribute("aria-live")).toBe("polite");

    act(() => {
      vi.advanceTimersByTime(BESTAETIGUNG_MS - 1);
    });
    expect(screen.queryByText(/gespeichert/u)).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByText(/gespeichert/u)).toBeNull();
  });

  it("zeigt eine abgelaufene Bestätigung gar nicht erst", async () => {
    useLaden.setState({ letzteBestaetigung: { text: "Alt · gespeichert", zeit: Date.now() - BESTAETIGUNG_MS - 5 } });
    zeige();
    await waitFor(() => {
      expect(screen.queryByText(/Alt · gespeichert/u)).toBeNull();
    });
  });
});
