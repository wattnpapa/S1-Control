/**
 * Der Kontakt im Funkplan in den Masken „Befördern“ und „Eingang aufnehmen“:
 * Rufgruppe vorbelegt mit der Hauptrufgruppe der Einheit, wählbar, und der
 * Hinweis, wenn eine Einheit ohne Rufgruppe der gewählten zugeordnet wird.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Gegenstelle, Rufgruppenwahl } from "../kontrakt/index.js";
import { Fmzmaske } from "./Fmzmasken.js";
import { gegenstelleTreffer, kontaktAus, zuordnungshinweis } from "./Funkkontaktwahl.js";
import { useLaden } from "./laden.js";
import { leereMaske } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD } from "./pruefhilfen/nachrichtenbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;
const entwuerfe = (): Entwurf[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

const RUFGRUPPEN: readonly Rufgruppenwahl[] = [
  { rufgruppeId: "R1", name: "THW_OL_EA1" },
  { rufgruppeId: "R2", name: "THW_OL_EA2" },
];
const ZUGEORDNET: Gegenstelle = { einheitId: "U1", name: "Bergungsgruppe Oldenburg", rufgruppeId: "R1", funkrufname: "Heros Oldenburg 22" };
const OHNE_GRUPPE: Gegenstelle = { einheitId: "U2", name: "FGr N Oldenburg", funkrufname: "Heros Oldenburg 51" };

const AUSGANG: Nachrichtenzeile = {
  ...BLITZ_AN_S4,
  id: "N-aus",
  richtung: "AUSGANG",
  richtungKurz: "A",
  nummer: 4,
  betreff: "Sandsäcke",
  anschrift: "Bergungsgruppe Oldenburg",
  absender: "S4",
  laufzustand: "VOR_FMZ",
  verteiler: [],
};

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("nachrichtenAnfordern", { zeilen: [AUSGANG] });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [], lagebild: { ...NACHRICHTEN_LAGEBILD, peers: [], sitzung: { stellen: ["FMZ"], handzeichen: "Fm" } } });
});

describe("Die Kontaktwahl als Regel", () => {
  it("findet die Einheit über Namen oder Funkrufnamen", () => {
    expect(gegenstelleTreffer([ZUGEORDNET, OHNE_GRUPPE], " heros oldenburg 51 ")?.einheitId).toBe("U2");
    expect(gegenstelleTreffer([ZUGEORDNET, OHNE_GRUPPE], "Bergungsgruppe Oldenburg")?.einheitId).toBe("U1");
  });

  it("schickt den Kontakt nur per Funk und mit gesetztem Kästchen", () => {
    expect(kontaktAus(ZUGEORDNET, "FUNK", { an: true, rufgruppeId: "R2" })).toEqual({ einheitId: "U1", rufgruppeId: "R2" });
    expect(kontaktAus(ZUGEORDNET, "FUNK", { an: true, rufgruppeId: "" })).toEqual({ einheitId: "U1" });
    expect(kontaktAus(ZUGEORDNET, "TELEFON", { an: true, rufgruppeId: "R1" })).toBeUndefined();
    expect(kontaktAus(ZUGEORDNET, "FUNK", { an: false, rufgruppeId: "R1" })).toBeUndefined();
  });

  it("sagt die Zuordnung nur für eine Einheit ohne Rufgruppe an", () => {
    expect(zuordnungshinweis(ZUGEORDNET, RUFGRUPPEN, "R2")).toBeUndefined();
    expect(zuordnungshinweis(OHNE_GRUPPE, RUFGRUPPEN, "R2")).toBe("„FGr N Oldenburg“ hat noch keine Rufgruppe und wird „THW_OL_EA2“ zugeordnet.");
  });
});

describe("Befördern per Funk an eine Einheit", () => {
  it("belegt die Rufgruppe mit der Hauptrufgruppe vor und schickt die gewählte mit", async () => {
    render(<Fmzmaske schritt="befoerderung" zeile={AUSGANG} handzeichen="Fm" naechsteNummer={5} vergebeneNummern={[]} gegenstellen={[ZUGEORDNET]} rufgruppen={RUFGRUPPEN} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: /Befördern/ });
    fireEvent.change(within(maske).getByLabelText("Mittel"), { target: { value: "FUNK" } });
    const gruppe = within(maske).getByLabelText("Rufgruppe") as HTMLSelectElement;
    expect(gruppe.value).toBe("R1");
    fireEvent.change(gruppe, { target: { value: "R2" } });
    fireEvent.change(within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)"), { target: { value: "161045nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toMatchObject({ kontaktEinheitId: "U1", kontaktRufgruppeId: "R2" });
  });
});

describe("Eingang aufnehmen per Funk", () => {
  it("findet die Einheit über den Rufnamen, sagt die Zuordnung an und schickt Einheit und Rufgruppe mit", async () => {
    const vorlage = { ...leereMaske({ stellen: ["FMZ"], handzeichen: "Fm" }), richtung: "EINGANG" as const, anschrift: "FüSt Weser" };
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={vorlage} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} gegenstellen={[ZUGEORDNET, OHNE_GRUPPE]} rufgruppen={RUFGRUPPEN} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    expect(within(maske).queryByLabelText("Rufgruppe")).toBeNull();
    fireEvent.change(within(maske).getByLabelText("Mittel"), { target: { value: "FUNK" } });
    fireEvent.change(within(maske).getByLabelText("Rufname der Gegenstelle / Spruchkopf"), { target: { value: "Heros Oldenburg 51" } });
    const gruppe = within(maske).getByLabelText("Rufgruppe") as HTMLSelectElement;
    expect(gruppe.value).toBe("");
    fireEvent.change(gruppe, { target: { value: "R2" } });
    expect(within(maske).getByText("„FGr N Oldenburg“ hat noch keine Rufgruppe und wird „THW_OL_EA2“ zugeordnet.")).toBeDefined();
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "FGr N" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    fireEvent.change(within(maske).getByLabelText("Inhalt"), { target: { value: "Pumpen laufen." } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufnehmen" }));
    // Ohne Nummer fragt die Maske einmal nach.
    const trotzdem = within(maske).queryByRole("button", { name: /Trotzdem/ });
    if (trotzdem !== null) fireEvent.click(trotzdem);
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toMatchObject({ kontaktEinheitId: "U2", kontaktRufgruppeId: "R2" });
  });
});
