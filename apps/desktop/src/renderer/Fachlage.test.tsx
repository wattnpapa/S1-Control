/** Das Blatt „Fachlage“ (Stab-Review 2026-11-22). */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Fachlage as Fachlagedaten } from "@s1/domaene";

import { Fachlage } from "./Fachlage.js";
import { wertAusEingabe } from "./Fachlagemasken.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const LEER = { lage: [], pegel: [], deich: [], patienten: [], amtshilfe: [], material: [], presse: [], stoerungen: [] };
const DATEN: Fachlagedaten = {
  zeilen: {
    ...LEER,
    pegel: [{ id: "P2", zeitpunkt: "2026-11-22T07:00:00.000Z", werte: { pegel: "Drielake", wertCm: 395, zeitpunkt: "2026-11-22T07:00:00.000Z" }, erledigt: false }],
    stoerungen: [{ id: "S1", zeitpunkt: "2026-11-22T06:05:00.000Z", werte: { bereich: "FUNK", beschreibung: "Repeater aus", zeitpunkt: "2026-11-22T06:05:00.000Z" }, stand: "OFFEN", erledigt: false }],
  },
  lageJeAbschnitt: [],
  pegelstaende: [{ pegel: "Drielake", zeitpunkt: "2026-11-22T07:00:00.000Z", wertCm: 395, tendenzCm: 15, prognoseCm: 420, verlauf: [] }],
  patientensumme: { SK1: 0, SK2: 1, SK3: 1, SK4: 0, einsatzkraefte: 1, gesamt: 2 },
  offeneStoerungen: 1,
};

let attrappe: Attrappe;
beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("fachlageAnfordern", { lageZeiger: 3, fachlage: DATEN });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-1" });
  useLaden.setState({ akteId: "akte-1", lagebild: { lageZeiger: 3 } as never, baum: undefined, fehler: undefined, hinweise: [] });
});

describe("Das Blatt „Fachlage“", () => {
  it("zeigt Pegelstand mit Tendenz und Prognose und trägt einen neuen ein", async () => {
    render(<Fachlage />);
    fireEvent.click(await screen.findByRole("button", { name: /^Pegel/ }));
    expect(screen.getByRole("list", { name: "Pegelstände" }).textContent).toContain("395 cm (+15) · Prognose 420 cm");
    fireEvent.click(screen.getByRole("button", { name: "Pegelstand eintragen …" }));
    const maske = screen.getByRole("form", { name: "Pegelstand eintragen" });
    fireEvent.change(within(maske).getByLabelText("Pegel"), { target: { value: "Drielake" } });
    fireEvent.change(within(maske).getByLabelText("Wasserstand (cm)"), { target: { value: "401" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Speichern" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("PegelstandGemessen");
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.nutzlast).toMatchObject({ pegel: "Drielake", wertCm: 401 });
  });

  it("setzt eine Störung auf „behoben“ mit dem gesehenen Vorher-Wert", async () => {
    render(<Fachlage />);
    fireEvent.click(await screen.findByRole("button", { name: /^Störungen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Störungen: Eintrag ändern" }));
    const maske = screen.getByRole("form", { name: "Störungen: ändern" });
    fireEvent.change(within(maske).getByLabelText("Stand"), { target: { value: "BEHOBEN" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf).toMatchObject({ typ: "StoerungGeaendert", nutzlast: { stoerungId: "S1", feld: "stand" }, vorher: null, neu: "BEHOBEN" });
    });
  });
});

describe("Die Eingaben der Fachlage", () => {
  it("wandelt Zahl, Zeit, ja/nein und meldet fehlende Pflichtfelder", () => {
    expect(wertAusEingabe({ feld: "wertCm", titel: "Wasserstand (cm)", art: "zahl", pflicht: true }, "3,5")).toEqual({ wert: 3.5 });
    expect(wertAusEingabe({ feld: "wertCm", titel: "Wasserstand (cm)", art: "zahl", pflicht: true }, "")).toEqual({ fehler: "Wasserstand (cm) eintragen" });
    expect(wertAusEingabe({ feld: "einsatzkraft", titel: "Einsatzkraft", art: "janein" }, "ja")).toEqual({ wert: true });
    expect(wertAusEingabe({ feld: "zeitpunkt", titel: "Zeit", art: "zeit" }, "", new Date("2026-11-22T10:00:00.000Z"))).toEqual({ wert: "2026-11-22T10:00:00.000Z" });
    expect("fehler" in wertAusEingabe({ feld: "prognoseFuer", titel: "Prognose für", art: "zeit" }, "morgen")).toBe(true);
  });
});
