/**
 * Komponententests zum Leiter des Fernmeldebetriebes im Blatt „Nachrichten"
 * (bestätigt am 2026-11-17, KONZEPT-NACHRICHTEN.md §5, §6): die Sicht „LdF"
 * nur mit Parameter oder Stelle, ihre beiden Karten mit Festlegung und
 * Weitergabe, die Zahl „vor dem LdF" im Band, die Vorbelegung des Mittels in
 * der Beförderungsmaske samt Ersatzregel und das Parameterfeld in der
 * Stammdatenmaske.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Einsatzstammdaten, Entwurf, Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { ldfSichtbar } from "./Ldfsicht.js";
import { Nachrichten, ersteSicht } from "./Nachrichten.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Stammdatenblock } from "./Stammdatenmaske.js";
import { TEXT_LDF_ERSATZ } from "./useFmzschritte.js";

afterEach(cleanup);

let attrappe: Attrappe;

const STAMMDATEN: Einsatzstammdaten = { name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt Weser", beginn: "2026-11-16T08:00:00.000Z", schichtmodell: "ZWEI_SCHICHT" };

function ohne(zeile: Nachrichtenzeile, ...felder: readonly (keyof Nachrichtenzeile)[]): Nachrichtenzeile {
  const kopie: Record<string, unknown> = { ...zeile };
  for (const feld of felder) delete kopie[feld];
  return kopie as unknown as Nachrichtenzeile;
}

/** Ein angenommener Ausgang vor der Festlegung, Wunsch Telefon. */
const AUSGANG_VOR_LDF: Nachrichtenzeile = {
  ...ohne(BLITZ_AN_S4, "vorrang", "nummer", "sichtung"),
  id: "A-ldf",
  richtung: "AUSGANG",
  richtungKurz: "A",
  vorrangstufe: 2,
  betreff: "Sandsäcke anfordern",
  anschrift: "OV Wildeshausen",
  uebermittlungswunsch: "TELEFON",
  laufzustand: "VOR_LDF",
  annahme: { zeitpunkt: "2026-11-16T09:30:00.000Z", handzeichen: "Fm" },
  verteiler: [],
};

/** Ein aufgenommener, nachgewiesener Eingang vor der Weitergabe. */
const EINGANG_VOR_LDF: Nachrichtenzeile = {
  ...ohne(BLITZ_AN_S4, "vorrang", "sichtung"),
  id: "E-ldf",
  vorrangstufe: 2,
  nummer: 12,
  betreff: "Pumpen eingetroffen",
  laufzustand: "VOR_LDF",
  aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-16T09:35:00.000Z", handzeichen: "Fm" },
  verteiler: [],
};

function lagebild(teile: Partial<Lagebild> = {}): Lagebild {
  return {
    ...NACHRICHTEN_LAGEBILD,
    sitzung: { stellen: ["LDF"], handzeichen: "Lf" },
    stammdaten: { ...STAMMDATEN, ldfStation: true },
    nachrichten: { neuFuerStellen: 0, vorFmz: 0, vorSichter: 0, mitVorrangOffen: 0, ueberSchwelle: 0, vorLdf: 2 },
    ...teile,
  };
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([AUSGANG_VOR_LDF, EINGANG_VOR_LDF]));
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: lagebild(), fehler: undefined, hinweise: [] });
});

function entwuerfe(): Entwurf[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Die Sicht „LdF“", () => {
  it("ist nur mit Parameter oder Stelle LDF da und für den LdF die erste Sicht", () => {
    expect(ersteSicht(["LDF"])).toBe("ldf");
    expect(ersteSicht(["LDF", "FMZ"])).toBe("ldf");
    expect(ldfSichtbar(undefined, ["FMZ"])).toBe(false);
    expect(ldfSichtbar(true, [])).toBe(true);
    expect(ldfSichtbar(false, ["LDF"])).toBe(true);
    useLaden.setState({ lagebild: lagebild({ sitzung: { stellen: ["S4"], handzeichen: "Mü" }, stammdaten: STAMMDATEN }) });
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const umschalter = screen.getByRole("group", { name: "Sicht" });
    expect(within(umschalter).queryByRole("button", { name: "LdF" })).toBeNull();
  });

  it("zeigt zwei Karten und die Zahl „vor dem LdF“; Vorschlagen und Weitergeben schreiben je einen Vermerk", async () => {
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    expect(screen.getByLabelText("Zahlen der Nachrichten").textContent).toContain("vor dem LdF");
    const ausgaenge = await waitFor(() => screen.getByRole("table", { name: "Ausgänge vor der Zuteilung an einen Fernmelder" }));
    expect(attrappe.rufeDerArt("nachrichtenAnfordern")[0]).toMatchObject({ sicht: "ldf" });
    const eingaenge = screen.getByRole("table", { name: "Eingänge vor der Weitergabe an den Sichter" });
    expect(within(eingaenge).getByRole("row", { name: /Pumpen eingetroffen/ }).textContent).toContain("12");

    // Der Ausgangsschritt des LdF ist die Maske „Fernmelder zuteilen“ der FmZ.
    fireEvent.click(within(ausgaenge).getByRole("button", { name: "Fernmelder zuteilen" }));
    let maske = screen.getByRole("form", { name: /Fernmelder zuteilen/ });
    expect((within(maske).getByLabelText("Mittel") as HTMLSelectElement).value).toBe("TELEFON");
    expect((within(maske).getByLabelText("Handzeichen") as HTMLInputElement).value).toBe("Lf");
    fireEvent.change(within(maske).getByLabelText("Fernmelder"), { target: { value: "Fm2" } });
    fireEvent.change(within(maske).getByLabelText("Mittel"), { target: { value: "KURIER" } });
    fireEvent.change(within(maske).getByLabelText("Datum/Uhrzeit"), { target: { value: "161040nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Fernmelder zuteilen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({
      typ: "NachrichtUebermittlungVorgeschlagen",
      nutzlast: { nachrichtId: "A-ldf" },
      vorher: null,
      neu: { mittel: "KURIER", fernmelder: "Fm2", zeitpunkt: "2026-11-16T09:40:00.000Z", handzeichen: "Lf" },
      vorwertPruefen: true,
    });

    fireEvent.click(within(eingaenge).getByRole("button", { name: "An den Sichter weitergeben" }));
    maske = screen.getByRole("form", { name: /An den Sichter weitergeben/ });
    fireEvent.click(within(maske).getByRole("button", { name: "Weitergeben" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(2));
    expect(entwuerfe()[1]).toMatchObject({ typ: "NachrichtWeitergegeben", nutzlast: { nachrichtId: "E-ldf" }, vorher: null, neu: { handzeichen: "Lf" } });
  });
});

describe("Die Beförderungsmaske mit LdF", () => {
  it("belegt das vorgeschlagene Mittel vor; ohne LdF-Lücke kein Satz zur Ersatzregel", async () => {
    const festgelegt: Nachrichtenzeile = { ...AUSGANG_VOR_LDF, laufzustand: "VOR_FMZ", vorschlag: { mittel: "KURIER", fernmelder: "Fm2", zeitpunkt: "2026-11-16T09:40:00.000Z", handzeichen: "Lf" } };
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([festgelegt]));
    useLaden.setState({ lagebild: lagebild({ sitzung: { stellen: ["FMZ"], handzeichen: "Fm" } }) });
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten vor der FmZ" }));
    expect(within(tabelle).getByRole("row", { name: /Sandsäcke/ }).textContent).toContain("Fm2 · Kurier/Melder");
    fireEvent.click(within(tabelle).getByRole("button", { name: "Befördern" }));
    const maske = screen.getByRole("form", { name: /Befördern/ });
    expect((within(maske).getByLabelText("Mittel") as HTMLSelectElement).value).toBe("KURIER");
    expect(maske.textContent).not.toContain(TEXT_LDF_ERSATZ);
  });

  it("ohne LdF in der Präsenz: Marke „beim LdF“ und der Satz zur Ersatzregel", async () => {
    useLaden.setState({ lagebild: lagebild({ sitzung: { stellen: ["FMZ"], handzeichen: "Fm" }, peers: [] }) });
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([AUSGANG_VOR_LDF]));
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten vor der FmZ" }));
    expect(within(tabelle).getByRole("row", { name: /Sandsäcke/ }).textContent).toContain("beim LdF");
    fireEvent.click(within(tabelle).getByRole("button", { name: "Befördern" }));
    const maske = screen.getByRole("form", { name: /Befördern/ });
    expect((within(maske).getByLabelText("Mittel") as HTMLSelectElement).value).toBe("TELEFON");
    expect(maske.textContent).toContain(TEXT_LDF_ERSATZ);
  });
});

describe("Das Parameterfeld in der Stammdatenmaske", () => {
  it("schreibt „LdF als eigene Station“ mit dem gesehenen Vorher-Wert", async () => {
    useLaden.setState({ lagebild: { einsatzId: "E-1", stammdaten: STAMMDATEN } as never });
    render(<Stammdatenblock />);
    fireEvent.click(screen.getByRole("button", { name: "Stammdaten bearbeiten" }));
    const feld = screen.getByRole("checkbox", { name: /LdF als eigene Station/ }) as HTMLInputElement;
    expect(feld.checked).toBe(false);
    fireEvent.click(feld);
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtenParameterGesetzt", nutzlast: { einsatzId: "E-1", feld: "ldfStation" }, vorher: null, neu: true });
  });
});
