/**
 * Komponententests zur Maske „Nachricht verfassen" (KONZEPT-NACHRICHTEN.md
 * §5, §6): Vorbelegung aus Stelle und Handzeichen, Zeilenzähler gegen zwölf,
 * Pflichtfelder, Aufgeben als Ausgang und der Entwurf für `beforeunload`.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hatOffenenEntwurf } from "./entwurf.js";
import { useLaden } from "./laden.js";
import { anlageAus, antwortVorlage, inhaltszeilen, leereMaske, maskenfehler, zeitAusEingabe } from "./nachrichtenformate.js";
import { Nachrichtenmaske, besetzteStellen } from "./Nachrichtenmaske.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD } from "./pruefhilfen/nachrichtenbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;
const SITZUNG = { stellen: ["S4"], handzeichen: "Mü" };
const JETZT = new Date("2026-11-16T09:45:00.000Z");

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: NACHRICHTEN_LAGEBILD, fehler: undefined, hinweise: [] });
});

function zeige(aufSchliessen = vi.fn()): HTMLElement {
  render(<Nachrichtenmaske vorlage={leereMaske(SITZUNG, JETZT)} anschriften={["Deich Nord"]} aufSchliessen={aufSchliessen} />);
  return screen.getByRole("form", { name: "Nachricht verfassen" });
}

function feld(maske: HTMLElement, name: string): HTMLInputElement {
  return within(maske).getByLabelText(name);
}

describe("Die Maske „Nachricht verfassen“", () => {
  it("ist der Vordruck in drei Teilen, oben und unten grau, mit Vorbelegung aus Stelle und Handzeichen", () => {
    const maske = zeige();
    expect(within(maske).getByRole("group", { name: "Vermerke der Fernmeldezentrale" }).className).toContain("grau");
    expect(within(maske).getByRole("group", { name: "Laufzettel" }).className).toContain("grau");
    expect(feld(maske, "Absender").value).toBe("S4");
    expect(feld(maske, "Funktion").value).toBe("S4");
    expect(feld(maske, "Zeichen").value).toBe("Mü");
    expect(feld(maske, "Abfassungszeit").value).toBe("161045nov26");
    expect((within(maske).getByRole("checkbox", { name: "Blitz" }) as HTMLInputElement).checked).toBe(false);
  });

  it("verlangt Anschrift, Betreff oder Inhalt und eine lesbare Abfassungszeit", () => {
    const maske = zeige();
    const aufgeben = within(maske).getByRole("button", { name: "Aufgeben" }) as HTMLButtonElement;
    expect(aufgeben.disabled).toBe(true);
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Anschrift eintragen");
    fireEvent.change(feld(maske, "Anschrift"), { target: { value: "S2" } });
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Betreff oder Inhalt eintragen");
    fireEvent.change(within(maske).getByLabelText("Inhalt"), { target: { value: "Lage ruhig" } });
    expect(aufgeben.disabled).toBe(false);
    fireEvent.change(feld(maske, "Abfassungszeit"), { target: { value: "gestern" } });
    expect(aufgeben.disabled).toBe(true);
    expect(within(maske).getByText("nicht lesbar")).toBeDefined();
    expect(maskenfehler({ ...leereMaske(SITZUNG, JETZT), anschrift: "S2", betreff: "x" }, JETZT)).toEqual([]);
  });

  it("zählt die Zeilen gegen zwölf und kündigt ab der dreizehnten ein Folgeblatt an", () => {
    const maske = zeige();
    const inhalt = within(maske).getByLabelText("Inhalt");
    fireEvent.change(inhalt, { target: { value: "eins\nzwei" } });
    expect(within(maske).getByRole("status").textContent).toBe("2 von 12 Zeilen");
    fireEvent.change(inhalt, { target: { value: Array.from({ length: 13 }, (_, i) => `Zeile ${String(i + 1)}`).join("\n") } });
    expect(within(maske).getByRole("status").textContent).toContain("13 von 12 Zeilen – der Ausdruck bekommt ein Folgeblatt; gekürzt wird nichts.");
    expect(inhaltszeilen("a".repeat(120))).toBe(3);
    expect(inhaltszeilen(`${"wort ".repeat(11)}wort`)).toBe(2);
  });

  it("gibt als Ausgang auf und meldet sich bis dahin als offener Entwurf", async () => {
    const aufSchliessen = vi.fn();
    const maske = zeige(aufSchliessen);
    expect(hatOffenenEntwurf()).toBe(false);
    fireEvent.change(feld(maske, "Anschrift"), { target: { value: "Deich Nord" } });
    fireEvent.change(feld(maske, "Betreff"), { target: { value: "Sandsäcke" } });
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Sofort" }));
    expect(hatOffenenEntwurf()).toBe(true);
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    // R2-FaBe P2-5: Die Abfassungszeit JETZT liegt mehr als 24 Stunden zurück — der erste Klick fragt.
    fireEvent.click(await within(maske).findByRole("button", { name: "Zeit stimmt" }));
    await waitFor(() => expect(aufSchliessen).toHaveBeenCalled());
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf).toMatchObject({ typ: "NachrichtVerfasst", nutzlast: { richtung: "AUSGANG", anschrift: "Deich Nord", betreff: "Sandsäcke", vorrang: "SOFORT", absender: "S4", zeichen: "Mü", abfassungszeit: "2026-11-16T09:45:00.000Z" } });
    cleanup();
    expect(hatOffenenEntwurf()).toBe(false);
  });

  it("liest die Zeit als Datum-Zeit-Gruppe oder Funkzeit und baut Antwort und Anlage", () => {
    expect(zeitAusEingabe("161045nov26", JETZT)).toBe("2026-11-16T09:45:00.000Z");
    expect(zeitAusEingabe("", JETZT)).toBeUndefined();
    const antwort = antwortVorlage(BLITZ_AN_S4, SITZUNG, JETZT);
    // R2-FaBe P1-3: Absender und Funktion sind die eigene Stelle (S4 hat die grüne Kopie), nicht die Anschrift „FüSt“.
    expect(antwort).toMatchObject({ anschrift: "OV Wildeshausen", absender: "S4", funktion: "S4", betreff: "Antwort auf E 26: Pumpen eingetroffen", antwortAuf: "N-blitz", inhalt: "" });
    expect(anlageAus(antwort, "N-1", JETZT)).toMatchObject({ richtung: "AUSGANG", antwortAuf: "N-blitz", abfassungszeit: "2026-11-16T09:45:00.000Z" });
    expect(besetzteStellen([{ veraltet: false, stellen: ["S2", "LEITER"] }, { veraltet: true, stellen: ["S3"] }])).toEqual(["S2", "Leiter"]);
  });
});
