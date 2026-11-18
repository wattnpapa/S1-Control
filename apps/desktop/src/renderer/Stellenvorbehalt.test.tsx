/**
 * Hinweis statt Recht beim oberen Teil des Vordrucks (LdF P2-3,
 * Entscheidung 13 vom 2026-11-17, Lehrunterlage Folie 7): Ohne Stelle FMZ
 * (Vorschlag und Weitergabe: LDF) zeigt die Maske den Hinweis mit „Trotzdem“;
 * erst danach lässt sich der Schritt schreiben, und er trägt den `grund`
 * „Eintrag durch <Stelle>, nicht FmZ“ für das Tagebuch. Keine Sperre.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { Fmzmaske, type Fmzschritt } from "./Fmzmasken.js";
import { useLaden } from "./laden.js";
import { Weitergabemaske } from "./Ldfmaske.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD } from "./pruefhilfen/nachrichtenbeispiel.js";
import { eintragsgrund, stelleFehlt, vorbehaltstextFuer } from "./Stellenvorbehalt.js";

afterEach(cleanup);

let attrappe: Attrappe;

const ZEILE = { ...BLITZ_AN_S4, richtung: "AUSGANG", richtungKurz: "A", annahme: undefined, nummer: undefined } as unknown as Nachrichtenzeile;

function sitzung(stellen: readonly string[], peers: Lagebild["peers"] = []): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers, sitzung: { stellen: [...stellen], handzeichen: "Mü" } } });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

const entwuerfe = (): Entwurf[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

function fmzmaske(schritt: Fmzschritt): HTMLElement {
  render(<Fmzmaske schritt={schritt} zeile={ZEILE} handzeichen="Mü" naechsteNummer={8} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
  return screen.getByRole("form");
}

describe("Die Regel", () => {
  it("FMZ für Annehmen, Befördern, Nachweisen; LDF für Vorschlag und Weitergabe; FmZ vertritt den LdF nur ohne LdF", () => {
    expect(stelleFehlt("annahme", ["S4"], [])).toBe(true);
    expect(stelleFehlt("annahme", ["FMZ"], [])).toBe(false);
    expect(stelleFehlt("nachweis", ["LDF"], [])).toBe(true);
    expect(stelleFehlt("vorschlag", ["S4"], [])).toBe(true);
    expect(stelleFehlt("vorschlag", ["LDF"], [])).toBe(false);
    expect(stelleFehlt("vorschlag", ["FMZ"], [])).toBe(false);
    expect(stelleFehlt("weitergabe", ["FMZ"], [{ veraltet: false, stellen: ["LDF"] }])).toBe(true);
    expect(stelleFehlt("weitergabe", ["FMZ"], [{ veraltet: true, stellen: ["LDF"] }])).toBe(false);
    expect(eintragsgrund("annahme", ["S4"])).toBe("Eintrag durch S4, nicht FmZ");
    expect(eintragsgrund("vorschlag", ["S4", "S1"])).toBe("Eintrag durch S4, S1, nicht LdF");
  });
});

describe("Die Masken der FmZ", () => {
  it.each<[Fmzschritt, string]>([
    ["annahme", "Annehmen"],
    ["befoerderung", "Befördern"],
    ["nachweis", "Nachweisen"],
  ])("%s ohne Stelle FMZ: Hinweis, erst „Trotzdem“ gibt frei, der Entwurf trägt den Grund", async (schritt, knopf) => {
    sitzung(["S4"]);
    const maske = fmzmaske(schritt);
    expect(within(maske).getByText(vorbehaltstextFuer(schritt), { exact: false })).toBeDefined();
    const bestaetigen = within(maske).getByRole("button", { name: knopf });
    expect((bestaetigen as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(maske).getByRole("button", { name: "Trotzdem" }));
    // R2-FaBe P0-2: Die Quittung der Gegenstelle ist beim Befördern leer und Pflicht.
    if (schritt === "befoerderung") fireEvent.change(within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)"), { target: { value: "1045" } });
    expect((within(maske).getByRole("button", { name: knopf }) as HTMLButtonElement).disabled).toBe(false);
    expect(within(maske).getByText(/Wird vermerkt als: Eintrag durch S4, nicht FmZ/u)).toBeDefined();
    fireEvent.click(within(maske).getByRole("button", { name: knopf }));
    await vi.waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ grund: "Eintrag durch S4, nicht FmZ" });
  });

  it("mit Stelle FMZ: kein Hinweis, kein Grund", async () => {
    sitzung(["FMZ"]);
    const maske = fmzmaske("annahme");
    expect(within(maske).queryByRole("button", { name: "Trotzdem" })).toBeNull();
    fireEvent.click(within(maske).getByRole("button", { name: "Annehmen" }));
    await vi.waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.grund).toBeUndefined();
  });

  it("Übermittlung vorschlagen: LDF nötig; die FmZ darf es nur, solange kein LdF besetzt ist", () => {
    sitzung(["FMZ"]);
    expect(within(fmzmaske("vorschlag")).queryByRole("button", { name: "Trotzdem" })).toBeNull();
    cleanup();
    sitzung(["FMZ"], [{ veraltet: false, stellen: ["LDF"] } as unknown as Lagebild["peers"][number]]);
    expect(within(fmzmaske("vorschlag")).getByRole("button", { name: "Trotzdem" })).toBeDefined();
  });
});

describe("Die Weitergabe an den Sichter", () => {
  it("ohne Stelle LDF: Hinweis, nach „Trotzdem“ mit Grund „nicht LdF“", async () => {
    sitzung(["S4"]);
    render(<Weitergabemaske zeile={ZEILE} handzeichen="Mü" aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form");
    expect((within(maske).getByRole("button", { name: "Weitergeben" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(within(maske).getByRole("button", { name: "Trotzdem" }));
    fireEvent.click(within(maske).getByRole("button", { name: "Weitergeben" }));
    // R2-LdF P2-3: Der Eingang hat keine Nummer — der zweite Klick gibt weiter.
    if (ZEILE.nummer === undefined) fireEvent.click(await within(maske).findByRole("button", { name: "Trotzdem ohne Nummer weitergeben" }));
    await vi.waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtWeitergegeben", grund: "Eintrag durch S4, nicht LdF" });
  });
});
