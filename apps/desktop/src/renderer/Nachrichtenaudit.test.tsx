/**
 * Regressionstests zu den Audits „Nachrichten“ vom 2026-11-17 (Fernmelder,
 * LdF, Sachgebietsleiter) — die Masken der FmZ, die Aufnahmemaske, die
 * Stellenabfrage und die Listen. Die Sichter-Befunde stehen in
 * `Sichteraudit.test.tsx`.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { anzeigezoneWandzeit, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { TEXT_ANNAHME_MIT } from "./Befoerderungszusatz.js";
import { ohneNummerZeilen } from "./Fernmeldezentrale.js";
import { Fmzmaske } from "./Fmzmasken.js";
import { useLaden } from "./laden.js";
import { leereMaske, kopiewort, maskenfehler, uhrzeit, zeitAusEingabe, zeitHinweis } from "./nachrichtenformate.js";
import { Nachrichten } from "./Nachrichten.js";
import { ausgangsstand } from "./Nachrichtenliste.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { stellentext } from "./Nachrichtenzusatz.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Statuszeile } from "./Statuszeile.js";
import { Stellenabfrage, stellenabfrageFehler } from "./Stellenabfrage.js";
import { anschriftStellen, hauptempfaengerWarnung, umgeschaltet, verteilerAusAnschrift } from "./Verteilerraster.js";

afterEach(cleanup);

let attrappe: Attrappe;

/** Die Zeile ohne die genannten Felder — ein Vermerk, der noch fehlt, fehlt ganz. */
function ohne(zeile: Nachrichtenzeile, ...felder: readonly (keyof Nachrichtenzeile)[]): Nachrichtenzeile {
  const kopie: Record<string, unknown> = { ...zeile };
  for (const feld of felder) delete kopie[feld];
  return kopie as unknown as Nachrichtenzeile;
}

/** Ein Ausgang vor der FmZ, weder angenommen noch nachgewiesen. */
const AUSGANG: Nachrichtenzeile = {
  ...ohne(BLITZ_AN_S4, "nummer", "sichtung"),
  id: "N-aus",
  richtung: "AUSGANG",
  richtungKurz: "A",
  betreff: "Sandsäcke anfordern",
  anschrift: "OV Wildeshausen",
  absender: "S4",
  laufzustand: "VOR_FMZ",
  verteiler: [],
};

function fmzLagebild(): Lagebild {
  return {
    ...NACHRICHTEN_LAGEBILD,
    sitzung: { stellen: ["FMZ"], handzeichen: "Fm" },
    stammdaten: { name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt Weser", beginn: "2026-11-16T08:00:00.000Z", schichtmodell: "ZWEI_SCHICHT", fmzSchwelleMinuten: 15 },
  };
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("nachrichtenAnfordern", { ...nachrichtenansicht([AUSGANG]), naechsteNummer: 8, vergebeneNummern: [7] });
  useLaden.setState({ akteId: "akte-1", lagebild: fmzLagebild(), fehler: undefined, hinweise: [] });
});

function entwuerfe(): Entwurf[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

function befoerdern(zeile: Nachrichtenzeile = AUSGANG): HTMLElement {
  render(<Fmzmaske schritt="befoerderung" zeile={zeile} handzeichen="Fm" naechsteNummer={8} vergebeneNummern={[7]} aufSchliessen={vi.fn()} />);
  return screen.getByRole("form", { name: /Befördern/ });
}

describe("LdF P0-1: Befördern verlangt Annahme und Nummer", () => {
  it("trägt die fehlende Annahme mit derselben Zeit und die vorbelegte Nummer im selben Zug ein", async () => {
    const maske = befoerdern();
    expect(maske.textContent).toContain(TEXT_ANNAHME_MIT);
    expect(maske.textContent).toContain("Nummer ist vorbelegt; leer lassen heißt ohne Nummer befördern");
    expect((within(maske).getByLabelText("Nr.") as HTMLInputElement).value).toBe("8");
    fireEvent.change(within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)"), { target: { value: "171155nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    const e = entwuerfe()[0];
    expect(e?.typ).toBe("NachrichtBefoerdert");
    expect(e?.nachrichtenfolge).toMatchObject({ annahme: { handzeichen: "Fm", zeitpunkt: (e?.neu as { zeitpunkt: string }).zeitpunkt }, nachweis: { nummer: 8, handzeichen: "Fm" } });
  });

  it("verlangt bei leerer Nummer einen zweiten Klick „Trotzdem ohne Nummer“", async () => {
    const maske = befoerdern();
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "" } });
    fireEvent.change(within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)"), { target: { value: "171155nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    await waitFor(() => expect(within(maske).getByRole("button", { name: "Trotzdem ohne Nummer" })).toBeDefined());
    expect(entwuerfe()).toHaveLength(0);
    fireEvent.click(within(maske).getByRole("button", { name: "Trotzdem ohne Nummer" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).not.toHaveProperty("nachweis");
  });

  it("trägt nichts nach, was schon vermerkt ist", async () => {
    const maske = befoerdern({ ...AUSGANG, nummer: 5, annahme: { zeitpunkt: "2026-11-17T10:00:00.000Z", handzeichen: "Ab" } });
    expect(maske.textContent).not.toContain(TEXT_ANNAHME_MIT);
    expect(within(maske).queryByLabelText("Nr.")).toBeNull();
    fireEvent.change(within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)"), { target: { value: "171155nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toBeUndefined();
  });

  it("zeigt beförderte Nachrichten ohne Nummer in der Karte „Ohne Nummer“ mit „Nachweisen“", async () => {
    const befoerdert: Nachrichtenzeile = { ...AUSGANG, id: "N-bef", betreff: "Befördert ohne Nr", laufzustand: "VERTEILT", befoerderung: { mittel: "FUNK", zeitpunkt: "2026-11-17T10:00:00.000Z", handzeichen: "Fm" } };
    attrappe.antwortet("nachrichtenAnfordern", { ...nachrichtenansicht([AUSGANG, befoerdert]), naechsteNummer: 8, vergebeneNummern: [7] });
    expect(ohneNummerZeilen([AUSGANG, befoerdert]).map((z) => z.id)).toEqual(["N-bef"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const karte = await waitFor(() => screen.getByRole("region", { name: "Ohne Nummer" }));
    fireEvent.click(within(karte).getByRole("button", { name: "Nachweisen" }));
    const maske = screen.getByRole("form", { name: /Nachweisen/ });
    expect((within(maske).getByLabelText("Nr.") as HTMLInputElement).value).toBe("8");
    // Die Schlange zeigt Schwelle, Absender und Wartezeit (LdF P1-4).
    const schlange = screen.getByRole("region", { name: "Ausgangswarteschlange" });
    expect(schlange.textContent).toContain("Schwelle 15 min");
    expect(within(schlange).getByRole("columnheader", { name: "Absender" })).toBeDefined();
    expect(within(schlange).getByRole("columnheader", { name: "Wartet" })).toBeDefined();
  });
});

describe("Fernmelder P1-1, P1-2, P2-2: Zeitfelder und Tastatur", () => {
  it("markiert das Zeitfeld beim Öffnen, liest „1155“ als heute und bestätigt mit Enter", async () => {
    render(<Fmzmaske schritt="annahme" zeile={AUSGANG} handzeichen="Fm" naechsteNummer={8} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: /Annehmen/ });
    const zeit = within(maske).getByLabelText("Uhrzeit") as HTMLInputElement;
    expect(document.activeElement).toBe(zeit);
    expect([zeit.selectionStart, zeit.selectionEnd]).toEqual([0, zeit.value.length]);
    fireEvent.change(zeit, { target: { value: "1155" } });
    fireEvent.submit(maske);
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    // „1155“ heißt 11:55 in der Anzeigezone Europe/Berlin, heute dort (FM P2-1).
    const zeitpunkt = anzeigezoneWandzeit((entwuerfe()[0]?.neu as { zeitpunkt: string }).zeitpunkt);
    expect([zeitpunkt?.stunde, zeitpunkt?.minute, zeitpunkt?.tag]).toEqual([11, 55, anzeigezoneWandzeit(Date.now())?.tag]);
  });

  it("warnt bei Zeiten in der Zukunft oder älter als einen Tag, ohne zu sperren", () => {
    const jetzt = new Date("2026-11-17T12:00:00.000Z");
    expect(zeitHinweis("2026-11-17T12:04:00.000Z", jetzt)).toBeUndefined();
    expect(zeitHinweis("2026-11-17T12:10:00.000Z", jetzt)).toMatch(/Zukunft/);
    expect(zeitHinweis("2026-11-16T11:00:00.000Z", jetzt)).toMatch(/24 Stunden/);
    expect(zeitAusEingabe("1155", jetzt)).toBeDefined();
    expect(uhrzeit("2026-11-17T10:45:00.000Z")).toBe("1145");
  });

  it("bestätigt die Aufnahme mit Strg+Enter im Inhalt und führt Tab in der Folge der Aufnahme", async () => {
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={{ ...leereMaske(undefined), richtung: "EINGANG", anschrift: "FüSt Weser" }} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    // R2-FM P1-1: Handzeichen und Nr. stehen jetzt in der Folge, hinter dem Inhalt die Abfassungszeit.
    const hz = within(within(maske).getByRole("group", { name: "Aufnahmevermerk der Fernmeldezentrale" })).getByLabelText("Handzeichen");
    const folge = [within(maske).getByLabelText("Mittel"), within(maske).getByLabelText("Aufnahme"), hz, ...["Rufname der Gegenstelle / Spruchkopf", "Nr.", "Absender", "Anschrift", "Sofort", "Blitz", "Betreff", "Inhalt"].map((t) => within(maske).getByLabelText(t))];
    for (let i = 0; i < folge.length - 1; i += 1) {
      fireEvent.keyDown(folge[i] as HTMLElement, { key: "Tab" });
      expect(document.activeElement).toBe(folge[i + 1]);
    }
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "Polizei" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    const inhalt = within(maske).getByLabelText("Inhalt");
    fireEvent.keyDown(inhalt, { key: "Tab" });
    expect(document.activeElement).toBe(within(maske).getByLabelText("Abfassungszeit"));
    fireEvent.keyDown(inhalt, { key: "Enter", ctrlKey: true });
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
  });
});

describe("Fernmelder P1-3, SGL P1-5: Esc fragt vor dem Verwerfen", () => {
  it("fragt bei getipptem Inhalt nach, behält den Entwurf und verwirft erst beim zweiten Esc", () => {
    const aufSchliessen = vi.fn();
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S4"], handzeichen: "Ru" })} anschriften={[]} aufSchliessen={aufSchliessen} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.keyDown(maske, { key: "Escape" });
    expect(aufSchliessen).toHaveBeenCalledTimes(1);
    aufSchliessen.mockReset();
    fireEvent.change(within(maske).getByLabelText("Inhalt"), { target: { value: "Funkspruch" } });
    fireEvent.keyDown(maske, { key: "Escape" });
    expect(aufSchliessen).not.toHaveBeenCalled();
    expect(within(maske).getByRole("alert").textContent).toContain("Entwurf verwerfen?");
    expect((within(maske).getByLabelText("Inhalt") as HTMLTextAreaElement).value).toBe("Funkspruch");
    fireEvent.click(within(maske).getByRole("button", { name: "Verwerfen" }));
    expect(aufSchliessen).toHaveBeenCalledTimes(1);
  });
});

describe("SGL P1-4: Pflichtfelder und eigene Stelle", () => {
  it("lässt die Stellenabfrage nicht leer bestätigen, wohl aber abbrechen", () => {
    const aufAbbrechen = vi.fn();
    render(<Stellenabfrage vorbelegung={{ stellen: [] }} aufBestaetigen={vi.fn()} aufAbbrechen={aufAbbrechen} />);
    const knopf = screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "S4" }));
    expect(knopf.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Handzeichen"), { target: { value: "Ru" } });
    expect(knopf.disabled).toBe(false);
    expect(stellenabfrageFehler([], "Ru")).toMatch(/Stelle wählen/);
    expect(stellenabfrageFehler(["S4"], "")).toMatch(/Handzeichen/);
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(aufAbbrechen).toHaveBeenCalled();
  });

  it("zeigt „ohne Stelle“ in der Statuszeile und die eigene Stelle im Band", async () => {
    render(<Statuszeile lagebild={{ ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: [] } }} jetzt={Date.now()} />);
    expect(screen.getByText("ohne Stelle")).toBeDefined();
    cleanup();
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: ["S4"], handzeichen: "Ru" } } });
    const aufStelle = vi.fn();
    render(<Nachrichten aufTagebuch={vi.fn()} aufStelle={aufStelle} />);
    const angabe = await waitFor(() => screen.getByLabelText("Meine Stelle"));
    expect(angabe.textContent).toContain("Meine Stelle: S4 · Hz. Ru");
    fireEvent.click(within(angabe).getByRole("button", { name: "Ändern" }));
    expect(aufStelle).toHaveBeenCalled();
    expect(stellentext({ stellen: [] })).toBe("Meine Stelle: ohne Stelle");
  });

  it("verlangt Absender und Handzeichen mit zwei bis vier Zeichen", () => {
    expect(maskenfehler({ ...leereMaske(undefined), anschrift: "S3", betreff: "x" })).toContain("Absender eintragen");
    render(<Fmzmaske schritt="annahme" zeile={AUSGANG} handzeichen="F" naechsteNummer={8} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Annehmen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("bereitgrund").textContent).toMatch(/zwei bis vier/);
  });
});

describe("SGL P1-3: die Anschrift im Verteiler", () => {
  it("liest bekannte Stellen und Freitext aus der Anschrift, ohne die eigene FüSt; S2 bleibt rot", () => {
    expect(anschriftStellen("S3, S4 und Polizei; FüSt Weser", "FüSt Weser")).toEqual(["S3", "S4", "Polizei"]);
    expect(verteilerAusAnschrift("S2, Leiter")).toEqual([{ stelle: "S2", kopie: "ROT" }, { stelle: "LEITER", kopie: "GRUEN" }]);
    expect(hauptempfaengerWarnung([{ stelle: "S2", kopie: "ROT" }])).toMatch(/Kein Hauptempfänger/);
    expect(umgeschaltet([], "S6")).toEqual([{ stelle: "S6", kopie: "BLAU" }]);
  });

  it("belegt bei der Gesprächsnotiz die Anschrift grün vor", async () => {
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: ["S3"], handzeichen: "Mü" } } });
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Gesprächsnotiz" }));
    fireEvent.change(within(maske).getByLabelText("Anschrift"), { target: { value: "S4" } });
    const laufzettel = within(maske).getByRole("group", { name: "Laufzettel" });
    expect((within(laufzettel).getByRole("checkbox", { name: "S4 grün" }) as HTMLInputElement).checked).toBe(true);
    expect((within(laufzettel).getByRole("checkbox", { name: "S2 rot" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Telefonat" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toMatchObject({ sichtung: { verteiler: [{ stelle: "S2", kopie: "ROT" }, { stelle: "S4", kopie: "GRUEN" }] } });
  });
});

describe("LdF P1-3, SGL P0-1, P2-8: Listen", () => {
  it("zeigt in der Nachweisung Mittel, Gegenstelle und die Zeiten wie im Ausdruck; Berichtigen belegt die nächste Nummer vor", async () => {
    const doppelt: Nachrichtenzeile = {
      ...AUSGANG,
      id: "N-doppelt",
      nummer: 7,
      nummerDoppelt: true,
      gegenstelle: "Heros Wildeshausen",
      annahme: { zeitpunkt: "2026-11-17T09:20:00.000Z", handzeichen: "Fm" },
      befoerderung: { mittel: "TELEFON", zeitpunkt: "2026-11-17T09:21:00.000Z", handzeichen: "Fm" },
    };
    attrappe.antwortet("nachrichtenAnfordern", { ...nachrichtenansicht([doppelt]), naechsteNummer: 8, vergebeneNummern: [7] });
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: "Nachweisung" })));
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachweisung" }));
    expect(within(tabelle).getByRole("columnheader", { name: "Mittel" })).toBeDefined();
    const zeile = within(tabelle).getByRole("row", { name: /Sandsäcke/ });
    expect(zeile.textContent).toContain("Heros Wildeshausen");
    expect(zeile.textContent).toContain("1020 Fm");
    fireEvent.click(within(zeile).getByRole("button", { name: "Berichtigen" }));
    expect((within(screen.getByRole("form", { name: /Nachweisen/ })).getByLabelText("Nr.") as HTMLInputElement).value).toBe("8");
  });

  it("baut den Stand des Ausgangs aus den Vermerken und nennt die Kopiefarbe als Wort", () => {
    const befoerdert = { ...AUSGANG, annahme: { zeitpunkt: "2026-11-17T12:20:00.000Z", handzeichen: "Fm" }, befoerderung: { mittel: "FUNK", zeitpunkt: "2026-11-17T12:21:00.000Z", handzeichen: "Fm" } };
    // R2-FaBe P0-2: Die Annahme ist die der FmZ, die Beförderungszeit die Quittung der Gegenstelle; der Satz gilt auch neben `fmzVermerkText`.
    expect(ausgangsstand(befoerdert)).toBe("angenommen (FmZ) 1320 Fm · Quittung der Gegenstelle 1321 Fm (Funk)");
    expect(ausgangsstand({ ...befoerdert, fmzVermerkText: "aus Ring 2" } as Nachrichtenzeile)).toBe("angenommen (FmZ) 1320 Fm · Quittung der Gegenstelle 1321 Fm (Funk)");
    expect(ausgangsstand(AUSGANG)).toBe("vor der FmZ");
    expect(kopiewort("GRUEN")).toBe("grün: bearbeiten");
    expect(kopiewort("BLAU")).toBe("blau: Kenntnis");
    expect(kopiewort("ROT")).toBe("rot: S2");
  });
});
