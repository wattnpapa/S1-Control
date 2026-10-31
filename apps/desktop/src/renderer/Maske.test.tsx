/** Die Maske im beendeten Einsatz und bei Ablehnung: Der Grund steht im Dialog. */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { Maske, TEXT_UNKLAR_VERWERFEN } from "./Maske.js";
import { MELDUNG_UNKLAR } from "./verbindung.js";

afterEach(cleanup);

function setzeStatus(status: "AKTIV" | "BEENDET" | "ARCHIVIERT"): void {
  useLaden.setState({ hinweise: [], lagebild: { einsatzStatus: status } as unknown as Lagebild });
}

describe("Maske", () => {
  it("sperrt im beendeten Einsatz die Bestätigung und sagt „nur lesen“ im Dialog", async () => {
    setzeStatus("BEENDET");
    const bestaetigt = vi.fn();
    render(<Maske titel="Neu" aufBestaetigen={bestaetigt} aufAbbrechen={() => undefined}><input /></Maske>);
    expect(screen.getByRole("alert").textContent).toContain("Einsatz beendet – nur lesen");
    const knopf = screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    await userEvent.type(screen.getByRole("textbox"), "{Enter}");
    expect(bestaetigt).not.toHaveBeenCalled();
  });

  it("zeigt eine Ablehnung, die während der Bestätigung gemeldet wird, im Dialog", async () => {
    setzeStatus("AKTIV");
    const melde = async (): Promise<void> => {
      useLaden.getState().melde("warnung", "Der Einsatz ist archiviert. Es kann nichts mehr geschrieben werden.");
      await Promise.resolve();
    };
    render(<Maske titel="Neu" aufBestaetigen={melde} aufAbbrechen={() => undefined}><input /></Maske>);
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Der Einsatz ist archiviert");
    });
  });

  it("bestätigt mit nurKnopf nicht durch Enter, wohl aber durch den Knopf", async () => {
    setzeStatus("AKTIV");
    const bestaetigt = vi.fn();
    render(<Maske titel="Neu" nurKnopf aufBestaetigen={bestaetigt} aufAbbrechen={() => undefined}><input /></Maske>);
    await userEvent.type(screen.getByRole("textbox"), "{Enter}");
    expect(bestaetigt).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(bestaetigt).toHaveBeenCalledTimes(1);
  });

  it("löst bei einem Doppelklick im selben Takt nur einmal aus", async () => {
    setzeStatus("AKTIV");
    let fertig: () => void = () => undefined;
    const bestaetigt = vi.fn(() => new Promise<void>((erfuellt) => { fertig = erfuellt; }));
    render(<Maske titel="Neu" aufBestaetigen={bestaetigt} aufAbbrechen={() => undefined}><input /></Maske>);
    const knopf = screen.getByRole("button", { name: "Übernehmen" });
    fireEvent.click(knopf);
    fireEvent.click(knopf);
    expect(bestaetigt).toHaveBeenCalledTimes(1);
    // Bis zum Ergebnis steht „…“, danach ist der Knopf wieder da.
    expect(screen.getByRole("button", { name: "…" })).toBeDefined();
    await act(async () => {
      fertig();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "Übernehmen" })).toBeDefined();
  });

  it("nennt neben dem gesperrten Knopf sichtbar den Grund", () => {
    setzeStatus("AKTIV");
    render(
      <Maske titel="Neu" bereit={false} bereitGrund="Abschnitt wählen" aufBestaetigen={() => undefined} aufAbbrechen={() => undefined}>
        <input />
      </Maske>,
    );
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Abschnitt wählen");
    cleanup();
    render(
      <Maske titel="Neu" bereit bereitGrund="Abschnitt wählen" aufBestaetigen={() => undefined} aufAbbrechen={() => undefined}>
        <input />
      </Maske>,
    );
    expect(screen.queryByTestId("bereitgrund")).toBeNull();
  });

  it("fragt nach „Unklar, ob gespeichert“ vor dem Verwerfen nach und lässt die Warnung als Hinweis stehen", async () => {
    setzeStatus("AKTIV");
    const abgebrochen = vi.fn();
    const unklar = async (): Promise<void> => {
      useLaden.setState({ fehler: MELDUNG_UNKLAR });
      await Promise.resolve();
    };
    render(<Maske titel="Einheit anlegen" aufBestaetigen={unklar} aufAbbrechen={abgebrochen}><input /></Maske>);
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Übernehmen" })).toBeDefined();
    });
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(abgebrochen).not.toHaveBeenCalled();
    expect(screen.getByText(TEXT_UNKLAR_VERWERFEN)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Trotzdem verwerfen" }));
    expect(abgebrochen).toHaveBeenCalledTimes(1);
    expect(useLaden.getState().hinweise.some((h) => h.text.includes("Unklar, ob gespeichert"))).toBe(true);
    useLaden.setState({ fehler: undefined });
  });

  it("verwirft ohne Rückfrage, solange der Ausgang nicht unklar war", async () => {
    setzeStatus("AKTIV");
    const abgebrochen = vi.fn();
    render(<Maske titel="Neu" aufBestaetigen={() => undefined} aufAbbrechen={abgebrochen}><input /></Maske>);
    await userEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(abgebrochen).toHaveBeenCalledTimes(1);
  });
});
