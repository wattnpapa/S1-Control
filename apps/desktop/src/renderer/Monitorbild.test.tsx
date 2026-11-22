/**
 * Die Steuerung des Monitors in jsdom (S4.1, KONZEPT-S4.md §4).
 *
 * Kontextmenü, Hover-Leiste, Tasten 1 bis 9 und 0, Pfeile, R, Leertaste und
 * Esc, der Wechsel alle 20 s und das Merken in den Geräteeinstellungen. Alles
 * liegt im Renderer — deshalb ist es hier prüfbar, und deshalb geht es in der
 * Web-Schale genauso wie in Electron. Wechsel je Sachgebiet, Listen und
 * Besucheransicht stehen in `Monitorwechsel.test.tsx`.
 */

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Monitorbild } from "./Monitorbild.js";
import { ANSICHT_TITEL, LEISTE_MS, WECHSEL_MS, ansichtAusTaste } from "./monitorSteuerung.js";
import { ansichtenDerGruppe, naechsteAnsicht, tasteDerAnsicht, vorherigeAnsicht } from "./monitorWechsel.js";
import { GRUND, bildname, gemerkt, monitorUmgebung, taste, umgebung, zeichne, zeige } from "./pruefhilfen/monitorbildhilfen.js";
import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { MONITOR_ANSICHTEN, MONITOR_GRUPPE_DER_ANSICHT } from "../kontrakt/index.js";

monitorUmgebung();

describe("Reine Helfer der Steuerung", () => {
  it("geht im Kreis durch alle Ansichten, blättert zurück und kennt die Tasten 1 bis 9 und 0", () => {
    const n = MONITOR_ANSICHTEN.length;
    MONITOR_ANSICHTEN.forEach((a, i) => {
      expect(naechsteAnsicht(a)).toBe(MONITOR_ANSICHTEN[(i + 1) % n]);
      expect(vorherigeAnsicht(a)).toBe(MONITOR_ANSICHTEN[(i - 1 + n) % n]);
    });
    expect(ansichtAusTaste("1")).toBe(MONITOR_ANSICHTEN[0]);
    expect(ansichtAusTaste("9")).toBe(MONITOR_ANSICHTEN[8]);
    expect(ansichtAusTaste("0")).toBe(MONITOR_ANSICHTEN[9]);
    expect(tasteDerAnsicht(MONITOR_ANSICHTEN[9] ?? "staerke")).toBe("0");
    expect(MONITOR_ANSICHTEN.slice(10).every((a) => tasteDerAnsicht(a) === undefined)).toBe(true);
    expect(ansichtAusTaste("x")).toBeUndefined();
    expect(ansichtAusTaste("12")).toBeUndefined();
  });

  it("ordnet die Ansichten nach Stab: Führung zuerst, FmZ zuletzt, Stärke vor den Tafeln", () => {
    expect(MONITOR_ANSICHTEN[0]).toBe("offen");
    expect(MONITOR_ANSICHTEN[1]).toBe("staerke");
    expect(MONITOR_GRUPPE_DER_ANSICHT[MONITOR_ANSICHTEN.at(-1) ?? "staerke"]).toBe("fmz");
  });
});

describe("Der Monitor mit Ansichten", () => {
  it("beginnt mit der Stärke und übernimmt das Theme des Geräts", async () => {
    await zeichne();
    expect(screen.getByLabelText("Lagemonitor")).toBeDefined();
    expect(document.documentElement.dataset["theme"]).toBe("nacht");
    expect(document.title).toBe("S1-Control — Stärke");
  });

  it("stellt die gemerkte Ansicht und den Wechsel wieder her", async () => {
    umgebung.attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "unterbringung", wechsel: true } });
    await zeichne();
    expect(screen.getByLabelText("Monitor Unterbringung")).toBeDefined();
    expect(screen.getByRole("list", { name: "Ansichten" }).querySelector(".naechste")?.getAttribute("title")).toBe("Bereiche · Schichten");
  });

  it("wählt mit den Tasten und merkt die Wahl im Gerät, nicht in der Akte", async () => {
    await zeichne();
    zeige("verpflegung");
    expect(screen.getByLabelText("Monitor Verpflegung")).toBeDefined();
    zeige("tafel");
    expect(screen.getByLabelText("Monitor Bereiche · Schichten")).toBeDefined();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(gemerkt()).toContainEqual({ ansicht: "tafel", wechsel: false });
    expect(umgebung.attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    // Theme und Share bleiben in den gemerkten Einstellungen stehen.
    expect(umgebung.attrappe.rufeDerArt("einstellungenSetzen")[0]?.einstellungen.theme).toBe("nacht");
  });

  it("öffnet per Rechtsklick ein eigenes Menü mit Haken an der aktiven Ansicht", async () => {
    await zeichne();
    act(() => {
      fireEvent.contextMenu(screen.getByLabelText("Lagemonitor"), { clientX: 100, clientY: 80 });
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
    zeige("verpflegung");
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
    zeige("verpflegung");
    expect(umgebung.attrappe.rufeDerArt("versorgungAnfordern")).toHaveLength(0);
    zeige("tafel");
    await act(async () => {
      await Promise.resolve();
    });
    expect(umgebung.attrappe.rufeDerArt("versorgungAnfordern")).toEqual([{ art: "versorgungAnfordern", akteId: "akte-1", stunden: 24 }]);
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

describe("Der Funkplan unter FmZ (F4)", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("wählt den Funkplan, holt sein Blatt und merkt die Wahl", async () => {
    await zeichne();
    expect(umgebung.attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(0);
    zeige("funkplan");
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    expect(screen.getByText("THW_OL_FUE")).toBeDefined();
    expect(umgebung.attrappe.rufeDerArt("funkplanAnfordern")).toEqual([{ art: "funkplanAnfordern", akteId: "akte-1" }]);
    expect(gemerkt()).toContainEqual({ ansicht: "funkplan", wechsel: false });
    expect(document.title).toBe("S1-Control — Funkplan");
  });

  it("holt die Tafel einmal je Minute nach, solange sie zu sehen ist", async () => {
    await zeichne();
    zeige("funkplan");
    await warte();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    await warte();
    expect(umgebung.attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
    zeige("staerke");
    act(() => {
      vi.advanceTimersByTime(180_000);
    });
    await warte();
    expect(umgebung.attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
  });

  it("holt die Tafel bei neuem Lagezeiger neu", async () => {
    umgebung.attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "funkplan", wechsel: false } });
    const { rerender } = render(<Monitorbild lagebild={BEISPIEL_LAGEBILD} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(umgebung.attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(1);
    rerender(<Monitorbild lagebild={{ ...BEISPIEL_LAGEBILD, lageZeiger: 13 }} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(umgebung.attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
  });

  it("steht im Menü unter FmZ, in der Leiste und bei den Punkten", async () => {
    await zeichne();
    taste("ContextMenu");
    const eintraege = within(screen.getByRole("group", { name: "Ansicht" })).getAllByRole("menuitemradio");
    expect(eintraege).toHaveLength(MONITOR_ANSICHTEN.length);
    const stelle = MONITOR_ANSICHTEN.indexOf("funkplan");
    const fmz = within(screen.getByRole("group", { name: "FmZ · Fernmelde" })).getAllByRole("menuitemradio");
    expect(fmz.map((e) => e.textContent)).toEqual(ansichtenDerGruppe("fmz").map((a) => `${ANSICHT_TITEL[a]}${tasteDerAnsicht(a) ?? ""}`));
    act(() => {
      fireEvent.click(eintraege[stelle] as Element);
    });
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    expect(screen.getByRole("button", { name: "Funkplan" }).getAttribute("aria-pressed")).toBe("true");
    const punkte = screen.getByRole("list", { name: "Ansichten" }).querySelectorAll("li");
    expect(punkte).toHaveLength(MONITOR_ANSICHTEN.length);
    expect(punkte[stelle]?.getAttribute("aria-current")).toBe("true");
    expect(punkte[stelle]?.className).toBe("aktiv gruppenanfang");
    expect(punkte[MONITOR_ANSICHTEN.indexOf("verpflegung")]?.className).toBe("gruppenanfang");
  });

  it("wechselt über alle Ansichten und kommt zur Stärke zurück", async () => {
    await zeichne();
    taste("r");
    const start = MONITOR_ANSICHTEN.indexOf("staerke");
    const folge = MONITOR_ANSICHTEN.map((_, i) => bildname(MONITOR_ANSICHTEN[(start + 1 + i) % MONITOR_ANSICHTEN.length] ?? "staerke"));
    for (const name of folge) {
      act(() => {
        vi.advanceTimersByTime(WECHSEL_MS);
      });
      await warte();
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });
});


describe("Die Stärketafeln des Sachgebiets 1", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("holt die Tafel erst mit den Abschnitten, zeigt sie und merkt die Wahl", async () => {
    await zeichne();
    expect(umgebung.attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(0);
    zeige("abschnitte");
    await warte();
    expect(screen.getByLabelText("Monitor Abschnitte")).toBeDefined();
    expect(screen.getByText("LK Friesland")).toBeDefined();
    expect(umgebung.attrappe.rufeDerArt("staerketafelAnfordern")).toEqual([{ art: "staerketafelAnfordern", akteId: "akte-1" }]);
    expect(gemerkt()).toContainEqual({ ansicht: "abschnitte", wechsel: false });
    expect(document.title).toBe("S1-Control — Abschnitte");
  });

  it("zeigt die Organisationen und holt bei neuem Lagezeiger neu", async () => {
    umgebung.attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "organisationen", wechsel: false } });
    const { rerender } = render(<Monitorbild lagebild={BEISPIEL_LAGEBILD} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(screen.getByLabelText("Monitor Organisationen")).toBeDefined();
    expect(screen.getByText("Feuerwehr")).toBeDefined();
    rerender(<Monitorbild lagebild={{ ...BEISPIEL_LAGEBILD, lageZeiger: 13 }} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(umgebung.attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(2);
  });

  it("zeigt die Kreuztabelle aus derselben Tafel", async () => {
    await zeichne();
    zeige("kreuz");
    await warte();
    expect(screen.getByLabelText("Monitor Abschnitt × Organisation")).toBeDefined();
    expect(umgebung.attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(1);
    expect(document.title).toBe("S1-Control — Abschnitt × Organisation");
  });
});
