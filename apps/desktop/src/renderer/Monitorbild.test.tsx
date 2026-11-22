/**
 * Die Steuerung des Monitors in jsdom (S4.1, KONZEPT-S4.md §4).
 *
 * Kontextmenü, Hover-Leiste, Tasten 1 bis 9, R, Leertaste und Esc, der
 * Wechsel alle 20 s (alle oder je Sachgebiet) und das Merken in den
 * Geräteeinstellungen. Alles liegt
 * im Renderer — deshalb ist es hier prüfbar, und deshalb geht es in der
 * Web-Schale genauso wie in Electron.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Monitorbild } from "./Monitorbild.js";
import { LEISTE_MS, WECHSEL_MS, ansichtAusTaste } from "./monitorSteuerung.js";
import { naechsteAnsicht } from "./monitorWechsel.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { monitorFunkansicht } from "./pruefhilfen/monitorfunkbeispiel.js";
import { BEISPIEL_STAERKETAFEL } from "./pruefhilfen/staerketafelbeispiel.js";
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
  attrappe.antwortet("staerketafelAnfordern", BEISPIEL_STAERKETAFEL);
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
  it("geht im Kreis durch die neun Ansichten und kennt die Tasten 1 bis 9 nach Sachgebiet", () => {
    expect(naechsteAnsicht("staerke")).toBe("abschnitte");
    expect(naechsteAnsicht("kreuz")).toBe("verpflegung");
    expect(naechsteAnsicht("tafel")).toBe("funkplan");
    expect(naechsteAnsicht("funkplan")).toBe("staerke");
    expect(ansichtAusTaste("1")).toBe("staerke");
    expect(ansichtAusTaste("2")).toBe("abschnitte");
    expect(ansichtAusTaste("3")).toBe("organisationen");
    expect(ansichtAusTaste("4")).toBe("kreuz");
    expect(ansichtAusTaste("5")).toBe("verpflegung");
    expect(ansichtAusTaste("6")).toBe("vorausschau");
    expect(ansichtAusTaste("8")).toBe("tafel");
    expect(ansichtAusTaste("9")).toBe("funkplan");
    expect(ansichtAusTaste("0")).toBeUndefined();
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

  it("wählt mit den Tasten und merkt die Wahl im Gerät, nicht in der Akte", async () => {
    await zeichne();
    taste("5");
    expect(screen.getByLabelText("Monitor Verpflegung")).toBeDefined();
    taste("8");
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
    taste("5");
    taste("r");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS);
    });
    expect(screen.getByLabelText("Monitor Nächste 24 h")).toBeDefined();
    taste(" ");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS * 3);
    });
    expect(screen.getByLabelText("Monitor Nächste 24 h")).toBeDefined();
    taste(" ");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS);
    });
    expect(screen.getByLabelText("Monitor Unterbringung")).toBeDefined();
    taste("R");
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS * 2);
    });
    expect(screen.getByLabelText("Monitor Unterbringung")).toBeDefined();
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
    taste("5");
    expect(attrappe.rufeDerArt("versorgungAnfordern")).toHaveLength(0);
    taste("8");
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

describe("Der Funkplan als neunte Ansicht unter FmZ (F4)", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("wählt den Funkplan mit Taste 9, holt sein Blatt und merkt die Wahl", async () => {
    await zeichne();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(0);
    taste("9");
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    expect(screen.getByText("THW_OL_FUE")).toBeDefined();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toEqual([{ art: "funkplanAnfordern", akteId: "akte-1" }]);
    expect(gemerkt()).toContainEqual({ ansicht: "funkplan", wechsel: false });
    expect(document.title).toBe("S1-Control — Funkplan");
  });

  it("holt die Tafel einmal je Minute nach, solange sie zu sehen ist", async () => {
    await zeichne();
    taste("9");
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

  it("steht im Menü unter FmZ als neunter Eintrag mit Taste 9, in der Leiste und bei den Punkten", async () => {
    await zeichne();
    taste("ContextMenu");
    const eintraege = within(screen.getByRole("group", { name: "Ansicht" })).getAllByRole("menuitemradio");
    expect(eintraege).toHaveLength(9);
    expect(eintraege[2]?.textContent).toBe("Organisationen3");
    expect(eintraege[8]?.textContent).toBe("Funkplan9");
    expect(within(screen.getByRole("group", { name: "FmZ · Fernmelde" })).getAllByRole("menuitemradio")).toHaveLength(1);
    act(() => {
      fireEvent.click(eintraege[8] as Element);
    });
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    expect(screen.getByRole("button", { name: "Funkplan" }).getAttribute("aria-pressed")).toBe("true");
    const punkte = screen.getByRole("list", { name: "Ansichten" }).querySelectorAll("li");
    expect(punkte).toHaveLength(9);
    expect(punkte[8]?.getAttribute("aria-current")).toBe("true");
    expect(punkte[4]?.className).toBe("gruppenanfang");
    expect(punkte[8]?.className).toBe("aktiv gruppenanfang");
  });

  it("wechselt über alle neun Ansichten und kommt zur Stärke zurück", async () => {
    await zeichne();
    taste("r");
    const folge = [
      "Monitor Abschnitte",
      "Monitor Organisationen",
      "Monitor Abschnitt × Organisation",
      "Monitor Verpflegung",
      "Monitor Nächste 24 h",
      "Monitor Unterbringung",
      "Monitor Bereiche · Schichten",
      "Monitor Funkplan",
      "Stärke-Monitor",
    ];
    for (const name of folge) {
      act(() => {
        vi.advanceTimersByTime(WECHSEL_MS);
      });
      await warte();
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });
});


describe("Die Stärketafeln des Sachgebiets 1 (Tasten 2 bis 4)", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("holt die Tafel erst bei Taste 2, zeigt die Abschnitte und merkt die Wahl", async () => {
    await zeichne();
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(0);
    taste("2");
    await warte();
    expect(screen.getByLabelText("Monitor Abschnitte")).toBeDefined();
    expect(screen.getByText("LK Friesland")).toBeDefined();
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toEqual([{ art: "staerketafelAnfordern", akteId: "akte-1" }]);
    expect(gemerkt()).toContainEqual({ ansicht: "abschnitte", wechsel: false });
    expect(document.title).toBe("S1-Control — Abschnitte");
  });

  it("zeigt mit Taste 3 die Organisationen und holt bei neuem Lagezeiger neu", async () => {
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "organisationen", wechsel: false } });
    const { rerender } = render(<Monitorbild lagebild={BEISPIEL_LAGEBILD} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(screen.getByLabelText("Monitor Organisationen")).toBeDefined();
    expect(screen.getByText("Feuerwehr")).toBeDefined();
    rerender(<Monitorbild lagebild={{ ...BEISPIEL_LAGEBILD, lageZeiger: 13 }} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(2);
  });

  it("zeigt mit Taste 4 die Kreuztabelle aus derselben Tafel", async () => {
    await zeichne();
    taste("4");
    await warte();
    expect(screen.getByLabelText("Monitor Abschnitt × Organisation")).toBeDefined();
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(1);
    expect(document.title).toBe("S1-Control — Abschnitt × Organisation");
  });
});

describe("Der Wechsel je Sachgebiet", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("zeigt die Leiste nach Sachgebiet gruppiert", async () => {
    await zeichne();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    const s1 = screen.getByRole("group", { name: "S1 · Personal" });
    expect(within(s1).getAllByRole("button").map((b) => b.textContent)).toEqual(["Stärke", "Abschnitte", "Organisationen", "Abschnitt × Organisation"]);
    const s4 = screen.getByRole("group", { name: "S4 · Versorgung" });
    expect(within(s4).getAllByRole("button").map((b) => b.textContent)).toEqual(["Verpflegung", "Nächste 24 h", "Unterbringung", "Bereiche · Schichten"]);
    expect(within(screen.getByRole("group", { name: "FmZ · Fernmelde" })).getAllByRole("button").map((b) => b.textContent)).toEqual(["Funkplan"]);
  });

  it("schaltet den Wechsel in der Leiste reihum: aus, alle, S1, S4 und wieder aus", async () => {
    await zeichne();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    const folge = ["Wechsel: alle", "Wechsel: S1", "Wechsel: S4", "Wechsel: aus"];
    for (const text of folge) {
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: /^Wechsel:/ }));
      });
      expect(screen.getByRole("button", { name: /^Wechsel:/ }).textContent).toBe(text);
    }
  });

  it("springt beim Wechsel S4 in das Sachgebiet, bleibt darin und merkt die Gruppe", async () => {
    await zeichne();
    taste("ContextMenu");
    act(() => {
      fireEvent.click(screen.getByRole("menuitemradio", { name: /Nur S4 · Versorgung/ }));
    });
    await warte();
    expect(screen.getByLabelText("Monitor Verpflegung")).toBeDefined();
    expect(gemerkt()).toContainEqual({ ansicht: "verpflegung", wechsel: true, wechselgruppe: "s4" });
    const folge = ["Monitor Nächste 24 h", "Monitor Unterbringung", "Monitor Bereiche · Schichten", "Monitor Verpflegung"];
    for (const name of folge) {
      act(() => {
        vi.advanceTimersByTime(WECHSEL_MS);
      });
      await warte();
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });

  it("stellt einen gemerkten Wechsel S1 wieder her und nennt ihn im Fuß", async () => {
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "kreuz", wechsel: true, wechselgruppe: "s1" } });
    await zeichne();
    await warte();
    expect(screen.getByText(/Wechsel S1 alle 20 s, weiter: Stärke/)).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS);
    });
    expect(screen.getByLabelText("Stärke-Monitor")).toBeDefined();
  });

  it("bietet die FmZ mit nur einer Ansicht nicht zum Wechsel an", async () => {
    await zeichne();
    taste("ContextMenu");
    const wahl = within(screen.getByRole("group", { name: "Wechsel" })).getAllByRole("menuitemradio");
    expect(wahl.map((w) => w.textContent)).toEqual(["✓Kein Wechsel", "Alle AnsichtenR", "Nur S1 · Personal", "Nur S4 · Versorgung"]);
  });
});
