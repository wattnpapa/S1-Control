/**
 * Regressionstests zum Nachzug der zweiten Runde (2026-11-18), Blatt
 * „Nachrichten“ und seine Sichten:
 *
 * - R2-FaBe P2-1, P2-4, P2-9: Reiter „Eingangskorb“, „Öffnen“ statt „Lesen“,
 *   Ausgang ohne fremde Eingänge, Gesprächsnotiz als „Notiz“.
 * - R2-LdF P2-7: Nummernlücken in der Sicht Nachweisung.
 * - R2-FM P2-5, R2-Si P2-2, R2-FM P3-3: „Ich sichte jetzt selbst“ bei säumigem Sichter.
 * - R2-LdF P2-4, P2-6, P2-2: Sicht LdF mit Absender, Nummer, Wartezeit und
 *   Marke; Zeitraum der Nachweisungsausgabe; Marke „abweichend“.
 * - R2-LdF P3-6, R2-Si P3-4: Sichtungszeile über die volle Breite.
 * - R2-FaBe P3 (zurückgezogen): kein Knopf, eingeklappt im Posteingang.
 * - R2-Si P3-2: leere Sicht Sichter nennt den LdF.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Lagebild } from "../kontrakt/index.js";
import { BLAETTER } from "./blaetter.js";
import { SATZ_EINGANGSKORB, einstiegszusatz } from "./einstiegszusatz.js";
import { useLaden } from "./laden.js";
import { Ldfsicht, ldfUeberSchwelle } from "./Ldfsicht.js";
import { Nachrichten } from "./Nachrichten.js";
import { nachrichtenknoepfe, type NachrichtenauswahlEigenschaften } from "./Nachrichtenauswahl.js";
import { beimLdfText, getrennt, lueckentext, sichtzeilen } from "./Nachrichtenflaeche.js";
import { Nachweisung, abweichung } from "./Nachweisung.js";
import { Nachweisungsausgabe, zeitraumAus } from "./Nachweisungsausgabe.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, VOR_SICHTER, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Sichterstaukarte, saeumigText, selbstSichtbar, sichterschwelle, sichtername, wartetMinuten } from "./Sichterstau.js";

afterEach(cleanup);

let attrappe: Attrappe;
const JETZT = "2026-11-16T09:45:00.000Z";
const SICHTER_PEER = { clientId: "b", anzeigename: "Sichtung", rechnername: "PC-2", veraltet: false, wanduhr: JETZT, stellen: ["SICHTER"], handzeichen: "Si" } as unknown as Lagebild["peers"][number];
const AUSGANG: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-aus", richtung: "AUSGANG", richtungKurz: "A", nummer: 4, betreff: "Sandsäcke", absender: "S4", laufzustand: "VOR_LDF", verteiler: [] };
const NOTIZ: Nachrichtenzeile = { ...VOR_SICHTER, id: "N-notiz", gespraechsnotiz: true, betreff: "Telefonat Polizei" };

function sitzung(stellen: readonly string[], teile: Partial<Lagebild> = {}): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: [...stellen], handzeichen: "Mü" }, ...teile } });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_AN_S4]));
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

describe("R2-FaBe P2-1, P2-4, P2-9: Wörter und Sicht Ausgang", () => {
  it("heißt der Reiter „Eingangskorb“ und sagt die Einstiegszeile, wo Nachrichten ankommen", () => {
    expect(BLAETTER.find((b) => b.schluessel === "eingang")?.titel).toBe("Eingangskorb");
    expect(einstiegszusatz("eingang.eingangskorb", [])).toEqual([SATZ_EINGANGSKORB]);
    expect(SATZ_EINGANGSKORB).toContain("Posteingang");
  });

  it("heißt der Hauptknopf „Öffnen“, und sein Titel nennt die Kenntnisnahme", () => {
    const p = { zeile: BLITZ_AN_S4, stellen: ["S4"], nurLesen: false, sperre: undefined } as unknown as NachrichtenauswahlEigenschaften;
    const oeffnen = nachrichtenknoepfe(p)[0];
    expect(oeffnen?.text).toBe("Öffnen");
    expect(oeffnen?.titel).toMatch(/Kenntnis/u);
  });

  it("zeigt im Ausgang nur Ausgänge und Gesprächsnotizen; die Notiz heißt „Notiz“", async () => {
    expect(sichtzeilen("ausgang", [BLITZ_AN_S4, AUSGANG, NOTIZ]).map((z) => z.id)).toEqual(["N-aus", "N-notiz"]);
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_AN_S4, AUSGANG, NOTIZ]));
    sitzung(["S4"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("group", { name: "Sicht" })).getByRole("button", { name: "Ausgang" }));
    const tabelle = await screen.findByRole("table", { name: "Nachrichten: Ausgang" });
    expect(within(tabelle).queryByText("Pumpen eingetroffen")).toBeNull();
    expect(within(within(tabelle).getByRole("row", { name: /Telefonat Polizei/u })).getByText("Notiz")).toBeDefined();
  });
});

describe("R2-LdF P2-7: Nummernlücken am Bildschirm", () => {
  it("fasst die fehlenden Nummern zu Bereichen und zeigt sie über der Nachweisung", async () => {
    expect(lueckentext([51, ...Array.from({ length: 44 }, (_, i) => i + 6)])).toBe("6–49, 51");
    attrappe.antwortet("nachrichtenAnfordern", { ...nachrichtenansicht([BLITZ_AN_S4]), nummernluecken: [2, 3, 5] });
    sitzung(["FMZ"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Nachweisung" }));
    expect((await screen.findByText(/^Fehlende Nummern:/u)).textContent).toBe("Fehlende Nummern: 2–3, 5");
  });
});

describe("R2-FM P2-5, R2-Si P2-2, R2-FM P3-3: säumiger Sichter", () => {
  const wartet = (stufe: 0 | 1 | 2, minuten: number): Nachrichtenzeile => ({ ...VOR_SICHTER, id: `N-${String(stufe)}-${String(minuten)}`, vorrangstufe: stufe, wartetSeitSichter: minuten });

  it("öffnet „Ich sichte jetzt selbst“ je Vorrang: Blitz ab 5, Sofort ab 10, sonst die Einsatzschwelle", () => {
    expect(selbstSichtbar(wartet(0, 5), true, 20)).toBe(true);
    expect(selbstSichtbar(wartet(0, 4), true, 20)).toBe(false);
    expect(selbstSichtbar(wartet(1, 9), true, 20)).toBe(false);
    expect(selbstSichtbar(wartet(1, 10), true, 20)).toBe(true);
    expect(selbstSichtbar(wartet(2, 19), true, 20)).toBe(false);
    expect(sichterschwelle(0, { einsatz: 20, blitz: 2 })).toBe(2);
    expect(sichterschwelle(0, 3)).toBe(3);
    // Sagt Ring 2 es selbst, gilt das.
    expect(selbstSichtbar({ ...wartet(2, 1), sichterSchwelleUeberschritten: true } as Nachrichtenzeile, true, 20)).toBe(true);
  });

  it("rechnet die Minuten aus `vorSichterSeit` gegen die Uhr der Ansicht, nicht „seit 0 min“", () => {
    const zeile: Nachrichtenzeile = { ...VOR_SICHTER, vorSichterSeit: "2026-11-16T09:33:00.000Z", wartetSeitSichter: 0 };
    expect(wartetMinuten(zeile, JETZT)).toBe(12);
    expect(wartetMinuten({ ...VOR_SICHTER, wartetSeitSichter: 3 }, undefined)).toBe(3);
  });

  it("nennt Sichter und Wartezeit über der Karte", () => {
    expect(sichtername([SICHTER_PEER])).toBe("Sichtung (Hz. Si)");
    render(<Sichterstaukarte zeilen={[{ ...wartet(0, 7), betreff: "Deich bricht" }]} sichterDa sichter="Sichtung (Hz. Si)" schwelleMinuten={20} nurLesen={false} aufSelbst={vi.fn()} />);
    const karte = screen.getByRole("region", { name: "Vor dem Sichter" });
    expect(karte.textContent).toContain(saeumigText("Sichtung (Hz. Si)", 1, 7));
    expect(karte.textContent).toContain("der älteste seit 7 min");
    expect(within(karte).getByRole("button", { name: "Ich sichte jetzt selbst" })).toBeDefined();
  });
});

describe("R2-LdF P2-4: Sicht LdF", () => {
  it("zeigt Nummer, Absender und die Wartezeit beim LdF, über der Schwelle mit Marke", () => {
    const wartend = { ...AUSGANG, wartetSeitLdf: 25 } as Nachrichtenzeile;
    expect(ldfUeberSchwelle(wartend, 20)).toBe(true);
    render(<Ldfsicht zeilen={[wartend]} handzeichen="Ld" nurLesen={false} aufVorschlag={vi.fn()} schwelleMinuten={20} />);
    const karte = screen.getByRole("region", { name: "Ausgänge vor der Zuteilung" });
    expect(within(karte).getAllByRole("columnheader").map((k) => k.textContent)).toEqual(expect.arrayContaining(["Nr.", "Absender", "Wartet"]));
    const zeile = within(karte).getByRole("row", { name: /Sandsäcke/u });
    expect(zeile.className).toBe("ueberschwelle");
    expect(zeile.textContent).toContain("25 min über der Schwelle");
  });
});

describe("R2-LdF P2-6: Zeitraum der Nachweisungsausgabe", () => {
  it("liest von und bis, sperrt bei Unlesbarem und schickt beides mit", async () => {
    const jetzt = new Date("2026-11-17T12:00:00.000Z");
    expect(zeitraumAus("", "", jetzt)).toEqual({});
    expect(zeitraumAus("gestern", "", jetzt)).toMatch(/„von“/u);
    expect(zeitraumAus("171300nov26", "170900nov26", jetzt)).toBe("„von“ liegt nach „bis“");
    attrappe.antwortet("ausgabeErzeugen", { pfad: "ausgaben/nachweisung.html", bytes: 1 });
    useLaden.setState({ umgebung: { plattform: "web" } as unknown as ReturnType<typeof useLaden.getState>["umgebung"] });
    render(<Nachweisungsausgabe />);
    fireEvent.change(screen.getByLabelText("von"), { target: { value: "170800nov26" } });
    fireEvent.change(screen.getByLabelText("bis"), { target: { value: "172000nov26" } });
    fireEvent.click(screen.getByRole("button", { name: "Nachweisung ausgeben" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Nachweisung als HTML" }));
    await waitFor(() => expect(attrappe.letzterRuf("ausgabeErzeugen")).toMatchObject({ ausgabe: "nachweisung", format: "html" }));
    const ruf = attrappe.letzterRuf("ausgabeErzeugen");
    expect(typeof ruf?.von).toBe("string");
    expect(Date.parse(ruf?.bis ?? "") - Date.parse(ruf?.von ?? "")).toBe(12 * 3_600_000);
  });
});

describe("Nachweisung: Abweichung, zurückgezogen, volle Breite", () => {
  const befoerdert: Nachrichtenzeile = {
    ...AUSGANG,
    laufzustand: "ERLEDIGT",
    vorschlag: { mittel: "TELEFON", zeitpunkt: JETZT, handzeichen: "Ld", fernmelder: "Fm2" },
    befoerderung: { mittel: "FUNK", zeitpunkt: JETZT, handzeichen: "Fm" },
  };
  const eigenschaften = { gewaehltId: undefined, nurLesen: false, aufWahl: vi.fn(), aufSchritt: vi.fn() };

  it("markiert die Abweichung vom Vorschlag des LdF (R2-LdF P2-2)", () => {
    expect(abweichung(befoerdert)).toContain("Vorschlag des LdF: Telefon");
    expect(abweichung({ ...befoerdert, abweichungVomVorschlag: false } as unknown as Nachrichtenzeile)).toBeUndefined();
    expect(abweichung({ ...befoerdert, abweichungVomVorschlag: "Funk statt Telefon (Fm statt Fm2)" } as Nachrichtenzeile)).toBe("Funk statt Telefon (Fm statt Fm2)");
    render(<Nachweisung zeilen={[befoerdert]} {...eigenschaften} />);
    expect(within(screen.getByRole("row", { name: /Sandsäcke/u })).getByText("abweichend")).toBeDefined();
  });

  it("bietet an einer zurückgezogenen Nachricht weder „Nachweisen“ noch „Berichtigen“ an", () => {
    render(<Nachweisung zeilen={[{ ...befoerdert, zurueckgezogen: true }]} {...eigenschaften} />);
    expect(screen.queryByRole("button", { name: /Nachweisen|Berichtigen/u })).toBeNull();
  });

  it("lässt die Sichtungszeile über alle Spalten laufen (R2-LdF P3-6, R2-Si P3-4)", () => {
    const seite = Object.values(import.meta.glob("./index.html", { eager: true, query: "?raw", import: "default" }))[0] as string;
    expect(seite).toMatch(/\.unterzeile td\.zeilenvermerk \{\s*display: table-cell;/u);
    expect(seite).toMatch(/section\.laufzettel \.verteilerraster \.verteilerzeilen \{[^}]*overflow-y: auto;[^}]*padding-bottom: var\(--fussleiste-hoehe\);/u);
    expect(seite).toMatch(/\.maskenknoepfe > \.fussfrage \{\s*flex: 1 1 100%;/u);
  });
});

describe("Posteingang und Sicht Sichter", () => {
  it("klappt zurückgezogene Nachrichten im Posteingang unter „zurückgezogen“ ein", async () => {
    const zurueck: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-zurueck", betreff: "Doppelt", zurueckgezogen: true };
    expect(getrennt("posteingang", [BLITZ_AN_S4, zurueck]).zurueck.map((z) => z.id)).toEqual(["N-zurueck"]);
    expect(getrennt("ausgang", [zurueck]).zurueck).toEqual([]);
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_AN_S4, zurueck]));
    sitzung(["S4"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    await screen.findByRole("table", { name: "Nachrichten: Posteingang" });
    const klappe = screen.getByText("zurückgezogen (1)").closest("details");
    expect(klappe?.open).toBe(false);
    expect(within(klappe as HTMLElement).getByRole("table", { name: "Nachrichten: Posteingang, zurückgezogen" })).toBeDefined();
  });

  it("sagt in der leeren Sicht Sichter, was noch beim LdF liegt (R2-Si P3-2)", async () => {
    expect(beimLdfText(2)).toBe("2 Nachrichten liegen noch beim LdF.");
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([]));
    sitzung(["SICHTER"], { nachrichten: { neuFuerStellen: 0, vorFmz: 0, vorSichter: 0, vorLdf: 1, mitVorrangOffen: 0, ueberSchwelle: 0 } });
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    expect((await screen.findByText(/Keine Nachricht in „Sichter“/u)).textContent).toContain("1 Nachricht liegt noch beim LdF.");
  });
});
