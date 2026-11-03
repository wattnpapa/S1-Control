/**
 * Die Profilwahl auf der Einsatzauswahl (Entwurf „Entlastung", 3.2, 6g, E3)
 * und die Zeile „Dieser Arbeitsplatz" (3.8, E4).
 *
 * Geprüft wird, was der Bediener liest und was gespeichert wird: je Profil
 * das Band, der Satz „kein Recht", das Speichern über `einstellungenSetzen`
 * neben der Betriebsart — und die Sperre im Meldekopf, die den Wert behält.
 * Dazu die eingeklappte Zeile, „Ändern" und die offene Maske ohne Share.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Auswahl } from "./Einsatzauswahl.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { TEXT_PROFIL_KEIN_RECHT, TEXT_PROFIL_MELDEKOPF, profilband } from "./Profilwahl.js";

afterEach(cleanup);

let attrappe: Attrappe;

function zeige(einstellungen: Record<string, unknown> = {}): void {
  useLaden.setState({
    akteId: undefined,
    einsaetze: [],
    einstellungen: { sharePfad: "/share", anzeigename: "Meier", theme: "nacht", ...einstellungen },
    umgebung: { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c" },
    beschaeftigt: false,
    fehler: undefined,
  });
  render(<Auswahl />);
}

/** Klappt „Dieser Arbeitsplatz" auf. */
async function aendern(): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Ändern" }));
}

function profilfeld(): HTMLSelectElement {
  return screen.getByLabelText("Profil") as HTMLSelectElement;
}

beforeEach(() => {
  localStorage.clear();
  attrappe = baueAttrappe();
  attrappe.antwortet("einsaetzeAuflisten", []);
});

describe("Die Profilwahl", () => {
  it("bietet die vier Profile an, Vorgabe Führungsstelle, und erklärt je Profil das Band", async () => {
    zeige();
    await aendern();
    expect(profilfeld().value).toBe("fuehrungsstelle");
    expect(Array.from(profilfeld().options).map((option) => option.text)).toEqual([
      "Führungsstelle (S1)",
      "Vermeldezentrale",
      "Versorgung (S4)",
      "Alle Blätter",
    ]);
    const erklaerung = document.getElementById("profilerklaerung");
    expect(profilfeld().getAttribute("aria-describedby")).toBe("profilerklaerung");
    expect(erklaerung?.textContent).toContain("Führungsstelle (S1): Lage · Eingang · Führungsstelle · Ausgaben · Einsatztagebuch");
    expect(erklaerung?.textContent).toContain("Vermeldezentrale: Funkplan · Lage · Einsatztagebuch");
    expect(erklaerung?.textContent).toContain("Versorgung (S4): Versorgung · Lage · Ausgaben");
    expect(erklaerung?.textContent).toContain("Alle Blätter: alle Reiter");
    expect(erklaerung?.textContent).toContain(TEXT_PROFIL_KEIN_RECHT);
    expect(profilband("alle")).toBe("alle Reiter");
  });

  it("zeigt das gespeicherte Profil und speichert die Wahl neben der Betriebsart", async () => {
    attrappe.antwortet("einstellungenSetzen", { sharePfad: "/share", anzeigename: "Meier", profil: "versorgung" });
    zeige({ profil: "vermeldezentrale" });
    await aendern();
    expect(profilfeld().value).toBe("vermeldezentrale");
    await userEvent.selectOptions(profilfeld(), "versorgung");
    expect(screen.getByText(/^Versorgung \(S4\):/u).className).toBe("gewaehlt");
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("einstellungenSetzen")?.einstellungen).toEqual({
        sharePfad: "/share",
        anzeigename: "Meier",
        betriebsart: "fuehrungsstelle",
        profil: "versorgung",
        theme: "nacht",
      });
    });
  });

  it("sperrt das Profil im Meldekopf, nennt den Grund und behält den Wert", async () => {
    attrappe.antwortet("einstellungenSetzen", {
      sharePfad: "/share",
      anzeigename: "Meier",
      betriebsart: "meldekopf",
      profil: "vermeldezentrale",
    });
    zeige({ profil: "vermeldezentrale" });
    await aendern();
    expect(profilfeld().disabled).toBe(false);
    await userEvent.selectOptions(screen.getByLabelText("Betriebsart"), "meldekopf");
    expect(profilfeld().disabled).toBe(true);
    expect(document.getElementById("profilerklaerung")?.textContent).toBe(TEXT_PROFIL_MELDEKOPF);
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("einstellungenSetzen")?.einstellungen).toMatchObject({
        betriebsart: "meldekopf",
        profil: "vermeldezentrale",
      });
    });
  });
});

describe("Dieser Arbeitsplatz", () => {
  it("steht eingeklappt in einer Zeile: Anzeigename, Profil, Share und „Ändern“", () => {
    zeige({ profil: "versorgung" });
    const zeile = screen.getByRole("group", { name: "Dieser Arbeitsplatz" });
    expect(zeile.textContent).toContain("Meier · Anzeigename");
    expect(zeile.textContent).toContain("Versorgung (S4) · Profil, bestimmt die Reiter");
    expect(zeile.textContent).toContain("/share · Share");
    expect(screen.queryByRole("region", { name: "Einstellungen" })).toBeNull();
    expect(within(zeile).getByRole("button", { name: "Ändern" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("nennt im Meldekopf die Betriebsart statt des Profils", () => {
    zeige({ betriebsart: "meldekopf", profil: "versorgung" });
    expect(screen.getByRole("group", { name: "Dieser Arbeitsplatz" }).textContent).toContain("Meldekopf · Betriebsart");
  });

  it("klappt mit „Ändern“ die Maske auf, jedes Feld mit einem Satz, was es bewirkt", async () => {
    zeige();
    await aendern();
    const maske = screen.getByRole("region", { name: "Einstellungen" });
    for (const [feld, satz] of [
      ["Share-Pfad", /Alle Arbeitsplätze eines Einsatzes brauchen denselben Share/],
      ["Anzeigename", /Steht an jedem Eintrag im Einsatztagebuch/],
      ["Betriebsart", /Die Führungsstelle führt das Lagebild/],
    ] as const) {
      const id = within(maske).getByLabelText(feld).getAttribute("aria-describedby") ?? "";
      expect(document.getElementById(id)?.textContent).toMatch(satz);
    }
    expect(screen.getByRole("button", { name: "Zuklappen" })).toBeDefined();
  });

  it("ist ohne Share-Pfad oder ohne Anzeigenamen von Anfang an offen", () => {
    zeige({ sharePfad: "" });
    expect(screen.getByRole("region", { name: "Einstellungen" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Ändern" })).toBeNull();
    expect((screen.getByRole("button", { name: "Neuer Einsatz …" }) as HTMLButtonElement).disabled).toBe(true);
    cleanup();
    zeige({ anzeigename: "" });
    expect(screen.getByRole("region", { name: "Einstellungen" })).toBeDefined();
  });
});
