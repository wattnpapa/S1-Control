/**
 * S5 bleibt ohne Kästchen, nur Freitext (Sichter P3-3, Entscheidung 12 vom
 * 2026-11-17, Lehrunterlage: „S5 wie im Vordruck“): Das Raster hat keine Zeile
 * S5; wer S5 braucht, trägt sie unter „Weitere Stelle“ ein, und sie steht
 * danach als freie Zeile im Verteiler.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Verteilermatrix } from "./Verteilerraster.js";

afterEach(cleanup);

describe("S5 im Verteilerraster", () => {
  it("hat keine feste Zeile; „Weitere Stelle“ nimmt S5 als Freitext auf", () => {
    const aufAenderung = vi.fn();
    render(<Verteilermatrix verteiler={[]} aufAenderung={aufAenderung} />);
    expect(screen.queryByRole("group", { name: "S5" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Weitere Stelle"), { target: { value: "S5" } });
    fireEvent.click(screen.getByRole("button", { name: "Dazu" }));
    expect(aufAenderung).toHaveBeenCalledWith([{ stelle: "S5", kopie: "BLAU" }]);
  });

  it("zeigt eine eingetragene S5 als freie Zeile mit Kopiewahl", () => {
    render(<Verteilermatrix verteiler={[{ stelle: "S5", kopie: "BLAU" }]} aufAenderung={vi.fn()} />);
    expect(screen.getByRole("group", { name: "S5" })).toBeDefined();
  });
});
