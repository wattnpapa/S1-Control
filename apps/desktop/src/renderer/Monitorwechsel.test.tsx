/**
 * Der Monitor in jsdom: Wechsel je Sachgebiet, Pfeiltasten, die Listen
 * Warteschlange und Lageticker und die Besucheransicht.
 */

import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ANSICHT_TITEL, WECHSEL_MS } from "./monitorSteuerung.js";
import { GRUPPE_TITEL, ansichtenDerGruppe, belegteGruppen, modusKurz, naechsteAnsicht, naechsterModus, tasteDerAnsicht, vorherigeAnsicht, wechselmodi } from "./monitorWechsel.js";
import { GRUND, bildname, gemerkt, monitorUmgebung, taste, umgebung, zeichne, zeige } from "./pruefhilfen/monitorbildhilfen.js";

monitorUmgebung();

describe("Der Wechsel je Sachgebiet", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("zeigt die Leiste nach Sachgebiet gruppiert, nur belegte Gruppen", async () => {
    await zeichne();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    for (const gruppe of belegteGruppen()) {
      const block = screen.getByRole("group", { name: GRUPPE_TITEL[gruppe] });
      expect(within(block).getAllByRole("button").map((b) => b.textContent)).toEqual(ansichtenDerGruppe(gruppe).map((a) => ANSICHT_TITEL[a]));
    }
    const s4 = screen.getByRole("group", { name: "S4 · Versorgung" });
    expect(within(s4).getAllByRole("button").map((b) => b.textContent)).toEqual(["Verpflegung", "Nächste 24 h", "Unterbringung", "Bereiche · Schichten", "Sofortbedarf"]);
    expect(screen.getByRole("group", { name: "S2 · Lage" })).toBeDefined();
  });

  it("schaltet den Wechsel in der Leiste reihum durch alle angebotenen Modi und wieder aus", async () => {
    await zeichne();
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    const folge = wechselmodi().map((_, i, alle) => `Wechsel: ${modusKurz(alle[(i + 1) % alle.length] ?? "aus")}`);
    expect(folge.slice(0, 2)).toEqual(["Wechsel: alle", "Wechsel: S1"]);
    expect(naechsterModus("aus")).toBe("alle");
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
    const folge = ["Monitor Nächste 24 h", "Monitor Unterbringung", "Monitor Bereiche · Schichten", "Monitor Sofortbedarf", "Monitor Verpflegung"];
    for (const name of folge) {
      act(() => {
        vi.advanceTimersByTime(WECHSEL_MS);
      });
      await warte();
      expect(screen.getByLabelText(name)).toBeDefined();
    }
  });

  it("stellt einen gemerkten Wechsel S1 wieder her und nennt ihn im Fuß", async () => {
    const letzte = ansichtenDerGruppe("s1").at(-1) ?? "staerke";
    umgebung.attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: letzte, wechsel: true, wechselgruppe: "s1" } });
    await zeichne();
    await warte();
    expect(screen.getByText(/Wechsel S1 alle 20 s, weiter: Stärke/)).toBeDefined();
    act(() => {
      vi.advanceTimersByTime(WECHSEL_MS);
    });
    expect(screen.getByLabelText("Lagemonitor")).toBeDefined();
  });

  it("bietet nur Sachgebiete mit mehr als einer Ansicht zum Wechsel an", async () => {
    await zeichne();
    taste("ContextMenu");
    const wahl = within(screen.getByRole("group", { name: "Wechsel" })).getAllByRole("menuitemradio").map((w) => w.textContent);
    expect(wahl.slice(0, 2)).toEqual(["✓Kein Wechsel", "Alle AnsichtenR"]);
    expect(wahl).toContain("Nur S1 · Personal");
    expect(wahl).toContain("Nur S4 · Versorgung");
    expect(wahl).toContain("Nur FmZ · Fernmelde");
    expect(wahl).not.toContain("Nur S6 · IuK");
    expect(wahl).not.toContain("Nur Führung");
  });

  it("blättert mit Pfeil rechts und links durch alle Ansichten", async () => {
    await zeichne();
    taste("ArrowRight");
    expect(screen.getByLabelText(bildname(naechsteAnsicht("staerke")))).toBeDefined();
    taste("ArrowLeft");
    taste("ArrowLeft");
    expect(screen.getByLabelText(bildname(vorherigeAnsicht("staerke")))).toBeDefined();
  });
});

describe("Listen und Besucheransicht", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("holt die Warteschlange erst, wenn sie zu sehen ist, aus drei Sichten und ohne Inhalte", async () => {
    await zeichne();
    expect(umgebung.attrappe.rufeDerArt("nachrichtenAnfordern")).toHaveLength(0);
    zeige("warteschlange");
    await warte();
    expect(umgebung.attrappe.rufeDerArt("nachrichtenAnfordern").map((r) => r.sicht)).toEqual(["ldf", "fmz", "sichter"]);
    const tafel = screen.getByLabelText("Monitor Warteschlange");
    expect(tafel.textContent).toContain("KatS-Stab");
    expect(tafel.textContent).not.toContain("nicht an die Wand");
    expect(tafel.textContent).not.toContain("geheim");
  });

  it("zeigt den Lageticker ohne Stammdatenpflege", async () => {
    await zeichne();
    zeige("ticker");
    await warte();
    expect(umgebung.attrappe.rufeDerArt("tagebuchAnfordern")).toEqual([{ art: "tagebuchAnfordern", akteId: "akte-1", von: 0, anzahl: 40 }]);
    const tafel = screen.getByLabelText("Monitor Lageticker");
    expect(tafel.textContent).toContain("Status gesetzt");
    expect(tafel.textContent).not.toContain("Bemerkung geändert");
  });

  it("schaltet mit B die Besucheransicht: nur Kräftezahlen in Leiste und Punkten, gemerkt im Gerät", async () => {
    await zeichne();
    zeige("funkplan");
    taste("b");
    await warte();
    expect(screen.getByLabelText("Lagemonitor")).toBeDefined();
    expect(gemerkt()).toContainEqual({ ansicht: "staerke", wechsel: false, besucher: true });
    expect(screen.getByRole("list", { name: "Ansichten" }).querySelectorAll("li")).toHaveLength(5);
    act(() => {
      fireEvent.mouseMove(document.querySelector(".monitorrahmen") as Element);
    });
    expect(screen.queryByRole("button", { name: "Funkplan" })).toBeNull();
    expect(screen.getByRole("button", { name: /^Besucher: an/ })).toBeDefined();
    // Eine Taste außerhalb der Besucheransicht bleibt wirkungslos.
    taste(tasteDerAnsicht("offen") ?? "1");
    expect(screen.getByLabelText("Lagemonitor")).toBeDefined();
    taste("ArrowLeft");
    expect(screen.getByLabelText("Monitor Abschnitt × Organisation")).toBeDefined();
  });

  it("stellt eine gemerkte Besucheransicht wieder her und blendet das Menü entsprechend", async () => {
    umgebung.attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "funkplan", wechsel: false, besucher: true } });
    await zeichne();
    expect(screen.getByLabelText("Lagemonitor")).toBeDefined();
    taste("ContextMenu");
    expect(within(screen.getByRole("group", { name: "Ansicht" })).getAllByRole("menuitemradio")).toHaveLength(5);
    expect(screen.getByRole("menuitemcheckbox", { name: /Besucheransicht/ }).getAttribute("aria-checked")).toBe("true");
  });
});
