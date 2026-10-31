/** Die Maske im beendeten Einsatz und bei Ablehnung: Der Grund steht im Dialog. */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";

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
});
