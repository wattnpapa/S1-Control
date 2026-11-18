/**
 * Regressionstests zur zweiten Audit-Runde (2026-11-17), Masken der FmZ und
 * des Verfassers:
 *
 * - R2-FaBe P0-2: Die Quittungszeit der Gegenstelle ist beim Befördern leer,
 *   Pflicht, mit Platzhalter; Lese-Ansicht, Ausgang und Vorschau nennen
 *   „Quittung der Gegenstelle 1720 Ha“ und „angenommen (FmZ)“, ohne
 *   Beförderung „noch nicht übermittelt“.
 * - R2-FaBe P0-3: Nach dem Aufgeben bleibt die Warnung des Workers stehen.
 * - R2-FM P1-1, P2-1, P2-2, R2-SGL P2-3: vollständige Tabfolge der Aufnahme,
 *   Startfokus, Strg+N für „Eingang aufnehmen“ in der Sicht FmZ.
 * - R2-FM P2-3 (alt): Abfassungszeit im Eingang leer, „laut Spruch“.
 * - R2-FM P2-5 (alt): Sperrhinweis der FmZ-Masken mit Stelle und Handzeichen.
 * - R2-FaBe P1-1/P1-2: Tooltips an Kästchen, Raster und Stellenabfrage.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { eingangVorlage } from "./fmzformate.js";
import { Fmzmaske, PLATZHALTER_QUITTUNG } from "./Fmzmasken.js";
import { useLaden } from "./laden.js";
import { leereMaske, maskenfehler } from "./nachrichtenformate.js";
import { Nachrichten } from "./Nachrichten.js";
import { Nachrichtenansicht } from "./Nachrichtenansicht.js";
import { Nachrichtenmaske, meldeNachAufgeben } from "./Nachrichtenmaske.js";
import { ausgangsstand } from "./Nachrichtenliste.js";
import { PLATZHALTER_LAUT_SPRUCH } from "./Nachrichtenmittelteil.js";
import { ausgangsvermerk } from "./nachrichtenvermerke.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Stellenabfrage, TITEL_HANDZEICHEN } from "./Stellenabfrage.js";
import { TITEL_KOPIEN } from "./Verteilerraster.js";
import { vorschauvermerk } from "./Vordruckvorschau.js";

afterEach(cleanup);

let attrappe: Attrappe;
const FMZ_PEER = { clientId: "f", anzeigename: "Funk 1", rechnername: "PC-F", veraltet: false, wanduhr: "2026-11-17T09:00:00.000Z", stellen: ["FMZ"] } as unknown as Lagebild["peers"][number];
const AUSGANG: Nachrichtenzeile = {
  ...BLITZ_AN_S4,
  id: "N-aus",
  richtung: "AUSGANG",
  richtungKurz: "A",
  betreff: "Sanitäter zugesagt",
  anschrift: "DRK Leitstelle",
  laufzustand: "VOR_FMZ",
  verteiler: [],
  annahme: { zeitpunkt: "2026-11-17T16:10:00.000Z", handzeichen: "Fm" },
  // Der Wortlaut kommt aus Ring 2 (`fmzVermerkText`), nicht aus dem Renderer.
  fmzVermerkText: projektion.fmzVermerkTextAus(undefined, { zeitpunkt: "2026-11-17T16:10:00.000Z", handzeichen: "Fm" }, undefined, true) as string,
};
const BEFOERDERUNG = { mittel: "TELEFON", zeitpunkt: "2026-11-17T16:20:00.000Z", handzeichen: "Ha" };
const BEFOERDERT: Nachrichtenzeile = {
  ...AUSGANG,
  befoerderung: BEFOERDERUNG,
  fmzVermerkText: projektion.fmzVermerkTextAus(undefined, AUSGANG.annahme, BEFOERDERUNG, true) as string,
};

function sitzung(stellen: readonly string[], teile: Partial<Lagebild> = {}): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers: [], sitzung: { stellen: [...stellen], handzeichen: "Fm" }, ...teile } });
}

const entwuerfe = (): Entwurf[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

describe("R2-FaBe P0-2: Quittung der Gegenstelle", () => {
  it("ist beim Befördern leer und Pflicht, mit Platzhalter", async () => {
    sitzung(["FMZ"]);
    render(<Fmzmaske schritt="befoerderung" zeile={{ ...AUSGANG, nummer: 4 }} handzeichen="Ha" naechsteNummer={5} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: /Befördern/ });
    const feld = within(maske).getByLabelText("Quittung der Gegenstelle (Datum/Uhrzeit)") as HTMLInputElement;
    expect(feld.value).toBe("");
    expect(feld.placeholder).toBe(PLATZHALTER_QUITTUNG);
    expect((within(maske).getByRole("button", { name: "Befördern" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(maske).getByTestId("bereitgrund").textContent).toBe("Uhrzeit der Quittung durch die Gegenstelle eintragen");
    fireEvent.change(feld, { target: { value: "171720nov26" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
  });

  it("heißt in Ausgang, Lese-Ansicht und Vorschau „Quittung der Gegenstelle“, sonst „noch nicht übermittelt“", () => {
    expect(ausgangsvermerk(BEFOERDERT)).toBe("angenommen (FmZ) 1710 Fm · Quittung der Gegenstelle 1720 Ha (Telefon)");
    expect(ausgangsstand(AUSGANG)).toBe("angenommen (FmZ) 1710 Fm · noch nicht übermittelt");
    expect(vorschauvermerk({ art: "zeile", zeile: BEFOERDERT })).toContain("Quittung der Gegenstelle 1720 Ha");
    expect(vorschauvermerk({ art: "zeile", zeile: BLITZ_AN_S4 })).toBeUndefined();
    sitzung(["S3"]);
    render(<Nachrichtenansicht zeile={AUSGANG} aufSchliessen={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Quittung der Gegenstelle noch nicht übermittelt");
    expect(dialog.textContent).toContain("Annahme (FmZ)");
    cleanup();
    render(<Nachrichtenansicht zeile={BEFOERDERT} aufSchliessen={vi.fn()} />);
    expect(screen.getByRole("dialog").textContent).toContain("Quittung der Gegenstelle 1720 Ha");
  });
});

describe("R2-FaBe P0-3: FmZ nicht besetzt", () => {
  it("nennt das Band bernstein, solange keine FmZ in der Präsenz steht", async () => {
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([]));
    sitzung(["FACHBERATER"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    expect(screen.getByText(/FmZ nicht besetzt/u).className).toContain("warnung");
    cleanup();
    sitzung(["FACHBERATER"], { peers: [FMZ_PEER] });
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    expect(screen.queryByText(/FmZ nicht besetzt/u)).toBeNull();
    cleanup();
    // `besetzteStellen` aus dem Lagebild geht vor (optional gelesen, anderer Arbeitsstrang).
    sitzung(["FACHBERATER"], { peers: [FMZ_PEER], besetzteStellen: ["SICHTER"] } as Partial<Lagebild>);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    expect(screen.getByText(/FmZ nicht besetzt/u)).toBeDefined();
    await waitFor(() => expect(attrappe.rufeDerArt("nachrichtenAnfordern").length).toBeGreaterThan(0));
  });

  it("behält die Warnung des Workers nach dem Aufgeben als Warnung; schweigt er, sagt die Maske es selbst", async () => {
    sitzung(["FACHBERATER"]);
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-1", warnungen: ["FmZ nicht besetzt: Die Nachricht liegt."] });
    const aufSchliessen = vi.fn();
    render(<Nachrichtenmaske vorlage={{ ...leereMaske({ stellen: ["FACHBERATER"], handzeichen: "Mka" }), anschrift: "DRK Leitstelle", betreff: "Zusage" }} anschriften={[]} aufSchliessen={aufSchliessen} />);
    fireEvent.click(screen.getByRole("button", { name: "Aufgeben" }));
    await waitFor(() => expect(aufSchliessen).toHaveBeenCalled());
    expect(useLaden.getState().hinweise.map((h) => [h.stufe, h.text])).toEqual([["warnung", "FmZ nicht besetzt: Die Nachricht liegt."]]);
    useLaden.setState({ hinweise: [] });
    meldeNachAufgeben([], true);
    expect(useLaden.getState().hinweise[0]?.text).toContain("FmZ nicht besetzt");
    expect(useLaden.getState().hinweise[0]?.stufe).toBe("warnung");
  });
});

/** Folgt Tab von `start` bis zum Hauptknopf und gibt die besuchten Elemente zurück. */
function tabweg(maske: HTMLElement, start: HTMLElement): HTMLElement[] {
  const weg: HTMLElement[] = [start];
  start.focus();
  for (let i = 0; i < 80; i += 1) {
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab" });
    const jetzt = document.activeElement as HTMLElement;
    weg.push(jetzt);
    if (jetzt.classList.contains("haupt") || !maske.contains(jetzt)) break;
  }
  return weg;
}

describe("R2-FM P1-1, P2-2: Tabfolge und Startfokus", () => {
  function aufnahme(nachtrag: boolean): HTMLElement {
    sitzung(["FMZ"]);
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={eingangVorlage({ stellen: ["FMZ"], handzeichen: "Fm" }, "FüSt Weser")} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    if (nachtrag) fireEvent.click(within(maske).getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "Heros" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    // R2-FM P2-3: Die Gegenstelle ist beim Eingang Pflicht.
    fireEvent.change(within(maske).getByLabelText("Rufname der Gegenstelle / Spruchkopf"), { target: { value: "Heros 10" } });
    if (nachtrag) {
      fireEvent.change(within(maske).getByLabelText("Aufnahme"), { target: { value: "1010" } });
      fireEvent.change(within(maske).getByLabelText("Quittung"), { target: { value: "1012" } });
    }
    return maske;
  }

  it.each([false, true])("führt die Aufnahme (Nachtrag: %s) über alle Felder bis „Aufnehmen“", (nachtrag) => {
    const maske = aufnahme(nachtrag);
    const kopf = within(maske).getByRole("group", { name: "Aufnahmevermerk der Fernmeldezentrale" });
    const zettel = within(maske).getByRole("group", { name: "Laufzettel" });
    const erwartet = [
      within(kopf).getByLabelText("Mittel"),
      within(kopf).getByLabelText("Aufnahme"),
      within(kopf).getByLabelText("Handzeichen"),
      within(kopf).getByLabelText("Rufname der Gegenstelle / Spruchkopf"),
      within(kopf).getByLabelText("Nr."),
      ...["Absender", "Anschrift", "Sofort", "Blitz", "Betreff", "Inhalt", "Abfassungszeit", "Zeichen", "Funktion"].map((t) => within(maske).getByLabelText(t)),
      within(zettel).getByLabelText("Quittung"),
      within(zettel).getByLabelText("Handzeichen"),
    ];
    const weg = tabweg(maske, erwartet[0] as HTMLElement);
    expect(weg.slice(0, erwartet.length)).toEqual(erwartet);
    expect(weg.filter((e) => e.getAttribute("type") === "checkbox" && zettel.contains(e)).length).toBeGreaterThanOrEqual(24);
    expect(weg).toContain(within(zettel).getByLabelText("Weitere Stelle"));
    expect(weg).toContain(within(zettel).getByLabelText("Vermerke"));
    expect(weg.at(-1)?.textContent).toBe(nachtrag ? "Nachtragen" : "Aufnehmen");
  });

  it("beginnt die Aufnahme im Mittel und das Verfassen in der Anschrift, nicht im Nachtragsschalter", () => {
    aufnahme(false);
    expect(document.activeElement).toBe(screen.getByLabelText("Mittel"));
    cleanup();
    sitzung(["S3"]);
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByLabelText("Anschrift"));
  });

  it("öffnet „Eingang aufnehmen“ mit Strg+N in der Sicht Fernmeldezentrale", async () => {
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([]));
    sitzung(["FMZ"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    await waitFor(() => screen.getByRole("button", { name: "Eingang aufnehmen" }));
    expect(screen.getByRole("button", { name: "Eingang aufnehmen" }).title).toContain("Strg+N");
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    expect(screen.getByRole("form", { name: "Eingang aufnehmen" })).toBeDefined();
  });
});

describe("R2-FM P2-3, P2-5 (alt): Abfassungszeit im Eingang, Sperrhinweis", () => {
  it("lässt die Abfassungszeit im Eingang leer („laut Spruch“) und schreibt ohne sie", async () => {
    expect(eingangVorlage(undefined, "FüSt").abfassungszeit).toBe("");
    expect(maskenfehler({ ...eingangVorlage(undefined, "FüSt"), absender: "Heros", betreff: "x" })).toEqual([]);
    expect(maskenfehler({ ...leereMaske(undefined), anschrift: "S3", absender: "S4", betreff: "x", abfassungszeit: "" })).toHaveLength(1);
    sitzung(["FMZ"]);
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={eingangVorlage({ stellen: ["FMZ"], handzeichen: "Fm" }, "FüSt Weser")} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    const feld = within(maske).getByLabelText("Abfassungszeit") as HTMLInputElement;
    expect(feld.value).toBe("");
    expect(feld.placeholder).toBe(PLATZHALTER_LAUT_SPRUCH);
    expect((within(maske).getByLabelText("Aufnahme") as HTMLInputElement).value).not.toBe("");
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "Heros" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    fireEvent.change(within(maske).getByLabelText("Rufname der Gegenstelle / Spruchkopf"), { target: { value: "Heros 10" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufnehmen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect((entwuerfe()[0]?.nutzlast as { abfassungszeit?: string }).abfassungszeit).toBeUndefined();
  });

  it("nennt im Sperrhinweis Name, Stelle und Handzeichen", () => {
    const halter = { ...FMZ_PEER, bearbeitet: ["N-aus"], handzeichen: "Zw" } as Lagebild["peers"][number];
    sitzung(["FMZ"], { peers: [halter] });
    render(<Fmzmaske schritt="annahme" zeile={AUSGANG} handzeichen="Fm" naechsteNummer={5} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
    expect(screen.getByRole("form").textContent).toContain("🔒 wird von Funk 1 (FmZ · Hz. Zw) bearbeitet");
  });
});

describe("R2-FaBe P1-1/P1-2: Tooltips", () => {
  it("erklärt Kästchen, Abfassungszeit, Raster und Stellenabfrage", () => {
    sitzung(["S3"]);
    render(<Nachrichtenmaske vorlage={{ ...leereMaske({ stellen: ["S3"], handzeichen: "Mü" }), gespraechsnotiz: true }} anschriften={[]} aufSchliessen={vi.fn()} />);
    const titel = (text: string): string => (screen.getByText(text, { selector: "label" }) as HTMLElement).title;
    expect(titel("Spruch")).toContain("Gegenstelle");
    expect(titel("Durchsage")).toContain("mehrere");
    expect(titel("Sofort")).toContain("Vorrang Sofort");
    expect(titel("Blitz")).toContain("Vorrang Blitz");
    expect(titel("Gesprächsnotiz")).toContain("nicht an die Fernmeldezentrale");
    expect(screen.getByLabelText("Übermittlungswunsch").closest("label")?.title).toContain("Wie soll die Nachricht hinausgehen");
    expect(screen.getByLabelText("Abfassungszeit").title).toContain("Datum-Zeit-Gruppe: Tag, Stunde, Minute");
    expect(screen.getByRole("group", { name: "Verteiler" }).title).toContain(TITEL_KOPIEN);
    expect(screen.getByRole("checkbox", { name: "S3 grün" }).closest("label")?.title).toContain("bearbeiten");
    cleanup();
    render(<Stellenabfrage vorbelegung={{ stellen: [] }} aufBestaetigen={vi.fn()} aufAbbrechen={vi.fn()} />);
    expect(screen.getByLabelText("Handzeichen").closest("label")?.title).toBe(TITEL_HANDZEICHEN);
    expect(screen.getByRole("group", { name: "Stellen" }).title).toContain("Position im Stab");
  });
});
