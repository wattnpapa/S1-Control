/**
 * Regressionstests zum zweiten Durchlauf „Nachrichten“ (Stand be6f9b9,
 * docs/v2/entwurf/nachrichten/stand/README.md) und zu den offenen Befunden
 * der Audits vom 2026-11-17, die der Renderer allein schließen kann:
 * Laufzettel-Vorbelegung, Nachweisung am Bildschirm, Hinweis beim Befördern,
 * Fokusfalle (FM P2-8), Papier-Nachtrag (FM P2-3, P2-9), Konfliktmeldung
 * (FM P2-6), Reiterzähler (SGL P2-10), Stau vor dem Sichter (Sichter P1-4),
 * Warteschlange ohne Umbruch (FM P3-4, SGL P2-11) und der Weg vom
 * Konflikthinweis zur Nachricht.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild, Peer } from "../kontrakt/index.js";
import { TEXT_NUMMER_LEER, TEXT_OHNE_NUMMER } from "./Befoerderungszusatz.js";
import { Warteschlange } from "./Fernmeldezentrale.js";
import { Fmzmaske } from "./Fmzmasken.js";
import { useLaden } from "./laden.js";
import { Laufzettel } from "./Laufzettel.js";
import { Maske } from "./Maske.js";
import { leereMaske } from "./nachrichtenformate.js";
import { Nachrichten } from "./Nachrichten.js";
import { Nachrichtenhinweise, nachrichtIdAusPfad } from "./Nachrichtenhinweise.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { Nachweisung, unterzeileText } from "./Nachweisung.js";
import { PLATZHALTER_VOM_BLATT } from "./Papiernachtrag.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, VOR_SICHTER, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Reiterzeile } from "./Reiterzeile.js";
import { selbstSichtbar, sichterstauText } from "./Sichterstau.js";
import { TEXT_KEIN_HAUPTEMPFAENGER, hauptempfaengerWarnung, verteilerAusAnschrift } from "./Verteilerraster.js";
import { abweisungLesen, vermerkwert } from "./Vorwertkonflikt.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: NACHRICHTEN_LAGEBILD, fehler: undefined, hinweise: [] });
});

function entwuerfe(): Entwurf[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

/** Ein Ausgang vor der FmZ, angenommen, ohne Nummer. */
const AUSGANG: Nachrichtenzeile = {
  ...VOR_SICHTER,
  id: "N-aus",
  richtung: "AUSGANG",
  richtungKurz: "A",
  betreff: "Sandsäcke anfordern",
  anschrift: "OV Wildeshausen",
  absender: "S4",
  laufzustand: "VOR_FMZ",
  annahme: { zeitpunkt: "2026-11-16T09:20:00.000Z", handzeichen: "Fm" },
};

describe("Zweiter Durchlauf, Punkt 3: Laufzettel-Vorbelegung aus der Anschrift", () => {
  it("belegt Stellen grün vor, lässt S2 rot als Hauptempfänger gelten und Freitext als grüne Zeile", () => {
    expect(verteilerAusAnschrift("S4")).toEqual([{ stelle: "S2", kopie: "ROT" }, { stelle: "S4", kopie: "GRUEN" }]);
    expect(verteilerAusAnschrift("Leiter")).toContainEqual({ stelle: "LEITER", kopie: "GRUEN" });
    expect(verteilerAusAnschrift("S4 Logistik")).toContainEqual({ stelle: "S4", kopie: "GRUEN" });
    expect(verteilerAusAnschrift("OV Wildeshausen", "FüSt Weser")).toContainEqual({ stelle: "OV Wildeshausen", kopie: "GRUEN" });
    expect(verteilerAusAnschrift("S2")).toEqual([{ stelle: "S2", kopie: "ROT" }]);
    expect(hauptempfaengerWarnung([{ stelle: "S2", kopie: "ROT" }], "S2")).toBeUndefined();
    expect(hauptempfaengerWarnung([{ stelle: "S2", kopie: "ROT" }], "FüSt Weser", "FüSt Weser")).toBe(TEXT_KEIN_HAUPTEMPFAENGER);
  });

  it("zeigt im Laufzettel bei Anschrift S2 keine Warnung und bei Freitext eine grüne Freitextzeile", () => {
    const { unmount } = render(<Laufzettel zeile={{ ...VOR_SICHTER, anschrift: "S2" }} handzeichen="Si" nurLesen={false} aufGesichtet={vi.fn()} />);
    expect(screen.queryByText(TEXT_KEIN_HAUPTEMPFAENGER)).toBeNull();
    expect((screen.getByRole("checkbox", { name: "S2 rot" }) as HTMLInputElement).checked).toBe(true);
    unmount();
    render(<Laufzettel zeile={{ ...VOR_SICHTER, anschrift: "OV Wildeshausen" }} handzeichen="Si" nurLesen={false} aufGesichtet={vi.fn()} />);
    expect((screen.getByRole("checkbox", { name: "OV Wildeshausen grün" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByText(TEXT_KEIN_HAUPTEMPFAENGER)).toBeNull();
  });
});

describe("ETB P1-3, Sichter-Audit: Nachweisung am Bildschirm", () => {
  const gesichtet: Nachrichtenzeile = { ...BLITZ_AN_S4, vermerke: "Rückruf bis 1100" };
  const zurueck = { ...AUSGANG, id: "N-zurueck", nummer: 9, betreff: "Doppelt", zurueckgezogen: true, zurueckgezogenMit: { zeitpunkt: "2026-11-16T10:00:00.000Z", grund: "doppelt aufgenommen" } } as Nachrichtenzeile;

  it("bietet „Berichtigen“ an jeder nummerierten Zeile und zeigt Verteiler, Vermerke und den Grund als zweite Zeile", () => {
    const aufSchritt = vi.fn();
    render(<Nachweisung zeilen={[gesichtet, zurueck, AUSGANG]} gewaehltId={undefined} nurLesen={false} aufWahl={vi.fn()} aufSchritt={aufSchritt} />);
    const tabelle = screen.getByRole("table", { name: "Nachweisung" });
    fireEvent.click(within(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ })).getByRole("button", { name: "Berichtigen" }));
    expect(aufSchritt).toHaveBeenCalledWith("nachweis", gesichtet);
    expect(within(within(tabelle).getByRole("row", { name: /Sandsäcke/ })).getByRole("button", { name: "Nachweisen" })).toBeDefined();
    expect(tabelle.textContent).toContain("Verteiler: S4 (");
    expect(tabelle.textContent).toContain("Vermerke: Rückruf bis 1100");
    expect(tabelle.textContent).toContain("Zurückgezogen: doppelt aufgenommen");
    expect(unterzeileText(AUSGANG)).toBeUndefined();
  });
});

describe("Zweiter Durchlauf: Hinweis der Befördern-Maske", () => {
  it("sagt „Nummer ist vorbelegt“ statt „Ohne Nachweisungsnummer“, und bei leerem Feld, was leer heißt", () => {
    render(<Fmzmaske schritt="befoerderung" zeile={AUSGANG} handzeichen="Fm" naechsteNummer={8} vergebeneNummern={[7]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: /Befördern/ });
    expect(maske.textContent).toContain(TEXT_OHNE_NUMMER);
    expect(maske.textContent).not.toContain("Ohne Nachweisungsnummer");
    fireEvent.change(within(maske).getByLabelText("Nr."), { target: { value: "" } });
    expect(maske.textContent).toContain(TEXT_NUMMER_LEER);
  });
});

function Ausloeser(): React.JSX.Element {
  const [offen, setzeOffen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setzeOffen(true)}>
        Öffnen
      </button>
      {offen && (
        <Maske titel="Probe" aufBestaetigen={() => setzeOffen(false)} aufAbbrechen={() => setzeOffen(false)}>
          <input aria-label="Erstes" />
          <input aria-label="Zweites" />
        </Maske>
      )}
    </>
  );
}

describe("FM P2-8: Die Maske fängt den Fokus und gibt ihn zurück", () => {
  it("hält Tab in der Maske und fokussiert nach dem Schließen den auslösenden Knopf", () => {
    render(<Ausloeser />);
    const oeffnen = screen.getByRole("button", { name: "Öffnen" });
    oeffnen.focus();
    fireEvent.click(oeffnen);
    const erstes = screen.getByLabelText("Erstes");
    expect(document.activeElement).toBe(erstes);
    const abbrechen = screen.getByRole("button", { name: "Abbrechen" });
    abbrechen.focus();
    fireEvent.keyDown(abbrechen, { key: "Tab" });
    expect(document.activeElement).toBe(erstes);
    fireEvent.keyDown(erstes, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(abbrechen);
    fireEvent.click(abbrechen);
    expect(screen.queryByRole("form", { name: "Probe" })).toBeNull();
    expect(document.activeElement).toBe(oeffnen);
  });
});

describe("FM P2-3, P2-9: Vom Papier nachtragen", () => {
  it("lässt die Zeiten leer mit „vom Blatt“ und schreibt Anlage mit Nummer, Annahme und Beförderung in einem Schritt", async () => {
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: ["S3"], handzeichen: "Mü" } } });
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    const abfassung = within(maske).getByLabelText("Abfassungszeit") as HTMLInputElement;
    expect(abfassung.value).toBe("");
    expect(abfassung.placeholder).toBe(PLATZHALTER_VOM_BLATT);
    const blatt = within(maske).getByRole("group", { name: "Vermerke der Fernmeldezentrale vom Blatt" });
    const setze = (wurzel: HTMLElement, name: string, wert: string): void => {
      fireEvent.change(within(wurzel).getByLabelText(name), { target: { value: wert } });
    };
    setze(maske, "Anschrift", "OV Wildeshausen");
    setze(maske, "Betreff", "Sandsäcke");
    setze(maske, "Abfassungszeit", "101030nov26");
    setze(blatt, "Annahme", "101032nov26");
    setze(blatt, "Hdz Annahme", "Ha");
    setze(blatt, "Beförderung", "101040nov26");
    setze(blatt, "Hdz Beförderung", "Ha");
    setze(blatt, "Gegenstelle", "Heros Wildeshausen");
    setze(blatt, "Nr.", "12");
    expect(maske.textContent).not.toContain("24 Stunden zurück");
    fireEvent.click(within(maske).getByRole("button", { name: "Nachtragen" }));
    // Ein Bedienschritt: Annahme, Beförderung und Nummer sind Folgewerte der Anlage (P2-9).
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({
      typ: "NachrichtVerfasst",
      nachrichtenfolge: {
        nachweis: { nummer: 12, handzeichen: "Ha" },
        annahme: { handzeichen: "Ha" },
        befoerderung: { mittel: "FUNK", handzeichen: "Ha", gegenstelle: "Heros Wildeshausen" },
      },
    });
  });
});

describe("FM P2-6: Konfliktmeldung ohne Rohdaten, mit „Neu laden“", () => {
  const meldung = 'Wurde inzwischen von Hans geändert (neu: {"zeitpunkt":"2026-11-16T09:25:00.000Z","handzeichen":"Ha"}). Neu laden?';

  it("liest die Abweisung und nennt den Wert in Worten", () => {
    expect(abweisungLesen(meldung).wer).toBe("Hans");
    expect(vermerkwert({ nummer: 8, zeitpunkt: "2026-11-16T09:25:00.000Z", handzeichen: "Ha" })).toMatch(/^Nr\. 8 \d{4} Ha$/u);
    expect(vermerkwert(null)).toBe("leer");
  });

  it("zeigt Name, Stelle, Feld und Wert; „Neu laden“ öffnet die Maske mit dem neuen Vorher-Wert", async () => {
    const hans = { anzeigename: "Hans", veraltet: false, stellen: ["FMZ"] } as unknown as Peer;
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers: [hans] } as Lagebild });
    attrappe.antwortet("bedienen", { art: "abgewiesen", code: "VORWERT", meldung, dauerhafterHinweis: false });
    const ohneAnnahme: Nachrichtenzeile = { ...AUSGANG, annahme: undefined } as unknown as Nachrichtenzeile;
    render(<Fmzmaske schritt="annahme" zeile={ohneAnnahme} handzeichen="Fm" naechsteNummer={8} vergebeneNummern={[]} aufSchliessen={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("form", { name: /Annehmen/ })).getByRole("button", { name: "Annehmen" }));
    const hinweis = await screen.findByText(/Inzwischen von Hans \(FmZ\) geändert: Annahme ist jetzt \d{4} Ha/u);
    expect(hinweis.textContent).not.toContain("{");
    const neu = { ...AUSGANG, annahme: { zeitpunkt: "2026-11-16T09:25:00.000Z", handzeichen: "Ha" } };
    attrappe.antwortet("nachrichtAnfordern", neu);
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000002" });
    fireEvent.click(within(hinweis).getByRole("button", { name: "Neu laden" }));
    await waitFor(() => expect(screen.queryByText(/Inzwischen von Hans/u)).toBeNull());
    fireEvent.click(within(screen.getByRole("form", { name: /Annehmen/ })).getByRole("button", { name: "Annehmen" }));
    await waitFor(() => expect(entwuerfe()).toHaveLength(2));
    expect(entwuerfe()[1]).toMatchObject({ typ: "NachrichtAngenommen", vorher: { handzeichen: "Ha" } });
  });
});

describe("SGL P2-10: Der Reiter „Nachrichten“ zählt neue Nachrichten", () => {
  it("trägt die Zahl „neu für meine Stellen“ als Marke im Namen", () => {
    render(<Reiterzeile blatt="lage" waehleBlatt={vi.fn()} offeneMeldungen={0} profil="fuehrungsstelle" />);
    const reiter = screen.getByRole("tab", { name: "Nachrichten 1 neu" });
    expect(reiter.textContent).toContain("1");
  });
});

describe("Sichter P1-4: Stau vor dem Sichter in der FmZ", () => {
  it("nennt die wartenden Eingänge und öffnet mit „Ich sichte jetzt selbst“ den Laufzettel", async () => {
    const lage = { ...NACHRICHTEN_LAGEBILD.nachrichten, vorSichterUeberSchwelle: 2 } as Lagebild["nachrichten"];
    useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers: [], nachrichten: lage, sitzung: { stellen: ["FMZ"], handzeichen: "Fm" } } });
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([{ ...VOR_SICHTER, anschrift: "S4" }]));
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    expect(await screen.findByText(/2 Eingänge warten vor dem Sichter/u)).toBeDefined();
    fireEvent.click(await screen.findByRole("button", { name: "Ich sichte jetzt selbst" }));
    const laufzettel = screen.getByRole("region", { name: "Laufzettel des Sichters" });
    expect((within(laufzettel).getByRole("checkbox", { name: "S4 grün" }) as HTMLInputElement).checked).toBe(true);
  });

  it("bietet das Selbstsichten mit Sichter erst ab der Schwelle an", () => {
    const wartet = (minuten: number): Nachrichtenzeile => ({ ...VOR_SICHTER, wartetSeitSichter: minuten }) as Nachrichtenzeile;
    expect(selbstSichtbar(wartet(25), true, 20)).toBe(true);
    expect(selbstSichtbar(wartet(5), true, 20)).toBe(false);
    expect(selbstSichtbar(VOR_SICHTER, false, 20)).toBe(true);
    expect(sichterstauText(1)).toBe("1 Eingang wartet vor dem Sichter");
    expect(sichterstauText(0)).toBeUndefined();
  });
});

describe("FM P3-4, SGL P2-11: Warteschlange und Laufzettel bei 1320 x 860", () => {
  it("zeigt je Zeile nur den Hauptknopf und das Menü der weiteren Schritte", () => {
    const aufSchritt = vi.fn();
    render(<Warteschlange zeilen={[AUSGANG]} jetzt="2026-11-16T09:45:00.000Z" gewaehltId={undefined} nurLesen={false} aufWahl={vi.fn()} aufSchritt={aufSchritt} />);
    const zeile = screen.getByRole("row", { name: /Sandsäcke/ });
    const knoepfe = within(zeile).getAllByRole("button");
    expect(knoepfe.map((k) => k.getAttribute("aria-label") ?? k.textContent)).toEqual(["Befördern", "Weitere Schritte"]);
    fireEvent.click(within(zeile).getByRole("button", { name: "Weitere Schritte" }));
    expect(screen.getAllByRole("menuitem").map((m) => m.textContent)).toEqual(["Annahme ändern", "Vorschlag", "Nachweisen"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Vorschlag" }));
    expect(aufSchritt).toHaveBeenCalledWith("vorschlag", AUSGANG);
  });

  it("hält im Stylesheet die Knöpfe einzeilig, das Raster unter 60 % und „Sichten“ am Rand", () => {
    const seite = Object.values(import.meta.glob("./index.html", { eager: true, query: "?raw", import: "default" }))[0] as string;
    expect(seite).toMatch(/\.fmzkarte \.zeilenknoepfe \{\s*flex-wrap: nowrap;/u);
    expect(seite).toMatch(/\.verteilerraster \.verteilerzeilen \{\s*max-height: 60vh;\s*overflow-y: auto;/u);
    expect(seite).toMatch(/\.laufzettel > \* \{\s*flex: 0 0 auto;/u);
    expect(seite).toMatch(/section\.laufzettel > \.maskenknoepfe \{\s*position: sticky;/u);
  });
});

describe("Zweiter Durchlauf, Punkt 10: vom Konflikthinweis zur Nachricht", () => {
  it("bietet je Hinweis an einer Nachricht „Nachricht öffnen“ und zeigt sie", async () => {
    expect(nachrichtIdAusPfad("nachricht/N-blitz/sichtung")).toBe("N-blitz");
    expect(nachrichtIdAusPfad("einheit/E1/status")).toBeUndefined();
    attrappe.antwortet("nachrichtAnfordern", BLITZ_AN_S4);
    const lagebild = { ...NACHRICHTEN_LAGEBILD, konflikthinweise: [{ art: "vorherPasstNicht", feldpfad: "nachricht/N-blitz/sichtung" }] } as Lagebild;
    render(<Nachrichtenhinweise lagebild={lagebild} />);
    expect(screen.getByText(/Sichtung: zwei Arbeitsplätze haben verschieden vermerkt/u)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Nachricht öffnen" }));
    expect(await screen.findAllByText(/Pumpen eingetroffen/u)).not.toHaveLength(0);
    expect(attrappe.letzterRuf("nachrichtAnfordern")).toMatchObject({ nachrichtId: "N-blitz" });
  });
});
