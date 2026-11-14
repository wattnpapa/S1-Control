/**
 * Die Stärketafeln des Sachgebiets 1 auf dem Monitor in jsdom.
 *
 * Geprüft wird, was an der Wand steht: je Zeile Fü / UFü / He = Gesamt, die
 * Gesamtzeile wie im Kopfband, Erwartete in eigener Spalte, Anmarsch
 * abgesetzt und eine ruhige Ansicht, solange keine Tafel da ist.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonitorAbschnitte, MonitorOrganisationen } from "./MonitorStaerketafeln.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";
import { BEISPIEL_STAERKETAFEL } from "./pruefhilfen/staerketafelbeispiel.js";
import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";

afterEach(cleanup);

const E: Ansichtseigenschaften = {
  lagebild: BEISPIEL_LAGEBILD,
  jetzt: BEISPIEL_JETZT,
  zeit: "140946NOV26",
  mass: { breite: 1920, hoehe: 1080 },
  staerketafel: BEISPIEL_STAERKETAFEL,
};

function zeile(bild: HTMLElement, name: string): string[] {
  const kopf = within(bild).getByRole("rowheader", { name });
  const tr = kopf.closest("tr");
  if (tr === null) throw new Error(`Keine Zeile für ${name}`);
  return [...tr.querySelectorAll("td")].map((td) => td.textContent);
}

describe("Monitor „Abschnitte“", () => {
  it("zeigt je Abschnitt Fü, UFü, He, Gesamt und Erwartete", () => {
    render(<MonitorAbschnitte {...E} />);
    const bild = screen.getByLabelText("Monitor Abschnitte");
    expect(within(bild).getByText(/Stärke je Abschnitt/)).toBeDefined();
    expect(zeile(bild, "LK Friesland")).toEqual(["20", "56", "360", "436", "+18"]);
    expect(zeile(bild, "LK Wittmund")).toEqual(["8", "22", "144", "174", "—"]);
  });

  it("rückt Unterabschnitte ein und setzt Gesamt und Anmarsch ab", () => {
    render(<MonitorAbschnitte {...E} />);
    const bild = screen.getByLabelText("Monitor Abschnitte");
    expect(within(bild).getByText("Strand Schillig").style.paddingLeft).not.toBe("");
    expect(within(bild).getByRole("rowheader", { name: "Gesamt" }).closest("tr")?.className).toBe("summe");
    expect(zeile(bild, "Gesamt")).toEqual(["46", "130", "835", "1011", "+66"]);
    expect(within(bild).getByText("Angefordert / Anmarsch").closest("tr")?.className).toBe("anmarsch");
    expect(within(bild).getByText(/Erwartete nicht in der Summe/)).toBeDefined();
  });

  it("lässt die Anmarschzeile weg, wenn niemand angefordert ist", () => {
    const tafel = { ...BEISPIEL_STAERKETAFEL.tafel, anmarsch: { ...BEISPIEL_STAERKETAFEL.tafel.anmarsch, gesamt: 0 } };
    render(<MonitorAbschnitte {...E} staerketafel={{ lageZeiger: 1, tafel }} />);
    expect(screen.queryByText("Angefordert / Anmarsch")).toBeNull();
  });

  it("bleibt ruhig, solange keine Tafel da ist", () => {
    render(<MonitorAbschnitte {...E} staerketafel={undefined} />);
    expect(screen.getByText("Noch keine Stärke")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("Monitor „Organisationen“", () => {
  it("zeigt je Organisation die Ist-Stärke und Erwartete, ohne Anmarschzeile", () => {
    render(<MonitorOrganisationen {...E} />);
    const bild = screen.getByLabelText("Monitor Organisationen");
    expect(within(bild).getByText(/Stärke je Organisation/)).toBeDefined();
    expect(zeile(bild, "DRK")).toEqual(["8", "20", "115", "143", "+48"]);
    expect(zeile(bild, "Gesamt")).toEqual(["46", "130", "835", "1011", "+66"]);
    expect(within(bild).queryByText("Angefordert / Anmarsch")).toBeNull();
  });

  it("nennt eine leere Organisationsliste ausdrücklich", () => {
    render(<MonitorOrganisationen {...E} staerketafel={{ lageZeiger: 1, tafel: { ...BEISPIEL_STAERKETAFEL.tafel, organisationen: [] } }} />);
    expect(screen.getByText("Noch keine Kräfte erfasst")).toBeDefined();
  });

  it("verkleinert die Schrift im kleinen Fenster", () => {
    render(<MonitorOrganisationen {...E} />);
    const gross = Number.parseInt(screen.getByRole("table").style.fontSize, 10);
    cleanup();
    render(<MonitorOrganisationen {...E} mass={{ breite: 960, hoehe: 540 }} />);
    const klein = Number.parseInt(screen.getByRole("table").style.fontSize, 10);
    expect(klein).toBeLessThan(gross);
  });
});
