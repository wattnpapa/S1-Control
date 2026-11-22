/**
 * „Status und Einbuchen …“ (Stab-Review FüGeh S1 FA-FG-1, FA-FG-2): mehrere
 * Einheiten in einem Zug; je Einheit nur, was sich ändert.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Tabellenzeile } from "@s1/domaene";

import { einbuchungsschritte } from "../kontrakt/einbuchungsschritte.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { Statusmaske } from "./Statusmaske.js";

afterEach(cleanup);

function zeile(id: string, status: string, eingetroffen?: string): Tabellenzeile {
  return {
    einheitId: id, abschnittId: "ANF", abschnittName: "Angefordert", anzeige: `Einheit ${id}`,
    zellen: {
      status: { wert: status },
      schicht: { wert: "TAG" },
      ...(eingetroffen === undefined ? {} : { eingetroffenAm: { wert: eingetroffen } }),
    },
  } as unknown as Tabellenzeile;
}

let attrappe: Attrappe;
beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-1" });
  useLaden.setState({
    akteId: "akte-1",
    baum: { lageZeiger: 1, baum: [{ id: "EA1", name: "EA 1 Deich", typ: "EINSATZORT", tiefe: 0, kinder: [] }] } as never,
    fehler: undefined,
    hinweise: [],
  });
});

describe("Status und Einbuchen", () => {
  it("bucht zwei Einheiten in einem Zug ein: Abschnitt, Status, Schicht, Eintreffzeit wo sie fehlt", async () => {
    render(<Statusmaske gewaehlte={[zeile("U1", "ANMARSCH"), zeile("U2", "EINSATZBEREIT", "2026-11-22T06:00:00.000Z")]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: /Status und Einbuchen · 2 Einheiten/ });
    fireEvent.change(within(maske).getByLabelText("Abschnitt"), { target: { value: "EA1" } });
    fireEvent.change(within(maske).getByLabelText("Schicht"), { target: { value: "NACHT" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(6);
    });
    const typen = attrappe.rufeDerArt("bedienen").map((r) => `${String((r.entwurf.nutzlast as { einheitId: string }).einheitId)}:${r.entwurf.typ}`);
    // U2 ist schon einsatzbereit und eingetroffen: kein Status, keine Zeit.
    expect(typen).toEqual([
      "U1:EinheitVerschoben",
      "U1:StatusGesetzt",
      "U1:SchichtGesetzt",
      "U1:ZeitpunktGesetzt",
      "U2:EinheitVerschoben",
      "U2:SchichtGesetzt",
    ]);
  });
});

describe("Der Schrittbauer", () => {
  it("schreibt nichts, was schon so ist", () => {
    expect(einbuchungsschritte({ einheitId: "U1", abschnittId: "EA1", status: "RUHE", schicht: "TAG" }, { status: "RUHE", abschnittId: "EA1", schicht: "" })).toEqual([]);
  });

  it("trägt bei Rückmarsch keine Eintreffzeit ein, wenn sie nicht gewählt ist", () => {
    const schritte = einbuchungsschritte({ einheitId: "U1", status: "IM_EINSATZ" }, { status: "RUECKMARSCH" });
    expect(schritte.map((s) => s.typ)).toEqual(["StatusGesetzt"]);
  });
});
