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
import { ANSICHT_TITEL, LEISTE_MS, WECHSEL_MS, ansichtAusTaste } from "./monitorSteuerung.js";
import { GRUPPE_TITEL, ansichtenDerGruppe, belegteGruppen, modusKurz, naechsteAnsicht, naechsterModus, tasteDerAnsicht, vorherigeAnsicht, wechselmodi } from "./monitorWechsel.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { monitorFunkansicht } from "./pruefhilfen/monitorfunkbeispiel.js";
import { BEISPIEL_STAERKETAFEL } from "./pruefhilfen/staerketafelbeispiel.js";
import { BEISPIEL_ANSICHT, BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { MONITOR_ANSICHTEN, type Einstellungen, type MonitorAnsicht } from "../kontrakt/index.js";

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

/** Wählt eine Ansicht über ihre Taste, ohne Taste (ab der elften) über das Menü. */
function zeige(ansicht: MonitorAnsicht): void {
  const t = tasteDerAnsicht(ansicht);
  if (t !== undefined) {
    taste(t);
    return;
  }
  taste("ContextMenu");
  act(() => {
    fireEvent.click(within(screen.getByRole("group", { name: "Ansicht" })).getByRole("menuitemradio", { name: new RegExp(`^${ANSICHT_TITEL[ansicht]}`) }));
  });
}

/** Wie sich eine Ansicht im Bild nennt: die Stärke ist der Lagemonitor. */
function bildname(ansicht: MonitorAnsicht): string {
  return ansicht === "staerke" ? "Lagemonitor" : `Monitor ${ANSICHT_TITEL[ansicht]}`;
}

function gemerkt(): Einstellungen["monitor"][] {
  return attrappe.rufeDerArt("einstellungenSetzen").map((r) => r.einstellungen.monitor);
}

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
    expect(MONITOR_ANSICHTEN.at(-1)).toBe("nachrichtenweg");
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
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "unterbringung", wechsel: true } });
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
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    // Theme und Share bleiben in den gemerkten Einstellungen stehen.
    expect(attrappe.rufeDerArt("einstellungenSetzen")[0]?.einstellungen.theme).toBe("nacht");
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
    expect(attrappe.rufeDerArt("versorgungAnfordern")).toHaveLength(0);
    zeige("tafel");
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

describe("Der Funkplan unter FmZ (F4)", () => {
  async function warte(): Promise<void> {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("wählt den Funkplan, holt sein Blatt und merkt die Wahl", async () => {
    await zeichne();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(0);
    zeige("funkplan");
    await warte();
    expect(screen.getByLabelText("Monitor Funkplan")).toBeDefined();
    expect(screen.getByText("THW_OL_FUE")).toBeDefined();
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toEqual([{ art: "funkplanAnfordern", akteId: "akte-1" }]);
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
    expect(attrappe.rufeDerArt("funkplanAnfordern")).toHaveLength(2);
    zeige("staerke");
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
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(0);
    zeige("abschnitte");
    await warte();
    expect(screen.getByLabelText("Monitor Abschnitte")).toBeDefined();
    expect(screen.getByText("LK Friesland")).toBeDefined();
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toEqual([{ art: "staerketafelAnfordern", akteId: "akte-1" }]);
    expect(gemerkt()).toContainEqual({ ansicht: "abschnitte", wechsel: false });
    expect(document.title).toBe("S1-Control — Abschnitte");
  });

  it("zeigt die Organisationen und holt bei neuem Lagezeiger neu", async () => {
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: "organisationen", wechsel: false } });
    const { rerender } = render(<Monitorbild lagebild={BEISPIEL_LAGEBILD} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(screen.getByLabelText("Monitor Organisationen")).toBeDefined();
    expect(screen.getByText("Feuerwehr")).toBeDefined();
    rerender(<Monitorbild lagebild={{ ...BEISPIEL_LAGEBILD, lageZeiger: 13 }} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
    await warte();
    expect(attrappe.rufeDerArt("staerketafelAnfordern")).toHaveLength(2);
  });

  it("zeigt die Kreuztabelle aus derselben Tafel", async () => {
    await zeichne();
    zeige("kreuz");
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
    expect(within(s4).getAllByRole("button").map((b) => b.textContent)).toEqual(["Verpflegung", "Nächste 24 h", "Unterbringung", "Bereiche · Schichten"]);
    expect(screen.queryByRole("group", { name: "S2 · Lage" })).toBeNull();
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
    const letzte = ansichtenDerGruppe("s1").at(-1) ?? "staerke";
    attrappe.antwortet("einstellungenLesen", { ...GRUND, monitor: { ansicht: letzte, wechsel: true, wechselgruppe: "s1" } });
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
