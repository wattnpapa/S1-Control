/**
 * Komponententests zu Schnitt N2 im Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md
 * §5, §6, §9): die Sicht Fernmeldezentrale mit Beispielzeilen, die drei
 * Vermerke, die Eingangsmaske mit Nummer und Ersatzsichter, die
 * Gesprächsnotiz in der Verfassen-Maske, die Nachweisung und die Parameter.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { aufnahmefehler, aufnahmeVorlage, minutenSeit, nummerAusEingabe, nummerWarnung } from "./fmzformate.js";
import { useLaden } from "./laden.js";
import { leereMaske } from "./nachrichtenformate.js";
import { Nachrichten, ersteSicht } from "./Nachrichten.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { parameterEntwuerfe, parametereingabeAus } from "./Nachrichtenparameter.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;
const JETZT = new Date("2026-11-16T09:45:00.000Z");

/** Die Zeile ohne die genannten Felder — ein Vermerk, der noch fehlt, fehlt ganz. */
function ohne(zeile: Nachrichtenzeile, ...felder: readonly (keyof Nachrichtenzeile)[]): Nachrichtenzeile {
  const kopie: Record<string, unknown> = { ...zeile };
  for (const feld of felder) delete kopie[feld];
  return kopie as unknown as Nachrichtenzeile;
}

/** Zwei Ausgänge vor der FmZ: einer seit 09:00 angenommen (über der Schwelle), einer mit Vorrang. */
const ANGENOMMEN: Nachrichtenzeile = {
  ...ohne(BLITZ_AN_S4, "vorrang", "nummer", "sichtung"),
  id: "N-alt",
  richtung: "AUSGANG",
  richtungKurz: "A",
  vorrangstufe: 2,
  betreff: "Sandsäcke anfordern",
  anschrift: "OV Wildeshausen",
  uebermittlungswunsch: "TELEFON",
  laufzustand: "VOR_FMZ",
  annahme: { zeitpunkt: "2026-11-16T09:00:00.000Z", handzeichen: "Fm" },
  fmzUeberSchwelle: true,
  verteiler: [],
};
const SOFORT: Nachrichtenzeile = { ...ohne(ANGENOMMEN, "annahme"), id: "N-sofort", betreff: "Lagemeldung", vorrang: "SOFORT", vorrangstufe: 1, fmzUeberSchwelle: false };

function fmzLagebild(teile: Partial<Lagebild> = {}): Lagebild {
  return {
    ...NACHRICHTEN_LAGEBILD,
    sitzung: { stellen: ["FMZ"], handzeichen: "Fm" },
    stammdaten: { name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt Weser", beginn: "2026-11-16T08:00:00.000Z", schichtmodell: "ZWEI_SCHICHT" },
    ...teile,
  };
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("nachrichtenAnfordern", { ...nachrichtenansicht([SOFORT, ANGENOMMEN]), naechsteNummer: 8, vergebeneNummern: [7], zaehlung: { NEU: 2, GELESEN: 1, ERLEDIGT: 0 } });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: fmzLagebild(), fehler: undefined, hinweise: [] });
});

function entwuerfe(): Entwurf[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

/** Ein lebender Arbeitsplatz mit der Stelle Sichter in der Präsenz. */
const SICHTER_PEER: Lagebild["peers"][number] = {
  clientId: "b",
  anzeigename: "Sichtung",
  rechnername: "PC-2",
  veraltet: false,
  wanduhr: "2026-11-16T09:45:00.000Z",
  programmversion: "2.0.0",
  segment: 1,
  offset: 0,
  gelesenerOffset: 0,
  uhrAbweichungMs: 0,
  quarantaene: 0,
  stellen: ["SICHTER"],
};

describe("Die Sicht „Fernmeldezentrale“", () => {
  it("ist die erste Sicht der FmZ und zeigt die Warteschlange, Zeile über der Schwelle bernstein mit Minuten", async () => {
    expect(ersteSicht(["FMZ"])).toBe("fmz");
    expect(ersteSicht(["S2", "FMZ"])).toBe("fmz");
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten vor der FmZ" }));
    expect(attrappe.rufeDerArt("nachrichtenAnfordern")[0]).toMatchObject({ sicht: "fmz" });
    const alt = within(tabelle).getByRole("row", { name: /Sandsäcke anfordern/ });
    expect(alt.className).toContain("ueberschwelle");
    expect(alt.textContent).toContain("seit 45 min");
    expect(within(tabelle).getByRole("row", { name: /Lagemeldung/ }).textContent).toContain("Sofort");
    expect(screen.getByRole("button", { name: "Eingang aufnehmen" })).toBeDefined();
  });

  it("Annehmen, Befördern und Nachweisen schreiben je einen Vermerk; eine vergebene Nummer warnt, sperrt aber nicht", async () => {
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten vor der FmZ" }));
    const sofort = within(tabelle).getByRole("row", { name: /Lagemeldung/ });
    fireEvent.click(within(sofort).getByRole("button", { name: "Annehmen" }));
    let maske = screen.getByRole("form", { name: /Annehmen/ });
    expect((within(maske).getByLabelText("Handzeichen") as HTMLInputElement).value).toBe("Fm");
    // Fernmelder P3-2: Die Annahme verlangt wie das Papier nur die Uhrzeit, nicht die sechsstellige Gruppe.
    expect((within(maske).getByLabelText("Uhrzeit") as HTMLInputElement).value).toMatch(/^\d{4}$/u);
    fireEvent.change(within(maske).getByLabelText("Uhrzeit"), { target: { value: "161030nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Annehmen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtAngenommen", nutzlast: { nachrichtId: "N-sofort" }, vorher: null, neu: { zeitpunkt: "2026-11-16T09:30:00.000Z", handzeichen: "Fm" } });

    fireEvent.click(within(within(tabelle).getByRole("row", { name: /Sandsäcke/ })).getByRole("button", { name: "Befördern" }));
    maske = screen.getByRole("form", { name: /Befördern/ });
    expect((within(maske).getByLabelText("Mittel") as HTMLSelectElement).value).toBe("TELEFON");
    expect((within(maske).getByLabelText("Rufname der Gegenstelle / Spruchkopf") as HTMLInputElement).value).toBe("OV Wildeshausen");
    // R2-FaBe P0-2: Die Quittung der Gegenstelle ist nicht vorbelegt; erst die getippte Zeit gibt frei.
    const quittung = within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)") as HTMLInputElement;
    expect(quittung.value).toBe("");
    expect(quittung.placeholder).toBe("Uhrzeit der Quittung durch die Gegenstelle");
    expect((within(maske).getByRole("button", { name: "Befördern" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(quittung, { target: { value: "161040nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(2));
    expect(entwuerfe()[1]).toMatchObject({ typ: "NachrichtBefoerdert", neu: { mittel: "TELEFON", gegenstelle: "OV Wildeshausen", handzeichen: "Fm" } });

    // Fernmelder P3-4: Nachweisen liegt im Menü „Weitere Schritte“ der Zeile.
    fireEvent.click(within(within(tabelle).getByRole("row", { name: /Sandsäcke/ })).getByRole("button", { name: "Weitere Schritte" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Nachweisen" }));
    maske = screen.getByRole("form", { name: /Nachweisen/ });
    const nummer = within(maske).getByLabelText("Nr.") as HTMLInputElement;
    expect(nummer.value).toBe("8");
    fireEvent.change(nummer, { target: { value: "7" } });
    expect(within(maske).getByRole("alert").textContent).toContain("Die Nummer 7 ist bereits vergeben");
    fireEvent.click(within(maske).getByRole("button", { name: "Trotzdem nachweisen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(3));
    expect(entwuerfe()[2]).toMatchObject({ typ: "NachrichtNachgewiesen", neu: { nummer: 7 } });
  });

  it("nimmt einen Eingang auf: Anschrift die eigene FüSt, Nummer vorbelegt, ohne Sichter mit Laufzettel", async () => {
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: "Eingang aufnehmen" })));
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    const oben = within(maske).getByRole("group", { name: "Aufnahmevermerk der Fernmeldezentrale" });
    expect((within(oben).getByLabelText("Nr.") as HTMLInputElement).value).toBe("8");
    expect((within(maske).getByLabelText("Anschrift") as HTMLInputElement).value).toBe("FüSt Weser");
    expect((within(maske).getByLabelText("Absender") as HTMLInputElement).value).toBe("");
    // Kein Sichter in der Präsenz: Der Laufzettel steht offen, S2 rot vorbelegt.
    const laufzettel = within(maske).getByRole("group", { name: "Laufzettel" });
    expect(laufzettel.textContent).toContain("Kein Sichter besetzt");
    expect((within(laufzettel).getByRole("checkbox", { name: "S2 rot" }) as HTMLInputElement).checked).toBe(true);
    fireEvent.change(within(oben).getByLabelText("Rufname der Gegenstelle / Spruchkopf"), { target: { value: "Heros Wildeshausen" } });
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "OV Wildeshausen" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Pumpen eingetroffen" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufnehmen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    const entwurf = entwuerfe()[0];
    expect(entwurf).toMatchObject({ typ: "NachrichtVerfasst", nutzlast: { richtung: "EINGANG", gegenstelle: "Heros Wildeshausen", aufnahme: { mittel: "FUNK", handzeichen: "Fm" } } });
    expect(entwurf?.nachrichtenfolge).toMatchObject({ nachweis: { nummer: 8, handzeichen: "Fm" }, sichtung: { handzeichen: "Fm", verteiler: [{ stelle: "S2", kopie: "ROT" }] } });
  });

  it("zeigt mit Sichter in der Präsenz keinen Laufzettel beim Aufnehmen; leere Nummer schreibt keinen Nachweis", async () => {
    useLaden.setState({ lagebild: fmzLagebild({ peers: [SICHTER_PEER] }) });
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={{ ...leereMaske(undefined, JETZT), richtung: "EINGANG", anschrift: "FüSt" }} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    expect(within(maske).getByRole("group", { name: "Laufzettel" }).className).toContain("grau");
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    // Der Absender ist Pflicht (Audit Sachgebietsleiter P1-4).
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "Polizei" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufnehmen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toBeUndefined();
  });
});

describe("Die Gesprächsnotiz in der Verfassen-Maske", () => {
  it("schaltet auf Eingang, blendet den Laufzettel ein und schickt die Sichtung mit", async () => {
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: ["S3"], handzeichen: "Mü" } } });
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" }, JETZT)} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    expect(within(maske).getByRole("group", { name: "Laufzettel" }).className).toContain("grau");
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Gesprächsnotiz" }));
    const laufzettel = within(maske).getByRole("group", { name: "Laufzettel" });
    expect(laufzettel.className).not.toContain("grau");
    // Ohne Sichter in der Präsenz gibt es „an den Sichter" nicht.
    expect((within(maske).getByRole("button", { name: "An den Sichter" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(maske).getByLabelText("Anschrift"), { target: { value: "S3" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Telefonat Polizei" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ nutzlast: { richtung: "EINGANG", gespraechsnotiz: true }, nachrichtenfolge: { sichtung: { handzeichen: "Mü" } } });
  });

  it("läuft mit Sichter in der Präsenz auf Wunsch an den Sichter, ohne Sichtung", async () => {
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers: [SICHTER_PEER] } });
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" }, JETZT)} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Gesprächsnotiz" }));
    fireEvent.click(within(maske).getByRole("button", { name: "An den Sichter" }));
    expect(within(maske).getByRole("group", { name: "Laufzettel" }).className).toContain("grau");
    fireEvent.change(within(maske).getByLabelText("Anschrift"), { target: { value: "S3" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Telefonat" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ nutzlast: { richtung: "EINGANG", gespraechsnotiz: true } });
    expect(entwuerfe()[0]?.nachrichtenfolge).toBeUndefined();
  });
});

describe("Nachweisung, Chips und Parameter", () => {
  it("zeigt die Nachweisung mit Marke bei doppelter Nummer und dem Knopf zur Ausgabe", async () => {
    const doppelt = { ...BLITZ_AN_S4, nummer: 7, nummerDoppelt: true };
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([doppelt, ANGENOMMEN]));
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    fireEvent.click(await waitFor(() => screen.getByRole("button", { name: "Nachweisung" })));
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachweisung" }));
    const zeile = within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ });
    expect(zeile.textContent).toContain("doppelt");
    expect(within(zeile).getByRole("button", { name: "Berichtigen" })).toBeDefined();
    expect(within(within(tabelle).getByRole("row", { name: /Sandsäcke/ })).getByRole("button", { name: "Nachweisen" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Nachweisung ausgeben" })).toBeDefined();
  });

  it("trägt die Zahlen je Zustand an den Chips des Posteingangs", async () => {
    useLaden.setState({ lagebild: NACHRICHTEN_LAGEBILD });
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const chips = await waitFor(() => screen.getByRole("group", { name: "Filter nach Zustand" }));
    expect(chips.textContent).toContain("gelesen");
    expect(chips.textContent).toMatch(/neu\D*2/u);
    expect(chips.textContent).toMatch(/gelesen\D*1/u);
  });

  it("rechnet Nummern, Minuten, Aufnahme und Parameter als reine Regeln", () => {
    expect(nummerAusEingabe(" 12 ")).toBe(12);
    expect(nummerAusEingabe("0")).toBeUndefined();
    expect(nummerWarnung(7, [7], 7)).toBeUndefined();
    expect(minutenSeit("2026-11-16T09:00:00.000Z", JETZT)).toBe(45);
    expect(aufnahmefehler({ ...aufnahmeVorlage(undefined, 3, JETZT), handzeichen: "" }, JETZT)).toEqual(["Handzeichen der Aufnahme eintragen (zwei bis vier Zeichen)"]);
    expect(aufnahmefehler({ ...aufnahmeVorlage(undefined, 3, JETZT), handzeichen: "F" }, JETZT)).toEqual(["Handzeichen der Aufnahme eintragen (zwei bis vier Zeichen)"]);
    const stand = {};
    expect(parameterEntwuerfe("E", stand, parametereingabeAus(stand))).toEqual([]);
    expect(parameterEntwuerfe("E", stand, { sichtungAuchAusgang: true, fmzSchwelleMinuten: "30" })).toEqual([
      { typ: "NachrichtenParameterGesetzt", nutzlast: { einsatzId: "E", feld: "sichtungAuchAusgang" }, vorher: null, neu: true },
      { typ: "NachrichtenParameterGesetzt", nutzlast: { einsatzId: "E", feld: "fmzSchwelleMinuten" }, vorher: null, neu: 30 },
    ]);
  });
});
