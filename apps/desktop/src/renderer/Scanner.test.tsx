/**
 * Komponententests zum Handscanner (M3.4).
 *
 * Die fachliche Strecke — Segmente sammeln, Signatur prüfen, übernehmen —
 * misst `szenarien-eeb.test.ts` mit echten Bögen. Hier steht, dass die Maske
 * sich wie ein Scannerfeld verhält: Enter schickt und leert, der Fortschritt
 * ist lesbar, und die Übernahme geht in den gewählten Abschnitt.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Scanner, fortschrittstext } from "./Scanner.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const BAUM = {
  lageZeiger: 3,
  baum: [
    {
      id: "EO",
      name: "Deich Nord",
      typ: "EINSATZORT",
      reihenfolge: 1,
      tiefe: 0,
      eigeneStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
      summenStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
      einheiten: 0,
      einheitenSumme: 0,
      zaehlt: true,
      systemAbschnitt: false,
      kinder: [],
    },
  ],
};

const VORSCHAU = {
  meldungId: "abc123",
  bezeichnung: "Bergungsgruppe 1",
  organisation: "THW",
  herkunft: "ORTSVERBAND Oldenburg",
  ebene: "GRUPPE",
  staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
  personen: 9,
  fahrzeuge: 2,
  stand: "2026-09-10T08:00:00+02:00",
  signatur: "gueltig" as const,
  signaturKurzform: "a1b2 c3d4 e5f6 0708",
  absender: "Zugtrupp",
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("eebScan", { art: "gesammelt", haben: 1, anzahl: 3 });
  attrappe.antwortet("eebZuruecksetzen", { art: "leer", haben: 0, anzahl: 0 });
  attrappe.antwortet("eebUebernehmen", { art: "uebernommen", einheitId: "E-abc", ereignisse: 13 });
  useLaden.setState({ akteId: "akte-1", baum: BAUM, eeb: undefined, fehler: undefined, hinweise: [] });
});

describe("Die Scanner-Maske", () => {
  it("schickt den Scan bei Enter und leert das Feld", async () => {
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    const feld = screen.getByLabelText("Scan") as HTMLInputElement;
    fireEvent.change(feld, { target: { value: "https://erfassungsbogen.app/#EEBS.1.3.99.xyz" } });
    fireEvent.keyDown(feld, { key: "Enter" });

    await waitFor(() => {
      expect(attrappe.letzterRuf("eebScan")?.text).toBe(
        "https://erfassungsbogen.app/#EEBS.1.3.99.xyz",
      );
    });
    // Geleert, damit der nächste Scan nicht an den vorigen angehängt wird:
    // Ein Handscanner tippt ohne Rücksicht darauf, was schon im Feld steht.
    expect(feld.value).toBe("");
  });

  it("zeigt den Fortschritt „Teil 1 von 3“", async () => {
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.keyDown(screen.getByLabelText("Scan"), { key: "Enter" });
    await waitFor(() => {
      expect(screen.getByText("Teil 1 von 3")).toBeDefined();
    });
  });

  it("zeigt die Vorschau samt Signaturbefund und nimmt sie trotz Befund an (§5.8.1)", () => {
    useLaden.setState({
      eeb: { art: "vollstaendig", haben: 3, anzahl: 3, vorschau: { ...VORSCHAU, signatur: "ungueltig" } },
    });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
    expect(screen.getByText(/ungültig/)).toBeDefined();
    // Der Knopf bleibt bedienbar: Der Empfang ist eine Tatsache; wer die
    // Meldung nicht will, lehnt sie ab, statt dass die Maske sie verweigert.
    expect(screen.getByRole("button", { name: "Übernehmen" }).hasAttribute("disabled")).toBe(false);
  });

  it("übernimmt in den gewählten Abschnitt und meldet den Ausgang", async () => {
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("eebUebernehmen")?.abschnittId).toBe("EO");
    });
    expect(await screen.findByRole("status")).toHaveProperty(
      "textContent",
      "Übernommen: 13 Ereignisse geschrieben.",
    );
  });

  it("verwirft den Stapel mit „Von vorn“", async () => {
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Von vorn" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("eebZuruecksetzen")).toHaveLength(1);
    });
  });

  it("zeigt eine Meldung, wenn der Scan unlesbar war", () => {
    useLaden.setState({
      eeb: { art: "unlesbar", haben: 1, anzahl: 3, meldung: "Der Scan enthält keinen Erfassungsbogen." },
    });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    expect(screen.getByText("Der Scan enthält keinen Erfassungsbogen.")).toBeDefined();
    // Der halbe Stapel steht noch — ein Fehlgriff wirft zehn Minuten
    // Scanarbeit nicht weg.
    expect(screen.getByText("Teil 1 von 3")).toBeDefined();
  });
});

describe("fortschrittstext", () => {
  it("nennt „Teil n von m“, solange gesammelt wird", () => {
    expect(fortschrittstext({ art: "gesammelt", haben: 2, anzahl: 3 })).toBe("Teil 2 von 3");
  });

  it("meldet den einteiligen Bogen ohne Teilzählung", () => {
    expect(fortschrittstext({ art: "vollstaendig", haben: 1, anzahl: 1 })).toBe(
      "Bogen vollständig gelesen.",
    );
  });

  it("meldet den vollständigen Stapel mit seiner Teilzahl", () => {
    expect(fortschrittstext({ art: "vollstaendig", haben: 3, anzahl: 3 })).toBe(
      "Alle 3 Teile gelesen.",
    );
  });

  it("sagt vor dem ersten Scan nichts Falsches", () => {
    expect(fortschrittstext(undefined)).toBe("Noch nichts gescannt.");
    expect(fortschrittstext({ art: "leer", haben: 0, anzahl: 0 })).toBe("Noch nichts gescannt.");
  });
});
