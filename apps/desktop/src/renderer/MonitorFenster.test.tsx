/**
 * Prüffälle zum Zweitfenster des Stärke-Monitors (M3.5).
 *
 * Das **Bild** prüft `Monitor.test.tsx`; hier steht die Verdrahtung: dass der
 * Monitor die Akte der ersten Standmitteilung übernimmt, dass er Deltas
 * aufträgt und dass er bei einer Lücke den vollen Stand nachfordert, statt
 * eine falsche Zahl an die Wand zu werfen.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { MonitorFenster } from "./MonitorFenster.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import type { Lagebild, Mitteilung } from "../kontrakt/index.js";

afterEach(cleanup);

const LAGEBILD: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser Weser-Ems",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T08:00:22.000Z",
  letzterShareKontakt: "2026-09-10T08:00:29.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 3,
  einheiten: 12,
  gesamtstaerke: { fuehrer: 2, unterfuehrer: 5, mannschaft: 40 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 12,
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
});

function stand(folge: number, teil: Partial<Mitteilung> = {}): Mitteilung {
  return { art: "stand", akteId: "akte-1", folge, ...teil } as Mitteilung;
}

describe("Das Monitorfenster", () => {
  it("zeigt vor der ersten Mitteilung keine erfundene Zahl", () => {
    render(<MonitorFenster />);
    expect(screen.getByLabelText("Stärke-Monitor")).toBeDefined();
    // Eine „0/0/0 = 0“ ohne Akte wäre eine Behauptung über die Lage, die
    // niemand deckt.
    expect(screen.queryByText(/2\/5\/40/)).toBeNull();
  });

  it("übernimmt die Akte der ersten Standmitteilung und zeigt die Gesamtstärke", async () => {
    render(<MonitorFenster />);
    act(() => {
      attrappe.schiebe(stand(0, { voll: LAGEBILD }));
    });
    await waitFor(() => {
      expect(screen.getByText(/2\/5\/40/)).toBeDefined();
    });
  });

  it("trägt ein Delta auf das Bild auf", async () => {
    render(<MonitorFenster />);
    act(() => {
      attrappe.schiebe(stand(0, { voll: LAGEBILD }));
      attrappe.schiebe(stand(1, { geaendert: { gesamtstaerke: { fuehrer: 3, unterfuehrer: 5, mannschaft: 41 } } }));
    });
    await waitFor(() => {
      expect(screen.getByText(/3\/5\/41/)).toBeDefined();
    });
  });

  it("fordert bei einer Lücke den vollen Stand an, statt weiterzuzeichnen", async () => {
    render(<MonitorFenster />);
    act(() => {
      attrappe.schiebe(stand(0, { voll: LAGEBILD }));
      attrappe.schiebe(stand(4, { geaendert: { einheiten: 99 } }));
    });
    await waitFor(() => {
      expect(attrappe.rufeDerArt("standAnfordern")).toHaveLength(1);
    });
    // Auf einem Monitor an der Wand ist eine falsche Zahl schlimmer als eine
    // alte: Das bisherige Bild bleibt stehen.
    expect(screen.getByText(/2\/5\/40/)).toBeDefined();
  });

  it("räumt das Bild ab, wenn die Akte sich schließt", async () => {
    render(<MonitorFenster />);
    act(() => {
      attrappe.schiebe(stand(0, { voll: LAGEBILD }));
      attrappe.schiebe({ art: "akteGeschlossen", akteId: "akte-1", meldung: "Der Ordner ist fort." });
    });
    await waitFor(() => {
      expect(screen.queryByText(/2\/5\/40/)).toBeNull();
    });
  });

  it("bleibt bei der Akte, die er übernommen hat", async () => {
    render(<MonitorFenster />);
    act(() => {
      attrappe.schiebe(stand(0, { voll: LAGEBILD }));
      attrappe.schiebe({
        art: "stand",
        akteId: "akte-2",
        folge: 0,
        voll: { ...LAGEBILD, gesamtstaerke: { fuehrer: 9, unterfuehrer: 9, mannschaft: 9 } },
      } as Mitteilung);
    });
    await waitFor(() => {
      expect(screen.getByText(/2\/5\/40/)).toBeDefined();
    });
    expect(screen.queryByText(/9\/9\/9/)).toBeNull();
  });
});
