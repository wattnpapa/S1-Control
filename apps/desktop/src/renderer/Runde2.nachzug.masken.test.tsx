/**
 * Regressionstests zum Nachzug der zweiten Runde (2026-11-18), Nachrichtenmaske:
 *
 * - R2-FaBe P1-3, R2-SGL P3-3: „Antworten“ — Anschrift der Absender des
 *   Eingangs, Absender die eigene Stelle, Mittel und Ruf-Nr. übernommen, der
 *   Satz „Diese Antwort geht über die Fernmeldezentrale an …“.
 * - R2-FaBe P1-5: Gesprächsnotiz mit sichtbarer Zeile, „Gesprächspartner“,
 *   Erklärung je Wahl.
 * - R2-FaBe P2-5: Rückfrage bei Abfassungszeit weit weg, außer im Nachtrag.
 * - R2-SGL P2-1, R2-LdF P3-7, R2-LdF P1-2 alt, R2-LdF P2-7: Nachtrag ohne
 *   Nummer, Aufnahme ohne Nummer mit Rückfrage, Nummernsprung mit Rückfrage.
 * - R2-FM P2-3: Gegenstelle Pflicht, Enter speichert keinen halben Spruch.
 * - R2-FaBe P3-4, R2-SGL P3-1, P3-2: „Abbrechen“ behält den Entwurf,
 *   „Verwerfen“ nach Rückfrage, zweites Esc verwirft nicht, Rückfragen im Fuß.
 * - R2-ETB P2-6: Anschrift und Absender mit Bezug zur Lage.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { datumZeitGruppe, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { eingangVorlage } from "./fmzformate.js";
import { useLaden } from "./laden.js";
import { Maske, TEXT_ENTER_GESPERRT } from "./Maske.js";
import { TEXT_AN_SICHTER, TEXT_NOTIZ, TEXT_SELBST_VERTEILEN, antwortsatz } from "./Maskenzusatz.js";
import { bezugAus, bezugsziele } from "./nachrichtenbezug.js";
import { vergissAlle } from "./nachrichtenentwuerfe.js";
import { antwortStelle, antwortVorlage, leereMaske } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { abfassungsfrage, nummernsprungFrage, ohneNummerFrage } from "./maskenrueckfragen.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { nummerBeimNachtrag } from "./useMaskenteile.js";

afterEach(() => {
  cleanup();
  vergissAlle();
});

let attrappe: Attrappe;
const SICHTER_PEER = { clientId: "b", anzeigename: "Sichtung", rechnername: "PC-2", veraltet: false, wanduhr: "2026-11-17T09:00:00.000Z", stellen: ["SICHTER"] } as unknown as Lagebild["peers"][number];
const GEGENSTELLE = "Rufname der Gegenstelle / Spruchkopf";
const entwuerfe = (): Entwurf[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

function sitzung(stellen: readonly string[], peers: Lagebild["peers"] = []): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers, sitzung: { stellen: [...stellen], handzeichen: "Fm" } } });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([]));
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [], baum: undefined });
});

/** Die Eingangsmaske der FmZ mit Absender, Betreff und Inhalt; Nummer vorbelegt mit `naechste`. */
function aufnahme(naechste = 6, gegenstelle = "Heros 10"): HTMLElement {
  sitzung(["FMZ"], [SICHTER_PEER]);
  render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={eingangVorlage({ stellen: ["FMZ"], handzeichen: "Fm" }, "FüSt Weser")} anschriften={[]} aufnahme={{ naechsteNummer: naechste }} aufSchliessen={vi.fn()} />);
  const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
  fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "OV Wildeshausen" } });
  fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
  fireEvent.change(within(maske).getByLabelText("Inhalt"), { target: { value: "Ruhig." } });
  if (gegenstelle !== "") fireEvent.change(within(maske).getByLabelText(GEGENSTELLE), { target: { value: gegenstelle } });
  return maske;
}

describe("R2-FaBe P1-3, R2-SGL P3-3: Antworten", () => {
  it("schreibt an den Absender, als eigene Stelle, mit Mittel, Ruf-Nr. und Bezug im Betreff", () => {
    const eingang: Nachrichtenzeile = { ...BLITZ_AN_S4, anschrift: "FüSt Weser", rufnummer: "04431 1", aufnahme: { mittel: "TELEFON", zeitpunkt: "2026-11-17T09:00:00.000Z", handzeichen: "Fm" } };
    const antwort = antwortVorlage(eingang, { stellen: ["S1", "S4"], handzeichen: "Mü" });
    expect(antwort).toMatchObject({ anschrift: "OV Wildeshausen", absender: "S4", funktion: "S4", uebermittlungswunsch: "TELEFON", rufnummer: "04431 1", betreff: "Antwort auf E 26: Pumpen eingetroffen" });
  });

  it("trägt bei einer Nachricht an mehrere Stellen nur die eigene Stelle als Absender", () => {
    const an34: Nachrichtenzeile = { ...BLITZ_AN_S4, anschrift: "S3, S4", verteiler: [{ stelle: "S3", kopie: "GRUEN", gelesen: false, erledigt: false }, { stelle: "S4", kopie: "BLAU", gelesen: false, erledigt: false }] };
    expect(antwortVorlage(an34, { stellen: ["S3"] }).absender).toBe("S3");
    expect(antwortStelle({ verteiler: [] }, { stellen: ["S6"] })).toBe("S6");
  });

  it("sagt in der Maske, dass die Antwort über die FmZ an die Gegenstelle geht", () => {
    sitzung(["S4"]);
    render(<Nachrichtenmaske titel="Antworten" vorlage={antwortVorlage(BLITZ_AN_S4, { stellen: ["S4"], handzeichen: "Mü" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    expect(screen.getByRole("note").textContent).toBe("Diese Antwort geht über die Fernmeldezentrale an OV Wildeshausen.");
    expect(antwortsatz("")).toBe("Diese Antwort geht über die Fernmeldezentrale.");
  });
});

describe("R2-FaBe P1-5: Gesprächsnotiz", () => {
  it("sagt sichtbar, was sie ist, heißt die Anschrift „Gesprächspartner“ und erklärt die Wahl", () => {
    sitzung(["S3"], [SICHTER_PEER]);
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    expect(within(maske).queryByLabelText("Gesprächspartner")).toBeNull();
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Gesprächsnotiz" }));
    expect(within(maske).getByRole("note").textContent).toBe(TEXT_NOTIZ);
    expect(within(maske).getByLabelText("Gesprächspartner")).toBeDefined();
    expect(within(maske).getByRole("button", { name: "Selbst verteilen" }).getAttribute("aria-pressed")).toBe("true");
    expect(maske.textContent).toContain(TEXT_SELBST_VERTEILEN);
    fireEvent.click(within(maske).getByRole("button", { name: "An den Sichter" }));
    expect(maske.textContent).toContain(TEXT_AN_SICHTER);
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Gesprächspartner eintragen");
  });
});

describe("R2-FaBe P2-5: Abfassungszeit weit weg", () => {
  it("fragt bei mehr als 24 Stunden zurück einmal nach, im Nachtrag nicht", async () => {
    const jetzt = new Date();
    expect(abfassungsfrage(datumZeitGruppe(new Date(jetzt.getTime() - 30 * 3_600_000)), false, jetzt)?.frage).toMatch(/mehr als 24 Stunden zurück\. Stimmt das\?$/u);
    expect(abfassungsfrage(datumZeitGruppe(new Date(jetzt.getTime() + 3_600_000)), false, jetzt)?.frage).toMatch(/in der Zukunft/u);
    expect(abfassungsfrage(datumZeitGruppe(new Date(jetzt.getTime() - 30 * 3_600_000)), true, jetzt)).toBeUndefined();
    expect(abfassungsfrage(datumZeitGruppe(jetzt), false, jetzt)).toBeUndefined();
    sitzung(["S3"]);
    render(<Nachrichtenmaske vorlage={{ ...leereMaske({ stellen: ["S3"], handzeichen: "Mü" }), abfassungszeit: datumZeitGruppe(new Date(Date.now() - 30 * 3_600_000)) }} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.change(within(maske).getByLabelText("Anschrift"), { target: { value: "S2" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    const frage = await within(maske).findByRole("button", { name: "Zeit stimmt" });
    // R2-SGL P3-1: Die Rückfrage steht im festen Fuß neben dem Knopf.
    expect(maske.querySelector(".maskenknoepfe .fussfrage")?.textContent).toMatch(/Stimmt das\?/u);
    expect(entwuerfe()).toHaveLength(0);
    fireEvent.click(frage);
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
  });
});

describe("R2-SGL P2-1, R2-LdF P3-7, P1-2 alt, P2-7: Nummern", () => {
  it("lässt die Nummer im Nachtrag leer („vom Blatt“) und belegt sie danach wieder vor", () => {
    const maske = aufnahme(6);
    const nr = within(within(maske).getByRole("group", { name: "Aufnahmevermerk der Fernmeldezentrale" })).getByLabelText("Nr.") as HTMLInputElement;
    expect(nr.value).toBe("6");
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    expect(nr.value).toBe("");
    expect(nr.placeholder).toBe("vom Blatt");
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    expect(nr.value).toBe("6");
    expect(nummerBeimNachtrag("12", true, 6)).toBe("12");
  });

  it("fragt bei einer Aufnahme ohne Nummer einmal nach, im Nachtrag nicht", async () => {
    expect(ohneNummerFrage("", true)).toBeUndefined();
    expect(ohneNummerFrage("7", false)).toBeUndefined();
    const maske = aufnahme(6);
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufnehmen" }));
    const knopf = await within(maske).findByRole("button", { name: "Ohne Nummer aufnehmen" });
    expect(within(maske).getByRole("alert").textContent).toContain("Ohne Nachweisungsnummer aufnehmen?");
    fireEvent.click(knopf);
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toBeUndefined();
  });

  it("fragt bei einem Sprung über die nächste freie Nummer und nennt die Lücke", async () => {
    expect(nummernsprungFrage(7, 6)?.frage).toMatch(/^Nr\. 6 bleibt leer/u);
    expect(nummernsprungFrage(6, 6)).toBeUndefined();
    const maske = aufnahme(6);
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "50" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufnehmen" }));
    const knopf = await within(maske).findByRole("button", { name: "Trotzdem Nr. 50" });
    expect(within(maske).getByRole("alert").textContent).toContain("Nr. 6 bis 49 bleiben leer");
    fireEvent.click(knopf);
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nachrichtenfolge).toMatchObject({ nachweis: { nummer: 50 } });
  });
});

describe("R2-FM P2-3: Gegenstelle und Enter", () => {
  it("verlangt beim Eingang die Gegenstelle, außer im Nachtrag", () => {
    const maske = aufnahme(6, "");
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Gegenstelle (Rufname) eintragen");
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    expect(screen.queryByText("Gegenstelle (Rufname) eintragen")).toBeNull();
  });

  it("speichert mit Enter im Betreff erst, wenn Betreff, Inhalt und Gegenstelle da sind", async () => {
    const maske = aufnahme(6);
    fireEvent.change(within(maske).getByLabelText("Inhalt"), { target: { value: "" } });
    await userEvent.type(within(maske).getByLabelText("Betreff"), "{Enter}");
    expect(entwuerfe()).toHaveLength(0);
    expect(maske.textContent).toContain(TEXT_ENTER_GESPERRT);
    fireEvent.change(within(maske).getByLabelText("Inhalt"), { target: { value: "Ruhig." } });
    await userEvent.type(within(maske).getByLabelText("Betreff"), "{Enter}");
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
  });
});

describe("R2-FaBe P3-4, R2-SGL P3-2: Abbrechen, Verwerfen, Esc", () => {
  function verfassen(aufSchliessen = vi.fn()): HTMLElement {
    sitzung(["S3"]);
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} entwurfsschluessel="verfassen" aufSchliessen={aufSchliessen} />);
    return screen.getByRole("form", { name: "Nachricht verfassen" });
  }

  it("„Abbrechen“ schließt und behält den Entwurf; beim nächsten Öffnen steht er wieder da", () => {
    const zu = vi.fn();
    let maske = verfassen(zu);
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Sandsäcke" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Abbrechen" }));
    expect(zu).toHaveBeenCalledTimes(1);
    cleanup();
    maske = verfassen();
    expect((within(maske).getByLabelText("Betreff") as HTMLInputElement).value).toBe("Sandsäcke");
    expect(maske.textContent).toMatch(/Ihr Entwurf von \d\d:\d\d ist wiederhergestellt/u);
  });

  it("„Verwerfen“ löscht nach Rückfrage; danach ist die Maske leer", () => {
    const zu = vi.fn();
    let maske = verfassen(zu);
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Sandsäcke" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Verwerfen" }));
    expect(zu).not.toHaveBeenCalled();
    expect(within(maske).getByRole("alert").textContent).toContain("endgültig verwerfen?");
    fireEvent.click(within(maske).getByRole("button", { name: "Endgültig verwerfen" }));
    expect(zu).toHaveBeenCalledTimes(1);
    cleanup();
    maske = verfassen();
    expect((within(maske).getByLabelText("Betreff") as HTMLInputElement).value).toBe("");
  });

  it("ein zweites Esc verwirft nicht: es schließt mit Entwurf — ohne Entwurfsspeicher nimmt es nur die Frage zurück", () => {
    const zu = vi.fn();
    let maske = verfassen(zu);
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Sandsäcke" } });
    fireEvent.keyDown(maske, { key: "Escape" });
    fireEvent.keyDown(maske, { key: "Escape" });
    expect(zu).toHaveBeenCalledTimes(1);
    cleanup();
    maske = verfassen();
    expect((within(maske).getByLabelText("Betreff") as HTMLInputElement).value).toBe("Sandsäcke");
    cleanup();
    const abbrechen = vi.fn();
    render(<Maske titel="Allgemein" geaendert aufBestaetigen={vi.fn()} aufAbbrechen={abbrechen}><input /></Maske>);
    const form = screen.getByRole("form", { name: "Allgemein" });
    fireEvent.keyDown(form, { key: "Escape" });
    expect(within(form).getByRole("alert")).toBeDefined();
    fireEvent.keyDown(form, { key: "Escape" });
    expect(abbrechen).not.toHaveBeenCalled();
    expect(within(form).queryByRole("alert")).toBeNull();
  });
});

describe("R2-ETB P2-6: Bezug zur Lage", () => {
  it("trägt den Bezug, wenn Anschrift oder Absender genau eine Einheit oder einen Abschnitt nennen", async () => {
    const ziele = bezugsziele([{ einheitId: "E-1", name: "Bergungsgruppe Oldenburg" }], [{ id: "A-1", name: "Deich Nord" }, { id: "A-0", name: "Eingang", systemAbschnitt: true }]);
    expect(bezugAus(" deich  nord ", ziele)).toEqual({ entitaet: "ABSCHNITT", id: "A-1" });
    expect(bezugAus("Eingang", ziele)).toBeUndefined();
    expect(bezugAus("OV Wildeshausen", ziele)).toBeUndefined();
    sitzung(["S3"]);
    useLaden.setState({ baum: { baum: [{ id: "A-1", name: "Deich Nord", systemAbschnitt: false }] } as unknown as ReturnType<typeof useLaden.getState>["baum"] });
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} gegenstellen={[{ einheitId: "E-1", name: "Bergungsgruppe Oldenburg" }]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.change(within(maske).getByLabelText("Anschrift"), { target: { value: "Bergungsgruppe Oldenburg" } });
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "Deich Nord" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Pumpen" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.nutzlast).toMatchObject({ anschriftBezug: { entitaet: "EINHEIT", id: "E-1" }, absenderBezug: { entitaet: "ABSCHNITT", id: "A-1" } });
  });
});

describe("Stab-Review LdF-1/Fm-1: die vorbelegte Nummer folgt dem Stand", () => {
  function maskeMit(naechste: number): React.JSX.Element {
    return <Nachrichtenmaske titel="Eingang aufnehmen" vorlage={eingangVorlage({ stellen: ["FMZ"], handzeichen: "Fm" }, "FüSt Weser")} anschriften={[]} aufnahme={{ naechsteNummer: naechste }} aufSchliessen={vi.fn()} />;
  }
  const nummernfeld = (): HTMLInputElement => within(screen.getByRole("group", { name: "Aufnahmevermerk der Fernmeldezentrale" })).getByLabelText("Nr.") as HTMLInputElement;

  it("nimmt die neue nächste Nummer, wenn ein anderer Platz inzwischen aufgenommen hat", () => {
    sitzung(["FMZ"]);
    const { rerender } = render(maskeMit(16));
    expect(nummernfeld().value).toBe("16");
    // Fm2 hat Nr. 16 geschrieben; der Abgleich meldet als nächste die 17.
    rerender(maskeMit(17));
    expect(nummernfeld().value).toBe("17");
  });

  it("lässt eine selbst getippte Nummer stehen", () => {
    sitzung(["FMZ"]);
    const { rerender } = render(maskeMit(16));
    fireEvent.change(nummernfeld(), { target: { value: "20" } });
    rerender(maskeMit(17));
    expect(nummernfeld().value).toBe("20");
  });
});
