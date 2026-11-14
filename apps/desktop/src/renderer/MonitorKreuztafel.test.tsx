/**
 * Die Kreuztabelle Abschnitt × Organisation auf dem Monitor in jsdom:
 * Zellen aus `kreuz`, leere Zellen als Strich, Gesamtzeile aus den
 * Organisationen, Erwartete abgesetzt und nie in der Summe.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonitorKreuztafel } from "./MonitorKreuztafel.js";
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

function zeile(name: string): string[] {
  const bild = screen.getByLabelText("Monitor Abschnitt × Organisation");
  const tr = within(bild).getByRole("rowheader", { name }).closest("tr");
  if (tr === null) throw new Error(`Keine Zeile für ${name}`);
  return [...tr.querySelectorAll("td")].map((td) => td.textContent);
}

describe("Monitor „Abschnitt × Organisation“", () => {
  it("hat je Organisation eine Spalte und je Abschnitt eine Zeile", () => {
    render(<MonitorKreuztafel {...E} />);
    const kopf = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(kopf).toEqual(["Abschnitt", "THW", "Feuerwehr", "DRK", "Gesamt"]);
    expect(zeile("LK Friesland")).toEqual(["200", "150", "86", "436"]);
    expect(zeile("LK Wittmund")).toEqual(["—", "174", "—", "174"]);
  });

  it("führt Gesamt je Organisation und die Erwarteten abgesetzt", () => {
    render(<MonitorKreuztafel {...E} />);
    expect(zeile("Gesamt")).toEqual(["380", "488", "143", "1011"]);
    expect(zeile("Erwartet")).toEqual(["+18", "—", "+48", "+66"]);
    expect(screen.getByRole("rowheader", { name: "Erwartet" }).closest("tr")?.className).toBe("anmarsch");
  });

  it("bleibt ruhig, solange keine Tafel da ist", () => {
    render(<MonitorKreuztafel {...E} staerketafel={undefined} />);
    expect(screen.getByText("Noch keine Stärke")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
