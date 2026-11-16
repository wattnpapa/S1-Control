/**
 * Die Vorschau des Nachrichtenvordrucks (KONZEPT-NACHRICHTEN.md
 * Entscheidung 4, Schnitt N3).
 *
 * jsdom hat kein Canvas: Die Vorschau muss dann sauber „Keine Vorschau
 * möglich" sagen. Mit einem nachgebauten 2D-Kontext wird geprüft, dass das
 * Nachladen von jsPDF und Bibliothek trägt und der Vordruck mit den Werten
 * der Nachricht gezeichnet wird; dazu Vorbelegung und Merker je Ort.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLaden } from "./laden.js";
import { entwurfAus, leereMaske } from "./nachrichtenformate.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD } from "./pruefhilfen/nachrichtenbeispiel.js";
import { Vordruckvorschau, vorschauOffen } from "./Vordruckvorschau.js";
import { ladeVordruckmodule } from "./vordruckzeichner.js";

let attrappe: Attrappe;
const EINSTELLUNGEN = { sharePfad: "/share", anzeigename: "S4 Lage" };

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("einstellungenSetzen", EINSTELLUNGEN);
  useLaden.setState({ akteId: "akte-1", lagebild: NACHRICHTEN_LAGEBILD, einstellungen: EINSTELLUNGEN, hinweise: [] });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** Ein 2D-Kontext, der nur mitschreibt — genug, damit die Vorschau „zeichnen“ kann. */
function nachgebauterKontext(): { texte: string[] } {
  const texte: string[] = [];
  const kontext = new Proxy({} as Record<string | symbol, unknown>, {
    get(ziel, name) {
      if (name === "fillText") return (text: string) => texte.push(text);
      return ziel[name] ?? (() => undefined);
    },
    set(ziel, name, wert) {
      ziel[name] = wert;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(kontext as unknown as CanvasRenderingContext2D);
  return { texte };
}

describe("Die Vorschau des Vordrucks", () => {
  it("lädt jsPDF und die Bibliothek erst auf Abruf, mit den Maßen des Vordrucks", async () => {
    const m = await ladeVordruckmodule();
    expect([m.breite, m.hoehe]).toEqual([148, 210]);
    expect(typeof m.jsPDF).toBe("function");
    expect(typeof m.ausgaben.vordruckBlaetterAus).toBe("function");
  });

  it("ist in der Ansicht aufgeklappt, in der Maske zugeklappt, bis jemand es anders merkt", () => {
    expect(vorschauOffen(EINSTELLUNGEN, "ansicht")).toBe(true);
    expect(vorschauOffen(EINSTELLUNGEN, "maske")).toBe(false);
    expect(vorschauOffen({ ...EINSTELLUNGEN, vorschau: { ansicht: false, maske: true } }, "ansicht")).toBe(false);
    expect(vorschauOffen({ ...EINSTELLUNGEN, vorschau: { ansicht: false, maske: true } }, "maske")).toBe(true);
  });

  it("sagt ohne Canvas-Kontext „Keine Vorschau möglich“ und versteckt das Bild", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    render(<Vordruckvorschau ort="ansicht" quelle={{ art: "zeile", zeile: BLITZ_AN_S4 }} />);
    expect(screen.getByRole("button", { name: /Vorschau/ }).getAttribute("aria-expanded")).toBe("true");
    const status = await screen.findByText(/Keine Vorschau möglich/, {}, { timeout: 4000 });
    expect(status.textContent).toContain("Der Ausdruck geht trotzdem");
    expect(screen.getByLabelText("Vordruck, wie er gedruckt wird").closest(".vorschaubild")?.hasAttribute("hidden")).toBe(true);
  });

  it("zeichnet die Nachricht wie gedruckt, mit Betreff und Nummer", async () => {
    const { texte } = nachgebauterKontext();
    render(<Vordruckvorschau ort="ansicht" quelle={{ art: "zeile", zeile: BLITZ_AN_S4 }} />);
    await screen.findByText("Wie gedruckt", {}, { timeout: 4000 });
    expect(texte).toContain("Pumpen eingetroffen");
    // Die Nummer steht im Feld „Nr.“ (die Bibliothek setzt sie in die Kästchen).
    expect(texte.join(" ")).toMatch(/2\s*6/u);
  });

  it("klappt in der Maske auf, merkt es für den Arbeitsplatz und zeichnet den Entwurf erst nach der Tipp-Pause", async () => {
    const { texte } = nachgebauterKontext();
    // Der Main antwortet mit dem, was er gespeichert hat.
    attrappe.antwortet("einstellungenSetzen", { ...EINSTELLUNGEN, vorschau: { maske: true } });
    const werte = { ...leereMaske({ stellen: ["S4"], handzeichen: "Mü" }), anschrift: "Deich Nord", betreff: "Sandsäcke" };
    render(<Vordruckvorschau ort="maske" quelle={{ art: "entwurf", entwurf: entwurfAus(werte) }} />);
    expect(screen.queryByLabelText("Vordruck, wie er gedruckt wird")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Vorschau/ }));
    await waitFor(() => expect(attrappe.letzterRuf("einstellungenSetzen")?.einstellungen).toMatchObject({ vorschau: { maske: true } }));
    // Vor der Pause von 300 ms steht noch nichts auf dem Canvas.
    expect(texte).toEqual([]);
    await screen.findByText("Wie gedruckt", {}, { timeout: 4000 });
    expect(texte).toContain("Sandsäcke");
    expect(texte).toContain("Deich Nord");
  });
});
