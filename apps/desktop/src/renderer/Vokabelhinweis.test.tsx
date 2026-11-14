/**
 * Der Hinweis „Codes statt Namen" über der Einheitentabelle.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { Vokabelhinweis, ergebnistext } from "./Vokabelhinweis.js";

afterEach(cleanup);

let attrappe: Attrappe;

function lage(vokabelkorrekturen: number | undefined): void {
  useLaden.setState({
    akteId: "akte-1",
    lagebild: (vokabelkorrekturen === undefined ? {} : { vokabelkorrekturen }) as never,
    fehler: undefined,
    hinweise: [],
  });
}

beforeEach(() => {
  attrappe = baueAttrappe();
});

describe("Vokabelhinweis", () => {
  it("bleibt unsichtbar, solange nichts offen ist oder der Worker das Feld nicht kennt", () => {
    lage(0);
    const { container, rerender } = render(<Vokabelhinweis />);
    expect(container.textContent).toBe("");
    lage(undefined);
    rerender(<Vokabelhinweis />);
    expect(container.textContent).toBe("");
  });

  it("nennt die Zahl der Einheiten und trägt die Namen auf Knopfdruck ein", async () => {
    lage(2);
    attrappe.antwortet("vokabelnKorrigieren", { art: "korrigiert", einheiten: 2, ereignisse: 7 });
    render(<Vokabelhinweis />);
    expect(screen.getByText(/2 Einheiten aus Erfassungsbögen zeigen Codes/)).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Namen eintragen" }));

    await waitFor(() => {
      expect(useLaden.getState().hinweise.map((h) => h.text)).toContain(
        "Namen eingetragen: 2 Einheiten, 7 Angaben.",
      );
    });
    expect(attrappe.letzterRuf("vokabelnKorrigieren")).toEqual({ art: "vokabelnKorrigieren", akteId: "akte-1" });
  });

  it("meldet einen Abbruch als Warnung mit dem Grund", () => {
    expect(ergebnistext({ art: "abgewiesen", meldung: "Einsatz ist beendet.", ereignisse: 3 })).toBe(
      "Namen nur teilweise eingetragen (3 Angaben): Einsatz ist beendet.",
    );
  });
});
