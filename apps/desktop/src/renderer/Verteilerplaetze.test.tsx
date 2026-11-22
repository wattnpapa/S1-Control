/**
 * Stab-Review FW-B1: Mehrere Fachberater teilen eine Stelle. Die Matrix bietet
 * jetzt die freien Stellen der besetzten Arbeitsplätze an und warnt, wenn
 * „Fachberater“ an mehreren Plätzen besetzt ist.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { Verteilermatrix, besetzteFreieStellen } from "./Verteilerraster.js";

afterEach(cleanup);

const PLAETZE = [
  { veraltet: false, stellen: ["FACHBERATER", "FaBe FW"] },
  { veraltet: false, stellen: ["FACHBERATER", "FaBe San"] },
  { veraltet: false, stellen: ["SICHTER", "FM1"] },
  { veraltet: true, stellen: ["VB Bw"] },
];

describe("Die Verteilermatrix und die besetzten Arbeitsplätze", () => {
  it("nennt die freien Stellen lebender Plätze, ohne Fernmeldebetrieb und ohne fortgegangene", () => {
    expect(besetzteFreieStellen(PLAETZE)).toEqual(["FaBe FW", "FaBe San"]);
  });

  it("bietet sie als Zeilen an und warnt, wenn „Fachberater“ geteilt gewählt ist", () => {
    useLaden.setState({ lagebild: { peers: PLAETZE, sitzung: { stellen: ["SICHTER"], handzeichen: "Si" } } as unknown as Lagebild });
    render(<Verteilermatrix verteiler={[{ stelle: "S2", kopie: "ROT" }, { stelle: "FACHBERATER", kopie: "GRUEN" }]} aufAenderung={vi.fn()} />);
    const matrix = screen.getByRole("group", { name: "Verteiler" });
    expect(within(matrix).getAllByText("FaBe FW").length).toBeGreaterThan(0);
    expect(within(matrix).getAllByText("FaBe San").length).toBeGreaterThan(0);
    expect(within(matrix).getByRole("note").textContent).toContain("an 2 Arbeitsplätzen besetzt");
  });
});
