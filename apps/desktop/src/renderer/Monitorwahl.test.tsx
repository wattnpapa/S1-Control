/**
 * Die Monitorwahl (M3.5) — in der Electron-Schale und im Browser.
 *
 * Im Browser gibt es kein zweites `BrowserWindow`: Der Knopf muss die
 * Monitorseite selbst in einem neuen Fenster öffnen, statt einen Ruf zu
 * schicken, den die Web-Schale nur mit einer Fehlermeldung beantworten kann.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Monitorwahl } from "./Monitorwahl.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const UMGEBUNG = { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c" };

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [], bildschirme: undefined });
});

describe("Die Monitorwahl in der Electron-Schale", () => {
  it("klappt die Bildschirme auf und ruft die Schale zum Öffnen", async () => {
    useLaden.setState({ umgebung: UMGEBUNG });
    attrappe.antwortet("bildschirmeAuflisten", [{ id: "2", name: "Beamer", breite: 1920, hoehe: 1080, primaer: false }]);
    render(<Monitorwahl />);
    await userEvent.click(screen.getByRole("button", { name: "Stärke-Monitor" }));
    await userEvent.click(await screen.findByRole("button", { name: /Beamer/ }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("monitorOeffnen")).toEqual({ art: "monitorOeffnen", bildschirmId: "2" });
    });
  });
});

describe("Die Monitorwahl im Browser", () => {
  beforeEach(() => {
    useLaden.setState({ umgebung: { ...UMGEBUNG, plattform: "web", electron: "keine" } });
  });

  it("öffnet die Monitorseite in einem neuen Fenster statt die Schale zu rufen", async () => {
    const fenster = { closed: false, focus: vi.fn() };
    const auf = vi.spyOn(window, "open").mockReturnValue(fenster as unknown as Window);
    render(<Monitorwahl />);
    await userEvent.click(screen.getByRole("button", { name: "Stärke-Monitor" }));
    expect(auf).toHaveBeenCalledWith("#monitor", "s1control-monitor");
    expect(attrappe.rufeDerArt("monitorOeffnen")).toHaveLength(0);
    expect(attrappe.rufeDerArt("bildschirmeAuflisten")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Auf dem Zweitbildschirm öffnen" })).toBeNull();

    // Der zweite Klick holt das offene Fenster nach vorn, statt ein zweites aufzumachen.
    await userEvent.click(screen.getByRole("button", { name: "Stärke-Monitor" }));
    expect(auf).toHaveBeenCalledTimes(1);
    expect(fenster.focus).toHaveBeenCalledTimes(1);

    // Ist es zu, geht ein neues auf.
    fenster.closed = true;
    await userEvent.click(screen.getByRole("button", { name: "Stärke-Monitor" }));
    expect(auf).toHaveBeenCalledTimes(2);
  });

  it("meldet ein blockiertes Fenster als Hinweis", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<Monitorwahl />);
    await userEvent.click(screen.getByRole("button", { name: "Stärke-Monitor" }));
    await waitFor(() => {
      expect(useLaden.getState().hinweise.map((hinweis) => hinweis.text)).toContain(
        "Der Browser hat das neue Fenster blockiert. Pop-ups für diese Seite erlauben.",
      );
    });
    expect(attrappe.rufeDerArt("monitorOeffnen")).toHaveLength(0);
  });
});
