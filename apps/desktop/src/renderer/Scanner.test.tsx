/**
 * Komponententests zum Handscanner (M3.4).
 *
 * Die fachliche Strecke — Segmente sammeln, Signatur prüfen, übernehmen —
 * misst `szenarien-eeb.test.ts` mit echten Bögen. Hier steht, dass die Maske
 * sich wie ein Scannerfeld verhält: Enter schickt und leert, der Fortschritt
 * ist lesbar, und die Übernahme geht in den gewählten Abschnitt.
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
      einheitenSumme: 0, erwartet: 0, erwartetSumme: 0,
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

describe("Der Datei-Weg der Scanner-Maske", () => {
  const PDF = `%PDF-1.7\n1 0 obj\n<< /Type /EmbeddedFile >>\nstream\n{"schemaVersion":8,"einheit":{"hierarchie":[]}}\nendstream\nendobj\n`;

  function datei(name: string, inhalt: string): File {
    const bytes = new TextEncoder().encode(inhalt);
    // jsdom kennt `File.arrayBuffer` nicht in jeder Fassung; die Maske braucht nur das.
    return Object.assign(new File([bytes], name), { arrayBuffer: () => Promise.resolve(bytes.buffer) });
  }

  beforeEach(() => {
    attrappe.antwortet("eebDatei", { art: "vollstaendig", haben: 1, anzahl: 1, wartend: 2, vorschau: VORSCHAU });
    attrappe.antwortet("eebUeberspringen", { art: "vollstaendig", haben: 1, anzahl: 1, wartend: 1, vorschau: VORSCHAU });
  });

  it("schickt den Bogen einer abgelegten PDF und zeigt, wie viele noch warten", async () => {
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    const flaeche = screen.getByRole("region", { name: "Erfassungsbogen einlesen" });
    fireEvent.drop(flaeche, { dataTransfer: { types: ["Files"], files: [datei("bogen.pdf", PDF)] } });

    await waitFor(() => {
      expect(attrappe.letzterRuf("eebDatei")?.texte).toEqual(['{"schemaVersion":8,"einheit":{"hierarchie":[]}}']);
    });
    expect(await screen.findByText(/Noch 2 weitere Bögen in der Datei\./)).toBeDefined();
  });

  it("nimmt die Datei auch über das Dateifeld", async () => {
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Erfassungsbogen als PDF"), { target: { files: [datei("bogen.pdf", PDF)] } });
    await waitFor(() => {
      expect(attrappe.rufeDerArt("eebDatei")).toHaveLength(1);
    });
  });

  it("weist eine Datei ab, die keine PDF ist, ohne den Worker zu fragen", async () => {
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Erfassungsbogen als PDF"), { target: { files: [datei("liste.xlsx", "PK")] } });
    expect(await screen.findByText("Keine PDF: liste.xlsx")).toBeDefined();
    expect(attrappe.rufeDerArt("eebDatei")).toHaveLength(0);
  });

  it("behält die Vorschau, wenn eine Datei ohne Bogen dazukommt", async () => {
    attrappe.antwortet("eebDatei", { art: "unlesbar", haben: 1, anzahl: 1, meldung: "Die Datei enthält keinen Erfassungsbogen." });
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Erfassungsbogen als PDF"), { target: { files: [datei("leer.pdf", "%PDF-1.7\n")] } });
    expect(await screen.findByText("Die Datei enthält keinen Erfassungsbogen.")).toBeDefined();
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
  });

  it("überspringt den angezeigten Bogen, solange weitere warten", async () => {
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, wartend: 2, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Überspringen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("eebUeberspringen")).toHaveLength(1);
    });
    expect(await screen.findByText(/Noch ein weiterer Bogen in der Datei\./)).toBeDefined();
  });

  it("zeigt nach der Übernahme den nächsten Bogen der Datei", async () => {
    attrappe.antwortet("eebUebernehmen", {
      art: "uebernommen",
      einheitId: "E-abc",
      ereignisse: 13,
      naechster: { art: "vollstaendig", haben: 1, anzahl: 1, vorschau: { ...VORSCHAU, bezeichnung: "Fachgruppe Räumen" } },
    });
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, wartend: 1, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
    expect(await screen.findByText("Fachgruppe Räumen")).toBeDefined();
    // Ohne wartende Bögen gibt es nichts zu überspringen.
    expect(screen.queryByRole("button", { name: "Überspringen" })).toBeNull();
  });

  it("übernimmt alle Bögen der Datei auf einen Klick", async () => {
    attrappe.antwortet("eebAlleUebernehmen", {
      uebernommen: 55,
      ereignisse: 550,
      fehlgeschlagen: [{ bezeichnung: "Fachgruppe Räumen", meldung: "Abschnitt unbekannt" }],
    });
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, wartend: 55, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Alle übernehmen (56)" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("eebAlleUebernehmen")?.abschnittId).toBe("EO");
    });
    expect(
      await screen.findByText(
        "55 Bögen übernommen (550 Ereignisse). 1 nicht übernommen — Fachgruppe Räumen: Abschnitt unbekannt",
      ),
    ).toBeDefined();
    // Die Vorschau ist abgeräumt.
    expect(screen.queryByText("Bergungsgruppe 1")).toBeNull();
  });

  it("zeigt den Fortschritt des Massenimports und sperrt solange die Knöpfe", async () => {
    let fertigmelden: (wert: unknown) => void = () => undefined;
    attrappe.antwortet("eebAlleUebernehmen", new Promise((aufloesen) => {
      fertigmelden = aufloesen;
    }));
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, wartend: 55, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Alle übernehmen (56)" }));

    expect(await screen.findByText("Übernehme Bogen 1 von 56 …")).toBeDefined();
    act(() => {
      useLaden.getState().nimmMitteilung({ art: "eebFortschritt", akteId: "akte-1", fertig: 12, gesamt: 56 });
    });
    expect(screen.getByText("Übernehme Bogen 13 von 56 …")).toBeDefined();
    expect((screen.getByLabelText("Fortschritt des Massenimports") as HTMLProgressElement).value).toBe(12);
    expect((screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Von vorn" }) as HTMLButtonElement).disabled).toBe(true);

    fertigmelden({ uebernommen: 56, ereignisse: 560, fehlgeschlagen: [] });
    expect(await screen.findByText("56 Bögen übernommen (560 Ereignisse).")).toBeDefined();
    expect(screen.queryByLabelText("Fortschritt des Massenimports")).toBeNull();
  });

  it("ignoriert eine Fortschrittsmeldung, wenn kein Massenimport läuft", () => {
    useLaden.setState({ eebFortschritt: undefined });
    useLaden.getState().nimmMitteilung({ art: "eebFortschritt", akteId: "akte-1", fertig: 3, gesamt: 3 });
    expect(useLaden.getState().eebFortschritt).toBeUndefined();
  });

  it("bietet „Alle übernehmen“ beim Handscanner nicht an", () => {
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    expect(screen.queryByRole("button", { name: /Alle übernehmen/ })).toBeNull();
  });

  it("bietet „Überspringen“ beim Handscanner nicht an", () => {
    useLaden.setState({ eeb: { art: "vollstaendig", haben: 1, anzahl: 1, vorschau: VORSCHAU } });
    render(<Scanner abschnittId="EO" aufSchliessen={() => undefined} />);
    expect(screen.queryByRole("button", { name: "Überspringen" })).toBeNull();
  });
});
