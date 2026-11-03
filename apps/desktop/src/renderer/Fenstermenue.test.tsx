/**
 * Das Fenstermenü „⋯" im Kopfband (Entwurf „Entlastung", 3.1, Option 6e).
 *
 * Geprüft wird es dort, wo es steht — im Kopfband —, weil es seine Einträge
 * davon abhängig macht, ob ein Einsatz offen ist. Was früher als Knopf im
 * Band stand (Hilfe, Themenschalter, Abmelden, Einsatzauswahl, Stärke-Monitor,
 * Reiter Diagnose), wird hier über das Menü gefunden.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Kopfband } from "./Kopfband.js";
import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { useVerbindung } from "./verbindung.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const JETZT = new Date(2026, 8, 10, 14, 43).getTime();

const UMGEBUNG = { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c" };

const LAGEBILD = {
  einsatzId: "E1",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "",
  letzterShareKontakt: "",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 1,
  gesamtstaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 0,
} as unknown as Lagebild;

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  useVerbindung.getState().zuruecksetzen();
  useLaden.setState({ akteId: "akte-1", umgebung: UMGEBUNG, bildschirme: undefined, fehler: undefined, hinweise: [] });
});

/** Klappt das Fenstermenü auf und gibt es zurück. */
async function oeffneMenue(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "Fenstermenü" }));
  return screen.getByRole("menu", { name: "Fenstermenü" });
}

describe("Das Fenstermenü", () => {
  function zeige(teil: Partial<Parameters<typeof Kopfband>[0]> = {}): void {
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        {...teil}
      />,
    );
  }

  it("ist ein Menüknopf, der per Klick auf- und zugeht", async () => {
    zeige();
    const knopf = screen.getByRole("button", { name: "Fenstermenü" });
    expect(knopf.getAttribute("aria-haspopup")).toBe("menu");
    expect(knopf.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("menu")).toBeNull();

    await userEvent.click(knopf);
    expect(knopf.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu", { name: "Fenstermenü" })).toBeDefined();
    // Der Fokus steht auf dem ersten Eintrag, damit die Pfeile sofort greifen.
    expect(document.activeElement?.textContent).toContain("Hilfe und Tastenkarte");

    await userEvent.click(knopf);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("schließt mit Esc und gibt den Fokus an den Knopf zurück", async () => {
    zeige();
    await oeffneMenue();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Fenstermenü" }));
  });

  it("schließt bei einem Klick daneben", async () => {
    zeige();
    await oeffneMenue();
    await userEvent.click(screen.getByText("101443SEP26"));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("wandert mit den Pfeiltasten und springt am Ende nach oben", async () => {
    zeige();
    await oeffneMenue();
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Standard");
    await userEvent.keyboard("{End}");
    expect(document.activeElement?.textContent).toBe("Nacht");
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toContain("Hilfe und Tastenkarte");
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement?.textContent).toBe("Nacht");
  });

  it("öffnet die Hilfe und nennt das Kürzel", async () => {
    const aufHilfe = vi.fn();
    zeige({ aufHilfe });
    const menue = await oeffneMenue();
    const eintrag = within(menue).getByRole("menuitem", { name: "Hilfe und Tastenkarte" });
    expect(eintrag.textContent).toContain("Strg+H");
    expect(eintrag.getAttribute("aria-keyshortcuts")).toBe("Control+H");
    await userEvent.click(eintrag);
    expect(aufHilfe).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("zeigt das gewählte Erscheinungsbild als angehakt und meldet den Wechsel", async () => {
    const waehleTheme = vi.fn();
    zeige({ theme: "nacht", waehleTheme });
    const menue = await oeffneMenue();
    const gruppe = within(menue).getByRole("group", { name: "Erscheinungsbild" });
    expect(within(gruppe).getAllByRole("menuitemradio").map((e) => e.textContent)).toEqual([
      "Standard",
      "Dunkel",
      "Feld",
      "Nacht",
    ]);
    expect(within(gruppe).getByRole("menuitemradio", { name: "Nacht", checked: true })).toBeDefined();
    expect(within(gruppe).getByRole("menuitemradio", { name: "Feld", checked: false })).toBeDefined();

    await userEvent.click(within(gruppe).getByRole("menuitemradio", { name: "Feld" }));
    expect(waehleTheme).toHaveBeenCalledWith("feld");
  });

  it("führt Monitor, Diagnose und „Einsatz schließen“ nur mit offenem Einsatz", async () => {
    zeige({ lagebild: undefined });
    const menue = await oeffneMenue();
    expect(within(menue).queryByRole("menuitem", { name: /Stärke-Monitor/ })).toBeNull();
    expect(within(menue).queryByRole("menuitem", { name: "Diagnose" })).toBeNull();
    expect(within(menue).queryByRole("menuitem", { name: "Einsatz schließen" })).toBeNull();
  });

  it("schließt den Einsatz über das Menü", async () => {
    const zurueck = vi.fn();
    zeige({ zurueckZurAuswahl: zurueck });
    const menue = await oeffneMenue();
    await userEvent.click(within(menue).getByRole("menuitem", { name: "Einsatz schließen" }));
    expect(zurueck).toHaveBeenCalledOnce();
  });

  it("zeigt „Abmelden“ nur hinter der Anmeldung, als Formular POST abmeldung", async () => {
    zeige();
    let menue = await oeffneMenue();
    expect(within(menue).queryByRole("menuitem", { name: "Abmelden" })).toBeNull();
    cleanup();

    zeige({ angemeldet: true });
    menue = await oeffneMenue();
    const knopf = within(menue).getByRole("menuitem", { name: "Abmelden" });
    expect(knopf.getAttribute("type")).toBe("submit");
    const formular = knopf.closest("form");
    expect(formular?.getAttribute("method")).toBe("post");
    // Relativ, damit es auch hinter einem Unterpfad stimmt.
    expect(formular?.getAttribute("action")).toBe("abmeldung");
  });

  it("öffnet den Stärke-Monitor in Electron über die Bildschirmwahl", async () => {
    attrappe.antwortet("bildschirmeAuflisten", [{ id: "2", name: "Beamer", breite: 1920, hoehe: 1080, primaer: false }]);
    zeige({ zurueckZurAuswahl: () => undefined });
    const menue = await oeffneMenue();
    await userEvent.click(within(menue).getByRole("menuitem", { name: "Stärke-Monitor öffnen …" }));
    expect(screen.queryByRole("menu")).toBeNull();
    const wahl = screen.getByRole("dialog", { name: "Stärke-Monitor öffnen" });
    await userEvent.click(await within(wahl).findByRole("button", { name: /Beamer/ }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("monitorOeffnen")).toEqual({ art: "monitorOeffnen", bildschirmId: "2" });
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("öffnet den Stärke-Monitor im Browser direkt in einem neuen Fenster", async () => {
    useLaden.setState({ umgebung: { ...UMGEBUNG, plattform: "web", electron: "keine" } });
    const auf = vi.spyOn(window, "open").mockReturnValue({ closed: false, focus: vi.fn() } as unknown as Window);
    zeige({ zurueckZurAuswahl: () => undefined });
    const menue = await oeffneMenue();
    await userEvent.click(within(menue).getByRole("menuitem", { name: "Stärke-Monitor öffnen …" }));
    expect(auf).toHaveBeenCalledWith("#monitor", "s1control-monitor");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(attrappe.rufeDerArt("bildschirmeAuflisten")).toHaveLength(0);
  });
});
