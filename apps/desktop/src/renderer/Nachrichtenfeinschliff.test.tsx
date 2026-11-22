/**
 * Regressionstests zu den P3-Befunden der fünf Rollen-Audits vom 2026-11-17
 * (Beschriftungen, Hinweise, Vorbelegungen): je Befund ein kleiner Fall.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import { DOPPELT_FENSTER_MS, findeDoppelten } from "./doppelterAusgang.js";
import { Einstiegszeile } from "./Einstiegszeile.js";
import { Hinweiskasten, INFO_VERFALL_MS, abgelaufeneInfos } from "./Hinweiskasten.js";
import { useLaden } from "./laden.js";
import { Nachweisung } from "./Nachweisung.js";
import { Nachrichtenliste } from "./Nachrichtenliste.js";
import { antwortVorlage, bezugskennung, dtg, leereMaske } from "./nachrichtenformate.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { baueAttrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Stellenabfrage, abfolge } from "./Stellenabfrage.js";
import { gemerkteStelle, merkeStelle, STELLENMERKER_MAX_ALTER_MS } from "./stellenmerker.js";
import { FmzTeil, LaufzettelAnzeige, verteilerleer } from "./Vordruckteile.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
});

const ZURUECK: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-weg", betreff: "Doppelt aufgegeben", zurueckgezogen: true, laufzustand: "ZURUECKGEZOGEN", richtung: "AUSGANG", richtungKurz: "A" };
const OHNE_NUMMER: Nachrichtenzeile = { ...ZURUECK, nummer: undefined as never };

describe("ETB P3-2, LdF P3-1: „Nr.“ ohne (E) bei gemeinsamer Zählung", () => {
  it("nennt die Nummer ohne Zusatz und die Richtung für sich", () => {
    render(<FmzTeil zeile={BLITZ_AN_S4} />);
    const teil = screen.getByRole("group", { name: "Vermerke der Fernmeldezentrale" });
    expect(teil.textContent).toContain("Nr. 26");
    expect(teil.textContent).not.toContain("Nr. (E)");
    expect(teil.textContent).toContain("Richtung Eingang");
  });
});

describe("SGL P3-18: Ausgang zeigt keinen Laufzettel „noch nicht gesichtet“", () => {
  it("sagt „entfällt“ beim Ausgang und „noch nicht gesichtet“ beim Eingang", () => {
    expect(verteilerleer({ ...BLITZ_AN_S4, richtungKurz: "A", befoerderung: { mittel: "FUNK", zeitpunkt: "2026-11-17T12:21:00.000Z", handzeichen: "Fm" }, laufzustand: "ERLEDIGT" }, false)).toMatch(/^entfällt \(Ausgang\)/u);
    // Review 2026-11-21: vor der Beförderung, beim LdF und vor dem Sichter sagt der Satz, wann die Kopien kommen.
    expect(verteilerleer({ ...BLITZ_AN_S4, richtungKurz: "A" }, false)).toBe("Kopien nach der Beförderung");
    expect(verteilerleer(BLITZ_AN_S4, false)).toBe("noch nicht gesichtet");
    expect(verteilerleer(BLITZ_AN_S4, true)).toBe("ohne Verteiler");
    render(<LaufzettelAnzeige zeile={{ ...BLITZ_AN_S4, richtungKurz: "A", verteiler: [], sichtung: undefined }} />);
    expect(screen.getByRole("group", { name: "Laufzettel" }).textContent).toContain("Kopien nach der Beförderung");
  });
});

describe("SGL P3-17: Antworten mit Bezug, Ruf-Nr. und Mittel", () => {
  it("nennt die Nummer im Betreff und übernimmt Ruf-Nr. und Mittel", () => {
    const eingang = { ...BLITZ_AN_S4, rufnummer: "0441 123", aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-16T09:10:00.000Z", handzeichen: "Fm" } };
    const antwort = antwortVorlage(eingang, { stellen: ["S4"], handzeichen: "Ru" }, new Date("2026-11-16T09:45:00Z"));
    expect(antwort).toMatchObject({ betreff: "Antwort auf E 26: Pumpen eingetroffen", rufnummer: "0441 123", uebermittlungswunsch: "FUNK" });
    expect(bezugskennung({ richtungKurz: "A", nummer: undefined })).toBe("A");
    // Eine Antwort auf eine Antwort bekommt kein zweites Präfix.
    expect(antwortVorlage({ ...eingang, betreff: "Antwort auf A 3: Sperrung" }, undefined).betreff).toBe("Antwort auf A 3: Sperrung");
  });
});

describe("SGL P3-20: zwei gleiche Ausgänge hintereinander", () => {
  const VOR_ZWEI_MINUTEN = new Date(Date.now() - 2 * 60_000).toISOString();
  const AUSGANG: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-aus", richtung: "AUSGANG", richtungKurz: "A", anschrift: "OV Wildeshausen", betreff: "Sandsäcke", inhalt: "500 Stück", abfassungszeit: VOR_ZWEI_MINUTEN, nummer: 4 };

  it("erkennt gleiche Anschrift, gleichen Betreff und Inhalt innerhalb der Frist", () => {
    const neu = { anschrift: " ov wildeshausen ", betreff: "Sandsäcke", inhalt: "500  Stück" };
    expect(findeDoppelten(neu, [AUSGANG])?.id).toBe("N-aus");
    expect(findeDoppelten({ ...neu, inhalt: "600 Stück" }, [AUSGANG])).toBeUndefined();
    expect(findeDoppelten(neu, [{ ...AUSGANG, zurueckgezogen: true }])).toBeUndefined();
    expect(findeDoppelten(neu, [{ ...AUSGANG, richtungKurz: "E" }])).toBeUndefined();
    expect(findeDoppelten(neu, [AUSGANG], Date.parse(VOR_ZWEI_MINUTEN) + DOPPELT_FENSTER_MS + 1)).toBeUndefined();
  });

  it("fragt beim ersten Aufgeben nach und gibt beim zweiten Klick auf", async () => {
    const attrappe = baueAttrappe();
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([AUSGANG]));
    useLaden.setState({ akteId: "akte-1", lagebild: NACHRICHTEN_LAGEBILD, fehler: undefined, hinweise: [] });
    const zu = vi.fn();
    render(<Nachrichtenmaske vorlage={{ ...leereMaske({ stellen: ["S4"], handzeichen: "Mü" }), anschrift: "OV Wildeshausen", betreff: "Sandsäcke", inhalt: "500 Stück" }} anschriften={[]} aufSchliessen={zu} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.click(within(maske).getByRole("button", { name: "Aufgeben" }));
    await waitFor(() => expect(within(maske).getByRole("alert").textContent).toContain("Nr. 4"));
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    fireEvent.click(within(maske).getByRole("button", { name: "Trotzdem aufgeben" }));
    await waitFor(() => expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1));
    expect(zu).toHaveBeenCalled();
  });
});

describe("LdF P3-2: eine Schreibweise der Datum-Zeit-Gruppe", () => {
  it("zeigt die Gruppe auf dem Blatt groß wie im Kopfband", () => {
    expect(dtg("2026-11-17T12:21:00Z")).toBe("171321NOV26");
    expect(dtg(undefined)).toBe("—");
  });
});

describe("ETB P3-4 und P3-5: zurückgezogen mit Wort, kein „Nachweisen“", () => {
  const eigenschaften = { gewaehltId: undefined, nurLesen: false, aufWahl: vi.fn(), aufSchritt: vi.fn() };

  it("trägt in der Nachweisung das Wort und bietet ohne Nummer kein „Nachweisen“ an", () => {
    render(<Nachweisung zeilen={[OHNE_NUMMER, { ...ZURUECK, id: "N-26" }]} {...eigenschaften} />);
    const tabelle = screen.getByRole("table", { name: "Nachweisung" });
    expect(within(tabelle).getAllByText("zurückgezogen").length).toBeGreaterThanOrEqual(2);
    expect(within(tabelle).queryByRole("button", { name: "Nachweisen" })).toBeNull();
    // R2-FaBe P3 (Nachzug): Auch mit Nummer kein „Berichtigen“ mehr an der zurückgezogenen Nachricht.
    expect(within(tabelle).queryByRole("button", { name: "Berichtigen" })).toBeNull();
  });

  it("schreibt im Posteingang „zurückgezogen“ statt „neu“", () => {
    render(<Nachrichtenliste zeilen={[ZURUECK]} beschriftung="Liste" gewaehltId={undefined} stellen={["S4"]} posteingang aufWahl={vi.fn()} aufLesen={vi.fn()} aufKontext={vi.fn()} />);
    const zeile = screen.getByRole("row", { name: /Doppelt aufgegeben/ });
    expect(within(zeile).getByText("zurückgezogen")).toBeDefined();
    expect(within(zeile).queryByText("neu")).toBeNull();
  });
});

describe("Fernmelder P3-7, LdF P3-4: der Hinweiskasten", () => {
  beforeEach(() => {
    useLaden.setState({ hinweise: [] });
  });

  it("trägt Uhrzeit je Hinweis, löscht auf Knopfdruck und lässt Warnungen stehen, wenn Auskünfte verfallen", () => {
    const jetzt = Date.parse("2026-11-17T10:00:00Z");
    const hinweise = [
      { nummer: 1, stufe: "info" as const, text: "In der Nachweisung unter Nummer 7 eingetragen.", zeit: jetzt - INFO_VERFALL_MS - 1 },
      { nummer: 2, stufe: "warnung" as const, text: "Nummer 7 ist bereits vergeben.", zeit: jetzt - INFO_VERFALL_MS - 1 },
      { nummer: 3, stufe: "info" as const, text: "Frisch.", zeit: jetzt },
      { nummer: 4, stufe: "info" as const, text: "Ohne Zeit." },
    ];
    expect(abgelaufeneInfos(hinweise, jetzt)).toEqual([1]);
    useLaden.setState({ hinweise });
    render(<Hinweiskasten />);
    const kasten = screen.getByRole("region", { name: "Hinweise" });
    expect(kasten.textContent).toContain("11:00 Frisch.");
    // R2-FaBe P3-1: „Alle schließen“ fragt bei Warnungen einmal nach.
    fireEvent.click(within(kasten).getByRole("button", { name: "Alle schließen" }));
    expect(useLaden.getState().hinweise).toHaveLength(4);
    fireEvent.click(within(kasten).getByRole("button", { name: "Ja, alle schließen" }));
    expect(useLaden.getState().hinweise).toEqual([]);
    expect(screen.queryByRole("region", { name: "Hinweise" })).toBeNull();
  });

  it("nimmt eine Auskunft nach ihrer Frist selbst weg", () => {
    vi.useFakeTimers();
    useLaden.setState({ hinweise: [] });
    useLaden.getState().melde("info", "In der Nachweisung unter Nummer 7 eingetragen.");
    useLaden.getState().melde("warnung", "Nummer 7 ist bereits vergeben.");
    render(<Hinweiskasten />);
    expect(screen.getByRole("region", { name: "Hinweise" }).textContent).toContain("Nummer 7 eingetragen");
    act(() => {
      vi.advanceTimersByTime(INFO_VERFALL_MS + 3_000);
    });
    const kasten = screen.getByRole("region", { name: "Hinweise" });
    expect(kasten.textContent).not.toContain("eingetragen");
    expect(kasten.textContent).toContain("bereits vergeben");
  });
});

describe("LdF P3-3, Fernmelder P3-3: die Stellenabfrage nach dem Neuladen", () => {
  it("merkt die Wahl je Tab, kennt die Frist des Rückfalls und ignoriert Unlesbares", () => {
    merkeStelle("E1", { stellen: ["FMZ"], handzeichen: "Ha" }, 1_000);
    expect(gemerkteStelle("E1", 2_000)).toEqual({ stellen: ["FMZ"], handzeichen: "Ha" });
    expect(gemerkteStelle("E2")).toBeUndefined();
    // Neuer Tab: nur der Rückfall im localStorage, und der nur, solange er jung ist.
    sessionStorage.clear();
    expect(gemerkteStelle("E1", 1_000 + STELLENMERKER_MAX_ALTER_MS)).toEqual({ stellen: ["FMZ"], handzeichen: "Ha" });
    expect(gemerkteStelle("E1", 1_001 + STELLENMERKER_MAX_ALTER_MS)).toBeUndefined();
    localStorage.setItem("s1.stelle.E3", "kein json");
    expect(gemerkteStelle("E3")).toBeUndefined();
  });

  it("stellt die Stationen voran und setzt den Fokus bei vollständiger Vorbelegung auf „Übernehmen“", () => {
    // 2026-11-21: LdF und Fm1 bis Fm3 statt der einen FmZ.
    expect(abfolge(["LEITER", "S1", "SICHTER", "FM2", "LDF"])).toEqual(["LDF", "FM2", "SICHTER", "LEITER", "S1"]);
    const bestaetigen = vi.fn();
    render(<Stellenabfrage vorbelegung={{ stellen: ["FM2"], handzeichen: "Ha" }} aufBestaetigen={bestaetigen} aufAbbrechen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: /Stelle und Handzeichen/ });
    expect(within(maske).getByRole("status").textContent).toContain("Zuletzt gewählt: Fm2 (Hz. Ha)");
    expect(document.activeElement?.textContent).toBe("Übernehmen");
    const kaestchen = within(maske).getAllByRole("checkbox").map((k) => k.parentElement?.textContent);
    expect(kaestchen.slice(0, 5)).toEqual(["LdF", "Fm1", "Fm2", "Fm3", "Sichter"]);
    fireEvent.click(within(maske).getByRole("button", { name: "Übernehmen" }));
    expect(bestaetigen).toHaveBeenCalledWith({ stellen: ["FM2"], handzeichen: "Ha" });
  });

  it("öffnet ohne Vorbelegung im ersten Feld und ohne Zuletzt-Satz", () => {
    render(<Stellenabfrage vorbelegung={{ stellen: [] }} aufBestaetigen={vi.fn()} aufAbbrechen={vi.fn()} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.activeElement?.tagName).toBe("INPUT");
  });
});

describe("LdF P3-4: das Einführungsband je Blatt einmal je Sitzung", () => {
  it("bleibt nach „Verstanden“ weg, auch wenn der Browserspeicher gesperrt ist", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    const { unmount } = render(<Einstiegszeile ort="nachrichten" />);
    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    unmount();
    render(<Einstiegszeile ort="nachrichten" />);
    expect(screen.queryByRole("complementary")).toBeNull();
    vi.restoreAllMocks();
  });
});

