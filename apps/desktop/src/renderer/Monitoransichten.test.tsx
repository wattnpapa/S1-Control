/**
 * Die Versorgungsansichten des Monitors in jsdom (S4.1) — je Ansicht.
 *
 * Geprüft wird, was an der Wand steht: die große Zahl, die Beschriftung,
 * der Anmarsch daneben und nie darin, die Zählregel im Fuß und dass eine
 * Ansicht ohne Zahlen ruhig bleibt, statt null zu behaupten.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonitorTafel, MonitorUnterbringung, MonitorVerpflegung, MonitorVorausschau, type Ansichtseigenschaften } from "./Monitoransichten.js";
import { BEISPIEL_ANSICHT, BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";

afterEach(cleanup);

const E: Ansichtseigenschaften = {
  lagebild: BEISPIEL_LAGEBILD,
  jetzt: BEISPIEL_JETZT,
  zeit: "101443SEP26",
  mass: { breite: 960, hoehe: 540 },
  ansicht: BEISPIEL_ANSICHT,
};

const OHNE = { ...E, lagebild: { ...BEISPIEL_LAGEBILD, versorgung: undefined }, ansicht: undefined };

describe("Monitor „Verpflegung“ (4a)", () => {
  it("nennt die nächste Mahlzeit, die Portionen groß und den Anmarsch getrennt", () => {
    render(<MonitorVerpflegung {...E} />);
    const bild = screen.getByLabelText("Monitor Verpflegung");
    expect(within(bild).getByText("Abendessen 1800")).toBeDefined();
    expect(within(bild).getByText(/in 3 h 17 min/)).toBeDefined();
    expect(within(bild).getByText("268").style.fontSize).toMatch(/px$/);
    expect(within(bild).getByText(/31 vegetarisch · 6 vegan/)).toBeDefined();
    expect(within(bild).getByText("Anmarsch +24 nicht enthalten").className).toContain("monitorwarn");
    expect(within(bild).getByText(/Zählung: alle erfassten Einheiten/)).toBeDefined();
  });

  it("wächst mit dem Fenster und bleibt in den Grenzen von schriftgroesse", () => {
    render(<MonitorVerpflegung {...E} mass={{ breite: 1920, hoehe: 1080 }} />);
    const gross = Number.parseInt(screen.getByText("268").style.fontSize, 10);
    cleanup();
    render(<MonitorVerpflegung {...E} />);
    const klein = Number.parseInt(screen.getByText("268").style.fontSize, 10);
    expect(gross).toBeGreaterThan(klein);
    expect(gross).toBeLessThanOrEqual(420);
  });

  it("bleibt ohne Versorgungszahlen ruhig", () => {
    render(<MonitorVerpflegung {...OHNE} />);
    expect(screen.getByText("Noch keine Versorgungszahlen")).toBeDefined();
  });
});

describe("Monitor „Nächste 24 h“ (4h)", () => {
  it("zeigt eine Zeile je Mahlzeit mit Bestand, Zugang und Abgang, die nächste fett", () => {
    render(<MonitorVorausschau {...E} />);
    const zeilen = within(screen.getByRole("table")).getAllByRole("row");
    expect(zeilen).toHaveLength(5);
    expect(zeilen[1]?.className).toBe("naechste");
    expect(within(zeilen[1] as HTMLElement).getByText("292")).toBeDefined();
    expect(within(zeilen[3] as HTMLElement).getByText("−14")).toBeDefined();
    expect(screen.getByText(/2\. Zug FF Hude \+24 ab 1600/)).toBeDefined();
    expect(screen.getByText(/FGr WP Vechta \+14 ohne Zeit/)).toBeDefined();
  });

  it("bleibt ohne Mahlzeiten ruhig", () => {
    render(<MonitorVorausschau {...OHNE} />);
    expect(screen.getByText("Noch keine Versorgungszahlen")).toBeDefined();
  });
});

describe("Monitor „Unterbringung“ (4b)", () => {
  it("nennt die Betten der Nacht groß und m/w/d darunter", () => {
    render(<MonitorUnterbringung {...E} />);
    expect(screen.getByText(/Unterbringung · Nacht 10\.\/11\. SEP/)).toBeDefined();
    expect(screen.getByText("142")).toBeDefined();
    expect(screen.getByText("m 118 · w 22 · d 2")).toBeDefined();
    // Belegt/frei kommen erst mit den Unterkünften (S4.2).
    expect(screen.queryByText(/belegt/)).toBeNull();
  });

  it("zeigt belegt, frei und ohne Zuweisung in Bernstein, sobald es Unterkünfte gibt", () => {
    const versorgung = { ...BEISPIEL_LAGEBILD.versorgung!, belegt: 124, frei: 220, ohneZuweisung: 18, ohneZuweisungEinheiten: 2 };
    render(<MonitorUnterbringung {...E} lagebild={{ ...BEISPIEL_LAGEBILD, versorgung }} />);
    expect(screen.getByText(/belegt 124 · frei 220/)).toBeDefined();
    expect(screen.getByText(/ohne Zuweisung 18 \(2 Einheiten\)/).className).toContain("monitorwarn");
  });
});

describe("Monitor „Bereiche · Schichten“ (4c)", () => {
  it("ist das Logistikblatt in groß, Anmarsch abgesetzt und ohne leere Schichtspalten", () => {
    render(<MonitorTafel {...E} fusszusatz=" · Wechsel alle 20 s, weiter: Stärke" />);
    const tafel = screen.getByRole("table");
    expect(within(tafel).getByText("EA 1 Deich Nord")).toBeDefined();
    expect(within(tafel).getByText("Angefordert / Anmarsch").closest("tr")?.className).toBe("anmarsch");
    expect(within(tafel).queryByText("Früh")).toBeNull();
    expect(within(tafel).getByText("Tag")).toBeDefined();
    expect(screen.getByText(/weiter: Stärke/)).toBeDefined();
  });

  it("wartet ohne Versorgungsansicht ruhig", () => {
    render(<MonitorTafel {...OHNE} />);
    expect(screen.getByText("Noch keine Versorgungszahlen")).toBeDefined();
  });
});
