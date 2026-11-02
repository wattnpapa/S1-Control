/**
 * Komponententests zu Funkhinweis und Mithörern in der Zuordnung des Blattes
 * „Funkplan" (Funkplan F2).
 *
 * Gemessen wird, was die Textzelle schreibt — Doppelklick oder Enter öffnet,
 * Enter und Wegklicken schreiben über denselben Schritt wie die Zelle der
 * Einheitentabelle, Esc verwirft, ein Fehlschlag lässt die Eingabe stehen —
 * und wie Mithörer und weitere Gruppen erscheinen.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Funkteilnehmer, Rufgruppenkarte } from "@s1/domaene";

import { Funkplan } from "./Funkplan.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { FUNK_ANSICHT } from "./pruefhilfen/funkplanbeispiel.js";
import { BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import type { Funkplanansicht } from "../kontrakt/index.js";

afterEach(cleanup);

let attrappe: Attrappe;

/** Das Beispiel mit Funkhinweis an E2 und E1 als Mithörer auf THW_OL_EA2 (R2). */
function mitZusatz(): Funkplanansicht {
  const { plan } = FUNK_ANSICHT;
  const e1Alt = plan.rufgruppen[0]?.teilnehmer[0] as Funkteilnehmer;
  const e1: Funkteilnehmer = { ...e1Alt, weitereRufgruppen: [{ rufgruppeId: "R2", name: "THW_OL_EA2", aufgeloest: false }, { rufgruppeId: "R5", name: "THW_OL_BR", aufgeloest: true }] };
  const ersetze = (t: Funkteilnehmer): Funkteilnehmer => (t.einheitId === "E1" ? e1 : t.einheitId === "E2" ? { ...t, funkhinweis: "Bei Netzausfall auf DMO 311" } : t);
  const rufgruppen: Rufgruppenkarte[] = plan.rufgruppen.map((r) => ({ ...r, teilnehmer: r.teilnehmer.map(ersetze), mithoerer: r.rufgruppeId === "R2" ? [e1] : [] }));
  return { ...FUNK_ANSICHT, plan: { ...plan, rufgruppen, jeBereich: plan.jeBereich.map((b) => ({ ...b, teilnehmer: b.teilnehmer.map(ersetze) })) } };
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("funkplanAnfordern", mitZusatz());
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

async function gruppe(name: string): Promise<HTMLElement> {
  render(<Funkplan />);
  return screen.findByRole("rowgroup", { name });
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Die Zelle „Funkhinweis“ der Zuordnung", () => {
  it("zeigt den Funkhinweis neben „Bereich ≠ Gruppe“ und schreibt mit Enter über den Schritt der Tabellenzelle", async () => {
    const r2 = await gruppe("Rufgruppe THW_OL_EA2");
    const zeile = within(r2).getByRole("row", { name: /FGr WP OV Cloppenburg/ });
    const zelle = within(zeile).getByTitle(/Funkhinweis bearbeiten/);
    expect(zelle.textContent).toBe("Bei Netzausfall auf DMO 311");
    expect(within(within(r2).getByRole("row", { name: /FGr Ortung 1/ })).getByText("Bereich ≠ Gruppe")).toBeDefined();
    fireEvent.doubleClick(zelle);
    const feld = screen.getByLabelText("Funkhinweis für FGr WP OV Cloppenburg");
    expect(attrappe.letzterRuf("sperre")).toEqual({ art: "sperre", akteId: "akte-1", entitaetId: "E2" });
    fireEvent.change(feld, { target: { value: "nachts nur Telefon" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    fireEvent.blur(feld);
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E2", feld: "funkHinweis" }, vorher: "Bei Netzausfall auf DMO 311", neu: "nachts nur Telefon", vorwertPruefen: true },
      ]);
    });
    await waitFor(() => expect(screen.queryByLabelText("Funkhinweis für FGr WP OV Cloppenburg")).toBeNull());
  });

  it("verwirft mit Esc, schreibt Unverändertes nicht und leert mit null", async () => {
    const r1 = await gruppe("Rufgruppe THW_OL_FUE");
    const zelle = within(r1).getByTitle(/Funkhinweis bearbeiten/);
    fireEvent.keyDown(zelle, { key: "Enter" });
    let feld = screen.getByLabelText("Funkhinweis für Abschnittsleitung EA 1 Deich Nord");
    fireEvent.change(feld, { target: { value: "verworfen" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    fireEvent.blur(feld);
    expect(screen.queryByLabelText("Funkhinweis für Abschnittsleitung EA 1 Deich Nord")).toBeNull();
    fireEvent.doubleClick(zelle);
    feld = screen.getByLabelText("Funkhinweis für Abschnittsleitung EA 1 Deich Nord");
    fireEvent.blur(feld);
    expect(bedient()).toEqual([]);
    const r2 = screen.getByRole("rowgroup", { name: "Rufgruppe THW_OL_EA2" });
    fireEvent.doubleClick(within(within(r2).getByRole("row", { name: /FGr WP OV Cloppenburg/ })).getByTitle(/Funkhinweis bearbeiten/));
    feld = screen.getByLabelText("Funkhinweis für FGr WP OV Cloppenburg");
    fireEvent.change(feld, { target: { value: "  " } });
    fireEvent.blur(feld);
    await waitFor(() => expect(bedient()).toEqual([expect.objectContaining({ vorher: "Bei Netzausfall auf DMO 311", neu: null })]));
  });

  it("lässt die Eingabe mit dem Grund stehen, wenn das Schreiben abgewiesen wird", async () => {
    attrappe.antwortet("bedienen", { art: "abgewiesen", meldung: "Wurde inzwischen von Lage 2 geändert. Neu laden?", code: "VORWERT", dauerhafterHinweis: false });
    const r1 = await gruppe("Rufgruppe THW_OL_FUE");
    fireEvent.doubleClick(within(r1).getByTitle(/Funkhinweis bearbeiten/));
    const feld = screen.getByLabelText("Funkhinweis für Abschnittsleitung EA 1 Deich Nord");
    fireEvent.change(feld, { target: { value: "neu" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    expect(await screen.findByText(/Nicht gespeichert – Wurde inzwischen von Lage 2 geändert/)).toBeDefined();
    expect((screen.getByLabelText("Funkhinweis für Abschnittsleitung EA 1 Deich Nord") as HTMLInputElement).value).toBe("neu");
  });

  it("ist im beendeten Einsatz nur Anzeige", async () => {
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, einsatzStatus: "BEENDET" } as never });
    render(<Funkplan />);
    const r2 = await screen.findByRole("rowgroup", { name: "Rufgruppe THW_OL_EA2" });
    const zelle = within(within(r2).getByRole("row", { name: /FGr WP OV Cloppenburg/ })).getByText("Bei Netzausfall auf DMO 311");
    fireEvent.doubleClick(zelle);
    expect(screen.queryByLabelText("Funkhinweis für FGr WP OV Cloppenburg")).toBeNull();
  });
});

describe("Mithörer und weitere Rufgruppen in der Zuordnung", () => {
  it("führt eine Einheit unter ihrer weiteren Gruppe als Mithörer, gekennzeichnet und nicht gezählt", async () => {
    const r2 = await gruppe("Rufgruppe THW_OL_EA2");
    const zeilen = within(r2).getAllByRole("row").slice(1);
    expect(zeilen.map((z) => z.querySelector("th")?.textContent?.replace("✎", "").trim())).toEqual([
      "FGr WP OV Cloppenburg",
      "FGr Ortung 1 OV Varel",
      "Abschnittsleitung EA 1 Deich Nord hört mit",
    ]);
    expect(zeilen.at(-1)?.className).toContain("mithoerer");
    expect(within(r2).getByText(/2 Teilnehmer · 1 hören mit/)).toBeDefined();
    expect(screen.getByText(/· 6 Einheiten · 2 ohne Rufgruppe/)).toBeDefined();
  });

  it("zeigt in „Je Bereich“ die geltenden weiteren Gruppen hinter der Hauptgruppe", async () => {
    render(<Funkplan />);
    await screen.findByRole("table", { name: "Zuordnung je Rufgruppe" });
    fireEvent.click(screen.getByRole("button", { name: "Je Bereich" }));
    const ea1 = screen.getByRole("rowgroup", { name: "Bereich EA 1 Deich Nord" });
    const zelle = within(within(ea1).getByRole("row", { name: /Abschnittsleitung EA 1/ })).getByTitle(/Rufgruppe wählen/);
    expect(zelle.textContent).toContain("THW_OL_FUE");
    // Die aufgelöste THW_OL_BR steht nicht im „auch".
    expect(within(zelle).getByText(/auch: THW_OL_EA2$/)).toBeDefined();
    // Jede Einheit steht je Bereich einmal; Mithörer gibt es nur je Rufgruppe.
    expect(within(ea1).getAllByRole("row", { name: /Abschnittsleitung EA 1/ })).toHaveLength(1);
  });
});
