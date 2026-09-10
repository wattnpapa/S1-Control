/**
 * Das Stärkeband — fünf Kacheln, und die letzte ist die Summe.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Staerkeband } from "./Staerkeband.js";
import type { Lagebild } from "../kontrakt/index.js";

afterEach(cleanup);

const LAGEBILD: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T12:43:00.000Z",
  letzterShareKontakt: "2026-09-10T12:43:00.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 6,
  einheiten: 42,
  gesamtstaerke: { fuehrer: 24, unterfuehrer: 61, mannschaft: 183 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 0,
};

describe("Staerkeband", () => {
  it("zeigt Einheiten, Gliederung und Summe", () => {
    render(<Staerkeband lagebild={LAGEBILD} />);
    const band = screen.getByLabelText("Stärkeband");
    expect(band.textContent).toBe("42Einheiten24Führer61Unterf.183Mannsch.268Gesamt");
  });

  it("rechnet die Summe und übernimmt sie nicht aus dem Lagebild", () => {
    render(
      <Staerkeband
        lagebild={{ ...LAGEBILD, gesamtstaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 20 } }}
      />,
    );
    expect(screen.getByText("23")).toBeDefined();
  });
});
