/**
 * Komponententests zur Abfrage von Stelle und Handzeichen
 * (KONZEPT-NACHRICHTEN.md Entscheidung 3): von selbst nach dem Öffnen, wenn
 * das Lagebild keine Sitzung trägt; vorbelegt aus den Einstellungen; die Wahl
 * geht an den Worker und als Vorbelegung in die Einstellungen; im Meldekopf
 * entfällt sie.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { NACHRICHTEN_LAGEBILD } from "./pruefhilfen/nachrichtenbeispiel.js";
import { freieStellen, handzeichenFehler, mitVorbelegung, vorbelegungAus } from "./Stellenabfrage.js";
import { useSitzungsabfrage } from "./useSitzungsabfrage.js";

afterEach(cleanup);

let attrappe: Attrappe;
/** Ein Lagebild, dessen Worker Nachrichten kennt, aber noch keine Sitzung hält. */
const OHNE_SITZUNG = { ...NACHRICHTEN_LAGEBILD, sitzung: undefined };

function Wirt(): React.JSX.Element {
  const abfrage = useSitzungsabfrage();
  return (
    <>
      {abfrage.oeffne !== undefined && (
        <button type="button" onClick={abfrage.oeffne}>
          Stelle ändern
        </button>
      )}
      {abfrage.maske}
    </>
  );
}

beforeEach(() => {
  attrappe = baueAttrappe();
  useLaden.setState({
    akteId: "akte-1",
    lagebild: OHNE_SITZUNG,
    einstellungen: { sharePfad: "/share", anzeigename: "Meier", handzeichen: "Mü", stellenJeEinsatz: { E1: ["S4", "Polizei"] } },
    fehler: undefined,
    hinweise: [],
  });
  attrappe.antwortet("einstellungenSetzen", useLaden.getState().einstellungen);
});

describe("Die Abfrage von Stelle und Handzeichen", () => {
  it("fragt nach dem Öffnen von selbst, vorbelegt mit der Wahl für diesen Einsatz", () => {
    render(<Wirt />);
    const maske = screen.getByRole("form", { name: "Stelle und Handzeichen · Hochwasser Oldenburg" });
    expect((within(maske).getByRole("checkbox", { name: "S4" }) as HTMLInputElement).checked).toBe(true);
    expect((within(maske).getByRole("checkbox", { name: "Sichter" }) as HTMLInputElement).checked).toBe(false);
    expect((within(maske).getByLabelText("Weitere Stelle (frei, mehrere durch Komma)") as HTMLInputElement).value).toBe("Polizei");
    expect((within(maske).getByLabelText("Handzeichen") as HTMLInputElement).value).toBe("Mü");
  });

  it("schreibt die Wahl an den Worker und merkt sie als Vorbelegung", async () => {
    render(<Wirt />);
    const maske = screen.getByRole("form", { name: /Stelle und Handzeichen/ });
    fireEvent.click(within(maske).getByRole("checkbox", { name: "S1" }));
    fireEvent.change(within(maske).getByLabelText("Handzeichen"), { target: { value: "Kr" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => expect(attrappe.rufeDerArt("einstellungenSetzen")).toHaveLength(1));
    expect(attrappe.letzterRuf("stellenSetzen")).toEqual({ art: "stellenSetzen", akteId: "akte-1", stellen: ["S1", "S4", "Polizei"], handzeichen: "Kr" });
    expect(attrappe.letzterRuf("einstellungenSetzen")?.einstellungen).toMatchObject({ handzeichen: "Kr", stellenJeEinsatz: { E1: ["S1", "S4", "Polizei"] } });
  });

  it("sperrt ein Handzeichen außerhalb von zwei bis vier Zeichen", () => {
    render(<Wirt />);
    const maske = screen.getByRole("form", { name: /Stelle und Handzeichen/ });
    fireEvent.change(within(maske).getByLabelText("Handzeichen"), { target: { value: "K" } });
    expect((within(maske).getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Das Handzeichen hat zwei bis vier Zeichen.");
  });

  it("arbeitet nach Abbrechen ohne Stelle weiter und fragt nicht erneut", () => {
    render(<Wirt />);
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(attrappe.letzterRuf("stellenSetzen")).toEqual({ art: "stellenSetzen", akteId: "akte-1", stellen: [] });
  });

  it("fragt nicht, wenn die Sitzung schon steht, öffnet aber aus dem Menü mit ihr vorbelegt", () => {
    useLaden.setState({ lagebild: NACHRICHTEN_LAGEBILD });
    render(<Wirt />);
    expect(screen.queryByRole("form")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Stelle ändern" }));
    const maske = screen.getByRole("form", { name: /Stelle und Handzeichen/ });
    expect((within(maske).getByRole("checkbox", { name: "S1" }) as HTMLInputElement).checked).toBe(true);
  });

  it("entfällt im Meldekopf", () => {
    useLaden.setState({ einstellungen: { sharePfad: "/share", anzeigename: "Meier", betriebsart: "meldekopf" } });
    render(<Wirt />);
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.queryByRole("button", { name: "Stelle ändern" })).toBeNull();
  });

  it("liest freie Stellen und Handzeichen und baut die Vorbelegung", () => {
    expect(freieStellen(" Polizei , , A/B, DRK")).toEqual(["Polizei", "DRK"]);
    expect(handzeichenFehler("")).toBeUndefined();
    expect(handzeichenFehler("Mü")).toBeUndefined();
    expect(handzeichenFehler("Müller")).toMatch(/zwei bis vier/);
    expect(vorbelegungAus({ sharePfad: "", anzeigename: "" }, "E1")).toEqual({ stellen: [] });
    expect(mitVorbelegung({ sharePfad: "", anzeigename: "", stellenJeEinsatz: { E0: ["S1"] } }, "E1", { stellen: ["S2"] }).stellenJeEinsatz).toEqual({ E0: ["S1"], E1: ["S2"] });
  });
});
