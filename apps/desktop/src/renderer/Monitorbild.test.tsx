/**
 * Die Steuerung des Monitors in jsdom (S4.1, KONZEPT-S4.md §4).
 *
 * Kontextmenü, Hover-Leiste, Tasten 1 bis 6, R, Leertaste und Esc, der
 * Wechsel alle 20 s und das Merken in den Geräteeinstellungen. Alles liegt
 * im Renderer — deshalb ist es hier prüfbar, und deshalb geht es in der
 * Web-Schale genauso wie in Electron.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Monitorbild } from "./Monitorbild.js";
import { LEISTE_MS, WECHSEL_MS, ansichtAusTaste, naechsteAnsicht } from "./monitorSteuerung.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { monitorFunkansicht } from "./pruefhilfen/monitorfunkbeispiel.js";
import { BEISPIEL_ANSICHT, BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import type { Einstellungen } from "../kontrakt/index.js";

let attrappe: Attrappe;
const GRUND: Einstellungen = { sharePfad: "/share", anzeigename: "Zelt", theme: "nacht" };

beforeEach(() => {
  vi.useFakeTimers();
  attrappe = baueAttrappe();
  attrappe.antwortet("einstellungenLesen", GRUND);
  attrappe.antwortet("versorgungAnfordern", BEISPIEL_ANSICHT);
  attrappe.antwortet("funkplanAnfordern", monitorFunkansicht());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.documentElement.dataset["theme"];
});

async function zeichne(lagebild = BEISPIEL_LAGEBILD): Promise<void> {
  render(<Monitorbild lagebild={lagebild} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
  // Die Einstellungen kommen über einen Ruf; erst danach steht die Wahl.
  await act(async () => {
    await Promise.resolve();
  });
}

function taste(key: string): void {
  act(() => {
    fireEvent.keyDown(window, { key });
  });
}

function gemerkt(): Einstellungen["monitor"][] {
  return attrappe.rufeDerArt("einstellungenSetzen").map((r) => r.einstellungen.monitor);
}

describe("Reine Helfer der Steuerung", () => {
  it("geht im Kreis durch die sechs Ansichten und kennt die Tasten 1 bis 6", () => {
    expect(naechsteAnsicht("staerke")).toBe("verpflegung");
    expect(naechsteAnsicht("tafel")).toBe("funkplan");
    expect(naechsteAnsicht("funkplan")).toBe("staerke");
    expect(ansichtAusTaste("3")).toBe("vorausschau");
    expect(ansichtAusTaste("6")).toBe("funkplan");
    expect(ansichtAusTaste("7")).toBeUndefined();
    expect(ansichtAusTaste("x")).toBeUndefined();
  });
});

describe("Der Monitor mit Ansichten", () => {
  it("beginnt mit der Stärke und übernimmt das Theme des Geräts", async () => {
    await zeichne();
    expect(screen.getByLabelText("Stärke-Monitor")).toBeDefined();
    expect(document.documentElement.dataset["theme"]).toBe("nacht");
    expect(document.title).toBe("S1-Control — Stärke");
  });

  it("stellt die gemerkte Ansicht und den Wechsel wieder her", async () => {
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "unterbringung", wechsel: true } });
    await zeichne();
    expect(screen.getByLabelText("Monitor Unterbringung")).toBeDefined();
    expect(screen.getByRole("list", { name: "Ansichten" }).querySelector(".naechste")?.getAttribute("title")).toBe("Bereiche · Schichten");
  });

  it("wählt mit den Tasten 1 bis 6 und merkt die Wahl im Gerät, nicht in der Akte", async () => {
    await zeichne();
    taste("2");
    expect(screen.getByLabelText("Monitor Verpflegung")).toBeDefined();
    taste("5");
    expect(screen.getByLabelText("Monitor Bereiche · Schichten")).toBeDefined();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(gemerkt()).toContainEqual({ ansicht: "tafel", wechsel: false });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    // Theme und Share bleiben in den gemerkten Einstellungen stehen.
    expect(attrappe.rufeDerArt("einstellungenSetzen")[0]?.einstellungen.theme).toBe("nacht");
  });

  it("öffnet per Rechtsklick ein eigenes Menü mit Haken an der aktiven Ansicht", async () => {
    await zeichne();
    act(() => {
      fireEvent.contextMenu(screen.getByLabelText("Stärke-Monitor"), { clientX: 100, clientY: 80 });
    });
    const menue = screen.getByRole("menu", { name: "Monitor" });
    expect(screen.getByRole("menuitemradio", { name: /Stärke/ }).getAttribute("aria-checked")).toBe("true");
    expect(menue.textContent).toContain("Ansichten wechseln alle 20 s");
    expect(menue.textContent).toContain("Monitor schließen");
    act(() => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: /Nächste 24 h/ }));
    });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByLabelText("Monitor Nächste 24 h")).toBeDefined();
  });

  it("schließt das Menü mit Esc und mit einem Klick daneben", async () => {
    await zeichne();
    taste("ContextMenu");
    expect(screen.getByRole("menu")).toBeDefined();
    taste("Escape");
    expect(screen.queryByRole("menu")).toBeNull();
    taste("ContextMenu");
    act(() => {
      fireEvent.click(document.querySelector(".monitormenuegrund") as Element);
    });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("wechselt mit R alle 20 s, hält mit der Leertaste und läuft danach weiter", async () => {
    await zeichne();
    taste("r");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS);
    });
    expect(screen.getByLabelText("Monitor Verpflegung")).toBeDefined();
    taste(" ");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS * 3);
    });
    expect(screen.getByLabelText("Monitor Verpflegung")).toBeDefined();
    taste(" ");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS);
    });
    expect(screen.getByLabelText("Monitor Nächste 24 h")).toBeDefined();
    taste("R");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS * 2);
    });
    expect(screen.getByLabelText("Monitor Nächste 24 h")).toBeDefined();
  });

  it("zeigt die Leiste bei Mausbewegung und blendet sie nach 3 s ohne Bewegung aus", async () => {
    await zeichne();
    expect(screen.queryByRole("navigation", { name: "Monitoransichten" })).toBeNull();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    const leiste = screen.getByRole("navigation", { name: "Monitoransichten" });
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Unterbringung" }));
    });
    expect(screen.getByLabelText("Monitor Unterbringung")).toBeDefined();
    expect(leiste.textContent).toContain("Wechsel: aus");
    act(() => {
      vi.advanceTimersByTime(LEISTE_MS + 10);
    });
    expect(screen.queryByRole("navigation", { name: "Monitoransichten" })).toBeNull();
  });

  it("holt die Versorgungsansicht nur für Tafel und Vorausschau", async () => {
    await zeichne();
    taste("2");
    expect(attrappe.rufeDerArt("versorgungAnfordern")).toHaveLength(0);
    taste("5");
    await act(async () => {
      await Promise.resolve();
    });
    expect(attrappe.rufeDerArt("versorgungAnfordern")).toEqual([{ art: "versorgungAnfordern", akteId: "akte-1", stunden: 24 }]);
  });

  it("schaltet mit F11 das Vollbild und schließt das Fenster aus dem Menü", async () => {
    const vollbild = vi.fn(() => Promise.resolve());
    document.documentElement.requestFullscreen = vollbild;
    const schliessen = vi.spyOn(window, "close").mockImplementation(() => undefined);
    await zeichne();
    taste("F11");
    expect(vollbild).toHaveBeenCalledTimes(1);
    taste("ContextMenu");
    act(() => {
      fireEvent.click(screen.getByRole("menuitem", { name: /Monitor schließen/ }));
    });
    expect(schliessen).toHaveBeenCalledTimes(1);
    schliessen.mockRestore();
  });
});

describe("Der Funkplan als sechste Ansicht (F4)", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("wählt den Funkplan mit Taste 6, holt sein Blatt und merkt die Wahl", async () => {
    await zeichne();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(0);
    taste("6");
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    expect(screen.getByText("THW_OL_FUE")).toBeDefined();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toEqual([{ art: "funkplanAnfordern", akteId: "akte-1" }]);
    expect(gemerkt()).toContainEqual({ ansicht: "funkplan", wechsel: false });
    expect(document.title).toBe("S1-Control — Funkplan");
  });

  it("holt die Tafel einmal je Minute nach, solange sie zu sehen ist", async () => {
    await zeichne();
    taste("6");
    await warte();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await warte();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
    taste("1");
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    await warte();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
  });

  it("holt die Tafel bei neuem Lagezeiger neu", async () => {
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "funkplan", wechsel: false } });
    const { rerender } = render(<Monitorbild lagebild={BEISPIEL_LAGEBILD} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(1);
    rerender(<Monitorbild lagebild={{ ...BEISPIEL_LAGEBILD, lageZeiger: 13 }} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
  });

  it("steht im Menü als sechster Eintrag mit Taste 6, in der Leiste und bei den Punkten", async () => {
    await zeichne();
    taste("ContextMenu");
    const eintraege = screen.getAllByRole("menuitemradio");
    expect(eintraege).toHaveLength(6);
    expect(eintraege[5]?.textContent).toBe("Funkplan6");
    act(() => {
      fireEvent.click(eintraege[5] as Element);
    });
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    expect(screen.getByRole("button", { name: "Funkplan" }).getAttribute("aria-pressed")).toBe("true");
    const punkte = screen.getByRole("list", { name: "Ansichten" }).querySelectorAll("li");
    expect(punkte).toHaveLength(6);
    expect(punkte[5]?.getAttribute("aria-current")).toBe("true");
  });

  it("wechselt über alle sechs Ansichten und kommt zur Stärke zurück", async () => {
    await zeichne();
    taste("r");
    const folge = ["Monitor Verpflegung", "Monitor Nächste 24 h", "Monitor Unterbringung", "Monitor Bereiche · Schichten", "Monitor Funkplan", "Stärke-Monitor"];
    for (const name of folge) {
      act(() => {
        vi.advanceTimersByTime(WECHSEL_MS);
      });
      await warte();
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });
});

