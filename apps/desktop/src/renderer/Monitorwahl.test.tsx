/**
 * Die Monitorwahl (M3.5) — in der Electron-Schale und im Browser.
 *
 * Seit Runde 6 („Entlastung") öffnet sie der Eintrag „Stärke-Monitor öffnen …"
 * im Fenstermenü (Fenstermenue.test.tsx prüft den Weg dorthin). Hier steht,
 * was dahinter liegt: die Bildschirmwahl der Electron-Schale und das neue
 * Fenster im Browser. Im Browser gibt es kein zweites `BrowserWindow`: Der
 * Eintrag muss die Monitorseite selbst öffnen, statt einen Ruf zu schicken,
 * den die Web-Schale nur mit einer Fehlermeldung beantworten kann.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Monitorauswahl, useMonitorstart } from "./Monitorwahl.js";
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

describe("Die Bildschirmwahl in der Electron-Schale", () => {
  beforeEach(() => {
    useLaden.setState({ umgebung: UMGEBUNG });
    attrappe.antwortet("bildschirmeAuflisten", [{ id: "2", name: "Beamer", breite: 1920, hoehe: 1080, primaer: false }]);
  });

  it("holt die Bildschirme beim Aufgehen und ruft die Schale zum Öffnen", async () => {
    const zu = vi.fn();
    render(<Monitorauswahl aufSchliessen={zu} />);
    expect(screen.getByRole("dialog", { name: "Stärke-Monitor öffnen" })).toBeDefined();
    await userEvent.click(await screen.findByRole("button", { name: /Beamer \(1920×1080\)/ }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("monitorOeffnen")).toEqual({ art: "monitorOeffnen", bildschirmId: "2" });
    });
    expect(zu).toHaveBeenCalled();
  });

  it("öffnet ohne Wahl auf dem Zweitbildschirm und schließt den Monitor auf Wunsch", async () => {
    render(<Monitorauswahl aufSchliessen={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: "Auf dem Zweitbildschirm öffnen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("monitorOeffnen")).toEqual({ art: "monitorOeffnen" });
    });
    await userEvent.click(screen.getByRole("button", { name: "Monitor schließen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("monitorSchliessen")).toHaveLength(1);
    });
  });

  it("geht mit Abbrechen, Esc und einem Tipp daneben zu, ohne etwas zu tun", async () => {
    const zu = vi.fn();
    render(
      <>
        <p>Daneben</p>
        <Monitorauswahl aufSchliessen={zu} />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByText("Daneben"));
    expect(zu).toHaveBeenCalledTimes(3);
    expect(attrappe.rufeDerArt("monitorOeffnen")).toHaveLength(0);
  });
});

/** Ein Knopf, der den Monitor öffnet wie der Menüeintrag im Browser. */
function Browserknopf(): React.JSX.Element {
  const start = useMonitorstart();
  return (
    <button type="button" onClick={start.oeffneImBrowser}>
      {start.imBrowser ? "im Browser" : "in Electron"}
    </button>
  );
}

describe("Der Monitor im Browser", () => {
  beforeEach(() => {
    useLaden.setState({ umgebung: { ...UMGEBUNG, plattform: "web", electron: "keine" } });
  });

  it("öffnet die Monitorseite in einem neuen Fenster und holt es beim zweiten Mal nach vorn", async () => {
    const fenster = { closed: false, focus: vi.fn() };
    const auf = vi.spyOn(window, "open").mockReturnValue(fenster as unknown as Window);
    render(<Browserknopf />);
    const knopf = screen.getByRole("button", { name: "im Browser" });
    await userEvent.click(knopf);
    expect(auf).toHaveBeenCalledWith("#monitor", "s1control-monitor");
    expect(attrappe.rufeDerArt("monitorOeffnen")).toHaveLength(0);

    // Der zweite Klick holt das offene Fenster nach vorn, statt ein zweites aufzumachen.
    await userEvent.click(knopf);
    expect(auf).toHaveBeenCalledTimes(1);
    expect(fenster.focus).toHaveBeenCalledTimes(1);

    // Ist es zu, geht ein neues auf.
    fenster.closed = true;
    await userEvent.click(knopf);
    expect(auf).toHaveBeenCalledTimes(2);
  });

  it("meldet ein blockiertes Fenster als Hinweis", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    render(<Browserknopf />);
    await userEvent.click(screen.getByRole("button", { name: "im Browser" }));
    await waitFor(() => {
      expect(useLaden.getState().hinweise.map((hinweis) => hinweis.text)).toContain(
        "Der Browser hat das neue Fenster blockiert. Pop-ups für diese Seite erlauben.",
      );
    });
    expect(attrappe.rufeDerArt("monitorOeffnen")).toHaveLength(0);
  });
});
