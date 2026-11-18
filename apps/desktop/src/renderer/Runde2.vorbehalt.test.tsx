/**
 * Regressionstests zur zweiten Audit-Runde (2026-11-17), Stellenvorbehalt
 * und Ersatzsichter:
 *
 * - R2-FaBe P0-1, Entscheidung 13: Sichten und Nachsichten ohne Stelle
 *   Sichter zeigen den Hinweis mit „Trotzdem“, „Sichten“ ist bis dahin
 *   gesperrt, der Schritt trägt den `grund`; die FmZ ohne besetzten Sichter
 *   (Ersatzregel) sieht ihn nicht; `brauchtGrund` des Workers öffnet ihn.
 * - R2-FM P3-2, R2-SGL P1-2: „Eingang aufnehmen“ und der Papier-Nachtrag
 *   mit FmZ-Teil ohne Stelle FMZ ebenso; der Nachtrag trägt `nachtrag: true`.
 * - R2-FM P1-2, R2-Si P2: „Ich sichte jetzt selbst“ rollt den Laufzettel in
 *   den Blick und fokussiert die Quittung; bei Blitz oder Sofort ohne grüne
 *   Kopie hält der erste Klick an („Trotzdem nur an S2“).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf, Lagebild } from "../kontrakt/index.js";
import { eingangVorlage } from "./fmzformate.js";
import { useLaden } from "./laden.js";
import { Laufzettel } from "./Laufzettel.js";
import { leereMaske } from "./nachrichtenformate.js";
import { Nachrichten } from "./Nachrichten.js";
import { Nachrichtenmaske } from "./Nachrichtenmaske.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, VOR_SICHTER, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { TEXT_VORBEHALT_SICHTER, stelleFehlt, vorbehaltstextFuer } from "./Stellenvorbehalt.js";

afterEach(cleanup);

let attrappe: Attrappe;
const SICHTER_PEER = { clientId: "b", anzeigename: "Sichtung", rechnername: "PC-2", veraltet: false, wanduhr: "2026-11-17T09:00:00.000Z", stellen: ["SICHTER"] } as unknown as Lagebild["peers"][number];
/** Ein Eingang vor dem Sichter, angeschrieben an S3 (grün vorbelegt). */
const AN_S3: Nachrichtenzeile = { ...VOR_SICHTER, anschrift: "S3", aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-17T09:10:00.000Z", handzeichen: "Fm" } };
/** Ein Blitz vor dem Sichter ohne Stelle in der Anschrift: Nur S2 rot ist vorbelegt. */
const BLITZ_OHNE_STELLE: Nachrichtenzeile = { ...VOR_SICHTER, id: "N-blitz2", betreff: "Person im Wasser", anschrift: "FüSt", vorrang: "BLITZ", vorrangstufe: 0 };

function sitzung(stellen: readonly string[], peers: Lagebild["peers"] = []): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, peers, sitzung: { stellen: [...stellen], handzeichen: "Mka" } } });
}

const entwuerfe = (): Entwurf[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

function laufzettel(zeile: Nachrichtenzeile = AN_S3, fokus = false): HTMLElement {
  render(<Laufzettel zeile={zeile} handzeichen="Mka" nurLesen={false} aufGesichtet={vi.fn()} fokus={fokus} />);
  return screen.getByRole("region", { name: "Laufzettel des Sichters" });
}

const knopf = (wurzel: HTMLElement, name: string | RegExp): HTMLButtonElement => within(wurzel).getByRole("button", { name }) as HTMLButtonElement;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

describe("R2-FaBe P0-1: Sichten ist dem Sichter vorbehalten", () => {
  it("die Regel: Sichter frei, FmZ nur ohne besetzten Sichter, alle anderen mit Hinweis", () => {
    expect(stelleFehlt("sichtung", ["SICHTER"], [])).toBe(false);
    expect(stelleFehlt("sichtung", ["FMZ"], [])).toBe(false);
    expect(stelleFehlt("sichtung", ["FMZ"], [SICHTER_PEER])).toBe(true);
    expect(stelleFehlt("sichtung", ["FACHBERATER"], [])).toBe(true);
    expect(stelleFehlt("sichtung", [], [])).toBe(true);
    expect(stelleFehlt("aufnahme", ["S4"], [])).toBe(true);
    expect(stelleFehlt("nachtrag", ["FMZ"], [])).toBe(false);
  });

  it("Fachberater: Hinweis, „Sichten“ gesperrt bis „Trotzdem“, dann mit Grund", async () => {
    sitzung(["FACHBERATER"], [SICHTER_PEER]);
    const zettel = laufzettel();
    expect(zettel.textContent).toContain(TEXT_VORBEHALT_SICHTER);
    expect(zettel.textContent).toContain("vorbehalten");
    expect(knopf(zettel, /^Sichten \(/u).disabled).toBe(true);
    expect(zettel.textContent).toContain("Erst „Trotzdem“ wählen");
    fireEvent.click(knopf(zettel, "Trotzdem"));
    expect(knopf(zettel, /^Sichten \(/u).disabled).toBe(false);
    fireEvent.click(knopf(zettel, /^Sichten \(/u));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtGesichtet", grund: "Eintrag durch Fachberater, nicht Sichter" });
  });

  it("ohne Stelle ebenso, auch beim Nachsichten", async () => {
    sitzung([]);
    const zettel = laufzettel(BLITZ_AN_S4);
    expect(knopf(zettel, /^Nachsichten \(/u).disabled).toBe(true);
    fireEvent.click(knopf(zettel, "Trotzdem"));
    fireEvent.click(knopf(zettel, /^Nachsichten \(/u));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.grund).toBe("Eintrag durch Arbeitsplatz ohne Stelle, nicht Sichter");
  });

  it("Sichter und FmZ ohne besetzten Sichter (Ersatzregel): kein Hinweis, kein Grund", async () => {
    sitzung(["FMZ"]);
    const zettel = laufzettel();
    expect(within(zettel).queryByRole("button", { name: "Trotzdem" })).toBeNull();
    fireEvent.click(knopf(zettel, /^Sichten \(/u));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]?.grund).toBeUndefined();
    cleanup();
    sitzung(["FMZ"], [SICHTER_PEER]);
    expect(within(laufzettel()).getByRole("button", { name: "Trotzdem" })).toBeDefined();
  });

  it("öffnet den Hinweis, wenn der Worker mit `brauchtGrund` abweist", async () => {
    sitzung(["SICHTER"]);
    attrappe.antwortet("bedienen", { art: "brauchtGrund", zielArt: "NachrichtGesichtet" });
    const zettel = laufzettel();
    expect(within(zettel).queryByRole("button", { name: "Trotzdem" })).toBeNull();
    fireEvent.click(knopf(zettel, /^Sichten \(/u));
    await waitFor(() => expect(within(zettel).getByRole("button", { name: "Trotzdem" })).toBeDefined());
    expect(knopf(zettel, /^Sichten \(/u).disabled).toBe(true);
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000002" });
    fireEvent.click(knopf(zettel, "Trotzdem"));
    fireEvent.click(knopf(zettel, /^Sichten \(/u));
    await waitFor(() => expect(entwuerfe()).toHaveLength(2));
    expect(entwuerfe()[1]?.grund).toBe("Eintrag durch Sichter, nicht Sichter");
  });
});

describe("R2-FM P3-2, R2-SGL P1-2: Aufnahme und Nachtrag ohne Stelle FMZ", () => {
  it("„Eingang aufnehmen“ mit Stelle S4: Hinweis, „Aufnehmen“ erst nach „Trotzdem“, mit Grund", async () => {
    sitzung(["S4"], [SICHTER_PEER]);
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={eingangVorlage({ stellen: ["S4"], handzeichen: "Ru" }, "FüSt Weser")} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Eingang aufnehmen" });
    expect(maske.textContent).toContain(vorbehaltstextFuer("aufnahme"));
    fireEvent.change(within(maske).getByLabelText("Absender"), { target: { value: "Heros Wildeshausen" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Lage" } });
    // R2-FM P2-3: Die Gegenstelle ist beim Eingang Pflicht.
    fireEvent.change(within(maske).getByLabelText(/Rufname der Gegenstelle/u), { target: { value: "Heros Wildeshausen 10" } });
    expect(knopf(maske, "Aufnehmen").disabled).toBe(true);
    fireEvent.click(knopf(maske, "Trotzdem"));
    fireEvent.click(knopf(maske, "Aufnehmen"));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ typ: "NachrichtVerfasst", grund: "Eintrag durch S4, nicht FmZ" });
  });

  it("die FmZ nimmt ohne Hinweis auf; ein Verfasser ohne Nachtrag sieht keinen", () => {
    sitzung(["FMZ"], [SICHTER_PEER]);
    render(<Nachrichtenmaske titel="Eingang aufnehmen" vorlage={eingangVorlage({ stellen: ["FMZ"], handzeichen: "Fm" }, "FüSt Weser")} anschriften={[]} aufnahme={{ naechsteNummer: 3 }} aufSchliessen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Trotzdem" })).toBeNull();
    cleanup();
    sitzung(["S3"]);
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["S3"], handzeichen: "Mü" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Trotzdem" })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    // Wie `hatFmzWerte` im Worker: erst mit einem Wert der FmZ (Annahme, Beförderung, Nummer).
    const blatt = screen.getByRole("group", { name: "Vermerke der Fernmeldezentrale vom Blatt" });
    fireEvent.change(within(blatt).getByLabelText("Nr."), { target: { value: "" } });
    expect(screen.queryByRole("button", { name: "Trotzdem" })).toBeNull();
    fireEvent.change(within(blatt).getByLabelText("Annahme"), { target: { value: "1010" } });
    fireEvent.change(within(blatt).getByLabelText("Hdz Annahme"), { target: { value: "Ha" } });
    expect(screen.getByRole("button", { name: "Trotzdem" })).toBeDefined();
  });

  it("der Nachtrag der FmZ trägt das Kennzeichen, aber keinen Grund", async () => {
    sitzung(["FMZ"]);
    render(<Nachrichtenmaske vorlage={leereMaske({ stellen: ["FMZ"], handzeichen: "Fm" })} anschriften={[]} aufSchliessen={vi.fn()} />);
    const maske = screen.getByRole("form", { name: "Nachricht verfassen" });
    fireEvent.click(within(maske).getByRole("checkbox", { name: "Vom Papier nachtragen" }));
    fireEvent.change(within(maske).getByLabelText("Anschrift"), { target: { value: "OV Wildeshausen" } });
    fireEvent.change(within(maske).getByLabelText("Betreff"), { target: { value: "Sandsäcke" } });
    fireEvent.change(within(maske).getByLabelText("Abfassungszeit"), { target: { value: "1030" } });
    fireEvent.click(knopf(maske, "Nachtragen"));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ nachrichtenfolge: { nachtrag: true } });
    expect(entwuerfe()[0]?.grund).toBeUndefined();
  });
});

describe("R2-FM P1-2, R2-Si P2: Ersatzsichter und Vorrang ohne Hauptempfänger", () => {
  it("bei Blitz ohne grüne Kopie hält der erste Klick an, der zweite heißt „Trotzdem nur an S2“", async () => {
    sitzung(["SICHTER"]);
    const zettel = laufzettel(BLITZ_OHNE_STELLE);
    expect(within(zettel).getByRole("alert").textContent).toContain("Kein Hauptempfänger");
    fireEvent.click(knopf(zettel, /^Sichten \(/u));
    expect(entwuerfe()).toHaveLength(0);
    fireEvent.click(knopf(zettel, "Trotzdem nur an S2"));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
    expect(entwuerfe()[0]).toMatchObject({ neu: { verteiler: [{ stelle: "S2", kopie: "ROT" }] } });
  });

  it("ein grünes Kreuz nimmt die Rückfrage zurück; ohne Vorrang genügt ein Klick", async () => {
    sitzung(["SICHTER"]);
    const zettel = laufzettel(BLITZ_OHNE_STELLE);
    fireEvent.click(knopf(zettel, /^Sichten \(/u));
    fireEvent.click(within(zettel).getByRole("checkbox", { name: "S3 grün" }));
    expect(knopf(zettel, /^Sichten \(/u)).toBeDefined();
    cleanup();
    const einfach = laufzettel({ ...BLITZ_OHNE_STELLE, vorrang: undefined, vorrangstufe: 2 } as Nachrichtenzeile);
    fireEvent.click(knopf(einfach, /^Sichten \(/u));
    await waitFor(() => expect(entwuerfe()).toHaveLength(1));
  });

  it("„Ich sichte jetzt selbst“ rollt den Laufzettel in den Blick und fokussiert die Quittung", async () => {
    const rolle = vi.fn();
    Element.prototype.scrollIntoView = rolle;
    attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_OHNE_STELLE]));
    sitzung(["FMZ"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const karte = await waitFor(() => screen.getByRole("region", { name: "Vor dem Sichter" }));
    fireEvent.click(within(karte).getByRole("button", { name: "Ich sichte jetzt selbst" }));
    const zettel = await waitFor(() => screen.getByRole("region", { name: "Laufzettel des Sichters" }));
    expect(rolle).toHaveBeenCalled();
    expect(document.activeElement).toBe(within(zettel).getByLabelText("Quittung"));
  });
});
