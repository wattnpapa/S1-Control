/**
 * Regressionstests zum Nachzug der zweiten Runde (2026-11-18): Laufzettel,
 * Weitergabe, Lese-Ansicht, Fernmeldezentrale und Kleinigkeiten am Rand.
 *
 * - R2-Si P2-1, R2-LdF P2-3 (teilweise): Marke „Ersatzsichtung“; Weitergabe
 *   mit Aufnahmevermerk und Rückfrage ohne Nummer.
 * - Sichter P1-3 (Runde 1): „Sichten (3)“ und „wie zuletzt bei diesem Absender“.
 * - R2-ETB P3-3, R2-ETB P2-6, FM P2-7 (Runde 1): Lese-Ansicht mit Grund des
 *   Zurückziehens, „In der Lage zeigen“, „Aufnahme berichtigen“.
 * - R2-FM P2-7, R2-LdF P2-2, R2-LdF P2-7: Befördern prüft vor dem Schreiben,
 *   sagt die Abweichung, fragt beim Nummernsprung.
 * - R2-FaBe P3-1 bis P3-3, R2-Si P3-5, R2-FM P3-5, R2-LdF P2-8: Hinweiskasten,
 *   Statuszeile, „Stelle abgeben“, Druckverzeichnis, Rückgängig-Wort.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { weitereMitStellen } from "./arbeitsplatzzahl.js";
import { Aufnahmeberichtigung, berichtigbar } from "./Aufnahmeberichtigung.js";
import { obersterSchritt } from "./bestaetigungsfolge.js";
import { befoerderungGeaendert } from "./befoerderungspruefung.js";
import { druckverzeichnisBestaetigt } from "./Druckeinstellungen.js";
import { Fmzmaske, fernmelderwahl } from "./Fmzmasken.js";
import { Hinweiskasten, TEXT_SOFORT_OHNE_TON } from "./Hinweiskasten.js";
import { useLaden } from "./laden.js";
import { Laufzettel } from "./Laufzettel.js";
import { istErsatzsichtung, zuletztBeiAbsender } from "./Laufzettelzusatz.js";
import { Weitergabemaske, aufnahmevermerkText } from "./Ldfmaske.js";
import { useLagesprung } from "./nachrichtenbezug.js";
import { Nachrichtenansicht, zurueckgezogenSatz } from "./Nachrichtenansicht.js";
import { Nachrichtenliste } from "./Nachrichtenliste.js";
import { Wegzusatz } from "./Nachweisung.js";
import { Warteschlange } from "./Fernmeldezentrale.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, VOR_SICHTER } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Stellenabfrage } from "./Stellenabfrage.js";
import { vorbehaltstext } from "./Stellenvorbehalt.js";
import { Nachrichtenband } from "./Nachrichtenkopf.js";
import { warnstufen } from "./warnungsstufen.js";
import { vorbehaltstextFuer } from "../kontrakt/stellenvorbehalt.js";

afterEach(cleanup);

let attrappe: Attrappe;
const JETZT = "2026-11-16T09:45:00.000Z";
const entwuerfe = (): Entwurf[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
const AUFGENOMMEN: Nachrichtenzeile = { ...VOR_SICHTER, id: "N-ein", laufzustand: "VOR_LDF", betreff: "Brücke gesperrt", gegenstelle: "Heros 10", aufnahme: { mittel: "FUNK", zeitpunkt: JETZT, handzeichen: "Fm" } };
const ERSATZ: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-ersatz", ersatzsichtung: true, sichtung: { zeitpunkt: JETZT, handzeichen: "Fm", verteiler: [{ stelle: "S2", kopie: "ROT" }] } } as Nachrichtenzeile;

function sitzung(stellen: readonly string[], teile: Partial<Lagebild> = {}): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: [...stellen], handzeichen: "Fm" }, ...teile } });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

describe("R2-Si P2-1: Ersatzsichtung", () => {
  it("trägt die Marke in der Zeile und im Laufzettel; erkannt auch am Grund", () => {
    expect(istErsatzsichtung({ ...BLITZ_AN_S4, sichtungGrund: "Kein Sichter besetzt: Ersatzsichter" } as Nachrichtenzeile)).toBe(true);
    expect(istErsatzsichtung(BLITZ_AN_S4)).toBe(false);
    render(<Nachrichtenliste zeilen={[ERSATZ]} beschriftung="Liste" gewaehltId={undefined} stellen={["S4"]} posteingang={false} aufWahl={vi.fn()} aufLesen={vi.fn()} aufKontext={vi.fn()} />);
    expect(screen.getByRole("row", { name: /Pumpen/u }).textContent).toContain("Ersatzsichtung (Fm)");
    cleanup();
    sitzung(["SICHTER"]);
    render(<Laufzettel zeile={ERSATZ} handzeichen="Si" nurLesen={false} aufGesichtet={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Laufzettel/u }).textContent).toContain("Ersatzsichtung (Fm)");
  });
});

describe("R2-FaBe P1-4: eigene Nachricht im Posteingang", () => {
  it("nennt die Kopie des eigenen Ausgangs „eigene Nachricht“ statt „grün: bearbeiten“", () => {
    const eigen = { ...BLITZ_AN_S4, verteiler: [{ stelle: "S4", kopie: "GRUEN", gelesen: true, erledigt: false, eigenerAusgang: true }] } as unknown as Nachrichtenzeile;
    render(<Nachrichtenliste zeilen={[eigen]} beschriftung="Liste" gewaehltId={undefined} stellen={["S4"]} posteingang aufWahl={vi.fn()} aufLesen={vi.fn()} aufKontext={vi.fn()} />);
    const zeile = screen.getByRole("row", { name: /Pumpen/u });
    expect(zeile.textContent).toContain("eigene Nachricht");
    expect(zeile.textContent).not.toContain("grün: bearbeiten");
  });
});

describe("Sichter P1-3: Empfängerzahl und Vorschlag", () => {
  it("zählt die Empfänger am Knopf, nennt sie daneben und schlägt den Verteiler der letzten Sichtung des Absenders vor", () => {
    const frueher: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-alt", sichtung: { zeitpunkt: "2026-11-16T08:00:00.000Z", handzeichen: "Si", verteiler: [{ stelle: "S3", kopie: "GRUEN" }, { stelle: "S2", kopie: "ROT" }, { stelle: "S1", kopie: "BLAU" }] } };
    expect(zuletztBeiAbsender([frueher], VOR_SICHTER)?.map((v) => v.stelle)).toEqual(["S3", "S2", "S1"]);
    expect(zuletztBeiAbsender([frueher], { ...VOR_SICHTER, absender: "Polizei" })).toBeUndefined();
    sitzung(["SICHTER"]);
    render(<Laufzettel zeile={VOR_SICHTER} handzeichen="Si" nurLesen={false} aufGesichtet={vi.fn()} verlauf={[frueher]} />);
    const zettel = screen.getByRole("region", { name: "Laufzettel des Sichters" });
    expect(within(zettel).getByRole("button", { name: "Sichten (1)" })).toBeDefined();
    expect(zettel.textContent).toContain("Wie zuletzt bei diesem Absender: S3 grün, S2 rot, S1 blau");
    fireEvent.click(within(zettel).getByRole("button", { name: "Übernehmen" }));
    expect(within(zettel).getByRole("button", { name: "Sichten (3)" })).toBeDefined();
    expect(zettel.querySelector(".verteilerkurz")?.textContent).toBe("S3 grün, S2 rot, S1 blau");
  });
});

describe("R2-LdF P2-3: Weitergabe an den Sichter", () => {
  it("zeigt den Aufnahmevermerk und fragt ohne Nummer einmal nach", async () => {
    expect(aufnahmevermerkText({ ...AUFGENOMMEN, nummer: 7 })).toMatch(/^Funk 161045NOV26 Fm · von Heros 10 · Nr\. 7$/u);
    sitzung(["LDF"]);
    render(<Weitergabemaske zeile={AUFGENOMMEN} handzeichen="Ld" aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form");
    expect(maske.textContent).toContain("Aufnahme: Funk 161045NOV26 Fm · von Heros 10 · ohne Nummer");
    fireEvent.click(within(maske).getByRole("button", { name: "Weitergeben" }));
    fireEvent.click(await within(maske).findByRole("button", { name: "Trotzdem ohne Nummer weitergeben" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.typ).toBe("NachrichtWeitergegeben");
  });
});

describe("Lese-Ansicht: zurückgezogen, Lage, Aufnahme berichtigen", () => {
  it("nennt den Grund des Zurückziehens oben (R2-ETB P3-3)", () => {
    const zurueck = { ...BLITZ_AN_S4, zurueckgezogen: true, zurueckgezogenMit: { zeitpunkt: JETZT, grund: "doppelt aufgegeben" } } as Nachrichtenzeile;
    expect(zurueckgezogenSatz(zurueck)).toBe("Zurückgezogen 161045NOV26 · Grund: doppelt aufgegeben");
    expect(zurueckgezogenSatz({ ...zurueck, zurueckgezogenText: "Zurückgezogen von S4: Fehlanlage" } as Nachrichtenzeile)).toBe("Zurückgezogen von S4: Fehlanlage");
    render(<Nachrichtenansicht zeile={zurueck} aufSchliessen={vi.fn()} />);
    expect(within(screen.getByRole("dialog")).getByRole("note").textContent).toContain("doppelt aufgegeben");
  });

  it("zeigt den Bezug als „In der Lage zeigen“ und wählt dort die Einheit (R2-ETB P2-6)", () => {
    const aufLage = vi.fn();
    const zu = vi.fn();
    render(<Nachrichtenansicht zeile={{ ...BLITZ_AN_S4, anschriftBezug: { entitaet: "EINHEIT", id: "E-7" } } as Nachrichtenzeile} aufSchliessen={zu} aufLage={aufLage} />);
    fireEvent.click(screen.getByRole("button", { name: "In der Lage zeigen (Anschrift)" }));
    expect(useLagesprung.getState()).toMatchObject({ einheitId: "E-7", abschnittId: undefined });
    expect(aufLage).toHaveBeenCalledTimes(1);
    expect(zu).toHaveBeenCalledTimes(1);
  });

  it("bietet der FmZ „Aufnahme berichtigen“ an und schreibt mit Vorwert und Grund (FM P2-7)", async () => {
    expect(berichtigbar(AUFGENOMMEN, ["FMZ"], false)).toBe(true);
    expect(berichtigbar(AUFGENOMMEN, ["S4"], false)).toBe(false);
    expect(berichtigbar({ ...AUFGENOMMEN, zurueckgezogen: true }, ["FMZ"], false)).toBe(false);
    sitzung(["FMZ"]);
    render(<Aufnahmeberichtigung zeile={AUFGENOMMEN} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Aufnahme berichtigen" });
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Grund der Berichtigung eintragen");
    fireEvent.change(within(maske).getByLabelText("Mittel"), { target: { value: "TELEFON" } });
    fireEvent.change(within(maske).getByLabelText("Grund"), { target: { value: "Mittel verwechselt" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Berichtigen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtAufnahmeBerichtigt", vorher: AUFGENOMMEN.aufnahme, neu: { mittel: "TELEFON", handzeichen: "Fm" }, grund: "Mittel verwechselt", vorwertPruefen: true });
  });
});

describe("Fernmeldezentrale: Befördern und Nachweisen", () => {
  const AUSGANG: Nachrichtenzeile = { ...BLITZ_AN_S4, id: "N-aus", richtung: "AUSGANG", richtungKurz: "A", nummer: undefined, laufzustand: "VOR_FMZ", verteiler: [], vorschlag: { mittel: "TELEFON", zeitpunkt: JETZT, handzeichen: "Ld", fernmelder: "Fm2" } } as Nachrichtenzeile;

  it("zeigt die Konfliktmeldung, wenn inzwischen befördert wurde, und schreibt nicht (R2-FM P2-7)", async () => {
    expect(befoerderungGeaendert(AUSGANG, AUSGANG)).toBeUndefined();
    sitzung(["FMZ"]);
    attrappe.antwortet("nachrichtAnfordern", { ...AUSGANG, befoerderung: { mittel: "FUNK", zeitpunkt: JETZT, handzeichen: "Zw" } });
    render(<Fmzmaske schritt="befoerderung" zeile={AUSGANG} handzeichen="Ha" naechsteNummer={5} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form");
    // R2-LdF P2-2: Das Mittel weicht vom Vorschlag ab — die Maske sagt es vorher.
    fireEvent.change(within(maske).getByLabelText("Mittel"), { target: { value: "FUNK" } });
    expect(maske.textContent).toContain("Weicht vom Vorschlag des LdF ab: Telefon (Fm2)");
    fireEvent.change(within(maske).getByLabelText(/Quittung der Gegenstelle/u), { target: { value: "1046" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    expect((await within(maske).findByRole("alert")).textContent).toContain("Inzwischen von einem anderen Arbeitsplatz befördert: Beförderung ist jetzt 1045 Zw (Funk)");
    expect(entwuerfe()).toHaveLength(0);
  });

  it("fragt beim Nachweisen über die nächste freie Nummer einmal nach (R2-LdF P2-7)", async () => {
    sitzung(["FMZ"]);
    render(<Fmzmaske schritt="nachweis" zeile={AUSGANG} handzeichen="Ha" naechsteNummer={6} vergebeneNummern={[1, 2, 3, 4, 5]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form");
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "50" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Nachweisen" }));
    fireEvent.click(await within(maske).findByRole("button", { name: "Trotzdem Nr. 50" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtNachgewiesen", neu: { nummer: 50 } });
  });

  it("zeigt die Marken des Wegs aus Ring 2: ohne Vorschlag, Verfasser = Nachweiser, LdF nicht besetzt", () => {
    render(<Wegzusatz zeile={{ ...AUSGANG, ohneVorschlag: true, verfasserGleichNachweiser: true } as Nachrichtenzeile} />);
    expect(document.body.textContent).toContain("ohne Vorschlag");
    expect(document.body.textContent).toContain("Verfasser = Nachweiser");
    cleanup();
    render(<Warteschlange zeilen={[{ ...AUSGANG, laufzustand: "VOR_LDF", ldfNichtBesetzt: true } as Nachrichtenzeile]} jetzt={JETZT} gewaehltId={undefined} nurLesen={false} aufWahl={vi.fn()} aufSchritt={vi.fn()} ldfBesetzt={false} />);
    // Review Runde 2: ein Satz über der Schlange statt einer Marke je Zeile.
    expect(document.body.textContent).toContain("Kein LdF besetzt: Die Fernmelder befördern selbst");
  });

  it("fragt vor dem Befördern ohne Vorschlag des besetzten LdF (R2-LdF P2-1)", async () => {
    sitzung(["FMZ"]);
    attrappe.antwortet("nachrichtAnfordern", AUSGANG);
    const ohne = { ...AUSGANG, vorschlag: undefined } as Nachrichtenzeile;
    render(<Fmzmaske schritt="befoerderung" zeile={ohne} handzeichen="Ha" naechsteNummer={5} vergebeneNummern={[]} aufSchliessen={vi.fn()} ldfWartet />);
    const maske = screen.getByRole("form");
    fireEvent.change(within(maske).getByLabelText(/Quittung der Gegenstelle/u), { target: { value: "1046" } });
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "5" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Befördern" }));
    fireEvent.click(await within(maske).findByRole("button", { name: "Ohne Vorschlag befördern" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.typ).toBe("NachrichtBefoerdert");
  });

  it("meldet Sätze des Workers in ihrer Stufe (R2-ETB P3-1)", () => {
    expect(warnstufen({ warnungen: ["a", "b"], warnungStufen: ["warnung", "info"] } as never, "info").map((w) => w.stufe)).toEqual(["warnung", "info"]);
    expect(warnstufen({ warnungen: ["a"] }, "info")[0]?.stufe).toBe("info");
  });

  it("bietet als Fernmelder die besetzten Plätze der FmZ an (R2-LdF P3-4)", () => {
    expect(fernmelderwahl(["Hans", "Zwerg"], "")).toEqual(["Hans", "Zwerg"]);
    expect(fernmelderwahl(undefined, "")).toEqual(["Fm1", "Fm2", "Fm3"]);
    expect(fernmelderwahl(["Hans"], "Fm2")).toEqual(["Fm2", "Hans"]);
  });
});

describe("Am Rand: Hinweiskasten, Statuszeile, Stelle, Druck, Rückgängig", () => {
  it("sagt am Sofort-Hinweis, dass er ohne Ton kommt, und schließt reine Auskünfte ohne Rückfrage (R2-FaBe P3-1, P3-2)", () => {
    useLaden.setState({ hinweise: [{ nummer: 1, stufe: "info", text: "Sofort-Nachricht E 3 für S4: Sanitäter früher" }] });
    render(<Hinweiskasten />);
    const kasten = screen.getByRole("region", { name: "Hinweise" });
    expect(kasten.textContent).toContain(TEXT_SOFORT_OHNE_TON);
    fireEvent.click(within(kasten).getByRole("button", { name: "Alle schließen" }));
    expect(useLaden.getState().hinweise).toEqual([]);
  });

  it("nennt in der Statuszeile die Stellen der weiteren Arbeitsplätze (R2-FaBe P3-3)", () => {
    const peer = (stellen: readonly string[], veraltet = false): Lagebild["peers"][number] => ({ veraltet, stellen }) as unknown as Lagebild["peers"][number];
    expect(weitereMitStellen({ peers: [peer(["FMZ"]), peer(["LDF"]), peer(["SICHTER"]), peer(["S2"]), peer(["S3"], true)] })).toBe("4 weitere: FmZ, LdF, Sichter, S2");
    expect(weitereMitStellen({ peers: [peer(["FMZ"])] })).toBe("1 weiterer: FmZ");
    expect(weitereMitStellen({ peers: [peer([])] })).toBe("1 weiterer Arbeitsplatz");
  });

  it("bietet „Stelle abgeben“ an, wenn die Sitzung eine Stelle hat (R2-Si P3-5)", () => {
    const abgeben = vi.fn();
    render(<Stellenabfrage vorbelegung={{ stellen: ["SICHTER"], handzeichen: "Si" }} aufBestaetigen={vi.fn()} aufAbbrechen={vi.fn()} aufAbgeben={abgeben} />);
    fireEvent.click(screen.getByRole("button", { name: "Stelle abgeben" }));
    expect(abgeben).toHaveBeenCalledTimes(1);
  });

  it("sagt beim Übernehmen, wenn sich das Druckverzeichnis nicht prüfen lässt (R2-FM P3-5)", async () => {
    attrappe.scheitert("verzeichnisPruefen", "unbekannt");
    expect(await druckverzeichnisBestaetigt({ blatt: "a5", modus: "verzeichnis", pfad: "X:\\druck", drucker: "" })).toBe(true);
    expect(useLaden.getState().hinweise.at(-1)?.text).toContain("ließ sich nicht prüfen");
  });

  it("nimmt den Wortlaut des Vorbehalts aus dem Kontrakt (R2-FaBe P2-7) und nennt den unbesetzten LdF im Band (R2-LdF P3-3)", () => {
    expect(vorbehaltstext("befoerderung")).toBe(vorbehaltstextFuer("befoerderung"));
    render(<Nachrichtenband lage={{ neuFuerStellen: 0, vorFmz: 0, vorSichter: 0, vorLdf: 2, mitVorrangOffen: 0, ueberSchwelle: 0 }} ldfBesetzt={false} />);
    expect(screen.getByText("beim LdF (nicht besetzt)")).toBeDefined();
  });

  it("nennt „Rückgängig“ nach dem Bedienschritt mit Folgen (R2-LdF P2-8)", () => {
    expect(obersterSchritt({ ...NACHRICHTEN_LAGEBILD, undoObersteArt: "NachrichtGesichtet", undoObersteSchritt: "Eingang aufnehmen (mit Nummer und Sichtung)" } as Lagebild)).toBe("Eingang aufnehmen (mit Nummer und Sichtung)");
  });
});
