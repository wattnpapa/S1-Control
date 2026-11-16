/**
 * Druck des Nachrichtenvordrucks im Renderer (KONZEPT-NACHRICHTEN.md §7,
 * Entscheidungen 7 und 9; Schnitt N3): der Knopf „Als Vordruck drucken“ in
 * Auswahlleiste, Kontextmenü und Ansicht, die Einstellungen von Blatt und
 * Automatikdruck in „Dieser Arbeitsplatz“ und der leere Vordruck in den
 * Ausgaben.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Einstellungen } from "../kontrakt/index.js";
import { Ausgaben } from "./Ausgaben.js";
import { Druckeinstellungen, druckeinstellungenAus, druckwerteAus, type Druckwerte } from "./Druckeinstellungen.js";
import { useLaden } from "./laden.js";
import { Nachrichten } from "./Nachrichten.js";
import { nachrichtenknoepfe } from "./Nachrichtenauswahl.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";

let attrappe: Attrappe;
const GRUND: Einstellungen = { sharePfad: "/share", anzeigename: "S4 Lage" };
const PFAD = "/share/einsaetze/E1/ausgaben/nachrichten/nachricht-E26-161045nov26.pdf";

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("nachrichtenAnfordern", nachrichtenansicht([BLITZ_AN_S4]));
  attrappe.antwortet("nachrichtVordruckErzeugen", { pfad: PFAD, bytes: 4096 });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    lagebild: NACHRICHTEN_LAGEBILD,
    einstellungen: GRUND,
    umgebung: { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c", dateienZeigen: true, druckerDrucken: true, ordnerWaehlen: true },
    hinweise: [],
    fehler: undefined,
  });
  // Ohne Canvas: Die Vorschau in der Ansicht sagt es und stört den Druck nicht.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function gewaehlt(): Promise<HTMLElement> {
  render(<Nachrichten aufTagebuch={() => undefined} />);
  const tabelle = await waitFor(() => screen.getByRole("table", { name: "Nachrichten: Posteingang" }));
  fireEvent.click(within(tabelle).getByRole("row", { name: /Pumpen eingetroffen/ }));
  return screen.getByRole("toolbar", { name: "Auswahl" });
}

describe("„Als Vordruck drucken“", () => {
  it("steht in der Leiste, ruft den Vordruck mit dem Blatt des Arbeitsplatzes und nennt die Datei", async () => {
    const leiste = await gewaehlt();
    fireEvent.click(within(leiste).getByRole("button", { name: /Als Vordruck drucken/ }));
    await waitFor(() => expect(attrappe.letzterRuf("nachrichtVordruckErzeugen")).toEqual({ art: "nachrichtVordruckErzeugen", akteId: "akte-1", nachrichtId: "N-blitz", blatt: "a5" }));
    expect(await screen.findByText(/Vordruck \(A5\) geschrieben: .*nachricht-E26-161045nov26\.pdf/)).toBeDefined();
    expect(screen.getByRole("button", { name: "Öffnen" })).toBeDefined();
  });

  it("nimmt A4 quer, wenn der Arbeitsplatz es eingestellt hat, und steht auch in der Ansicht", async () => {
    useLaden.setState({ einstellungen: { ...GRUND, vordruckBlatt: "a4quer" } });
    const leiste = await gewaehlt();
    fireEvent.click(within(leiste).getByRole("button", { name: /^Lesen/ }));
    const ansicht = screen.getByRole("dialog", { name: "Nachricht E 26" });
    expect(within(ansicht).getByRole("region", { name: "Vorschau" })).toBeDefined();
    fireEvent.click(within(ansicht).getByRole("button", { name: "Als Vordruck drucken" }));
    await waitFor(() => expect(attrappe.letzterRuf("nachrichtVordruckErzeugen")?.blatt).toBe("a4quer"));
    expect(await within(ansicht).findByText(/Vordruck \(A4 quer\) geschrieben/)).toBeDefined();
  });

  it("steht im Kontextmenü und auch im beendeten Einsatz, weil Drucken nichts schreibt", () => {
    const p = {
      zeile: BLITZ_AN_S4, stellen: ["S4"], sperre: undefined,
      aufLesen: vi.fn(), aufErledigt: vi.fn(), aufErledigungZurueck: vi.fn(), aufAntworten: vi.fn(), aufWeiterleiten: vi.fn(), aufZurueckziehen: vi.fn(), aufTagebuch: vi.fn(), aufVordruck: vi.fn(),
    };
    expect(nachrichtenknoepfe({ ...p, nurLesen: false }).map((k) => k.schluessel)).toContain("vordruck");
    expect(nachrichtenknoepfe({ ...p, nurLesen: true }).map((k) => k.schluessel)).toEqual(["lesen", "vordruck", "tagebuch"]);
  });
});

describe("Blatt und Automatikdruck in „Dieser Arbeitsplatz“", () => {
  it("liest und schreibt die Felder: an nur mit Ziel, Vorbelegungen nicht ungefragt", () => {
    expect(druckwerteAus(GRUND)).toEqual({ blatt: "a5", modus: "aus", pfad: "", drucker: "" });
    expect(druckeinstellungenAus(druckwerteAus(GRUND), GRUND)).toEqual({});
    const verzeichnis: Druckwerte = { blatt: "a4quer", modus: "verzeichnis", pfad: " /mnt/drucke ", drucker: "" };
    expect(druckeinstellungenAus(verzeichnis, GRUND)).toEqual({ vordruckBlatt: "a4quer", automatikdruck: { ziel: "verzeichnis", pfad: "/mnt/drucke" }, automatikdruckAn: true });
    // Verzeichnis ohne Pfad ist kein Ziel: Der Schalter bleibt aus (und wird als Vorbelegung nicht geschrieben).
    expect(druckeinstellungenAus({ ...verzeichnis, pfad: "" }, GRUND).automatikdruckAn).not.toBe(true);
    // Aus: Das Ziel bleibt gemerkt, der Schalter geht aus.
    const gemerkt: Einstellungen = { ...GRUND, automatikdruckAn: true, automatikdruck: { ziel: "drucker", name: "Lager_S4" } };
    expect(druckwerteAus(gemerkt).modus).toBe("drucker");
    expect(druckeinstellungenAus({ ...druckwerteAus(gemerkt), modus: "aus" }, gemerkt)).toEqual({ automatikdruck: { ziel: "drucker", name: "Lager_S4" }, automatikdruckAn: false });
  });

  function Huelle({ start }: { readonly start: Druckwerte }): React.JSX.Element {
    const [werte, setzeWerte] = [start, vi.fn()];
    return <Druckeinstellungen werte={werte} aufAenderung={setzeWerte} />;
  }

  it("bietet im Verzeichnis „Wählen …“ und den Probedruck an das gerade eingetragene Ziel", async () => {
    attrappe.antwortet("probedruck", { art: "verzeichnis", pfad: "/mnt/drucke/probedruck-vordruck_2026-11-16_2200.pdf", bytes: 3000 });
    render(<Huelle start={{ blatt: "a5", modus: "verzeichnis", pfad: "/mnt/drucke", drucker: "" }} />);
    expect(screen.getByRole("button", { name: "Wählen …" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Probedruck" }));
    await waitFor(() => expect(attrappe.letzterRuf("probedruck")).toEqual({ art: "probedruck", ziel: { ziel: "verzeichnis", pfad: "/mnt/drucke" } }));
    expect(await screen.findByText(/Probedruck geschrieben: .*probedruck-vordruck_/)).toBeDefined();
  });

  it("listet die Drucker des Rechners zur Wahl", async () => {
    attrappe.antwortet("druckerAuflisten", [{ name: "Lager_S4", anzeigename: "Lager S4" }]);
    render(<Huelle start={{ blatt: "a5", modus: "drucker", pfad: "", drucker: "" }} />);
    const wahl = await screen.findByRole("combobox", { name: "Drucker" });
    expect(within(wahl).getByRole("option", { name: "Lager S4" })).toBeDefined();
    expect((screen.getByRole("button", { name: "Probedruck" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("bietet im Browser keinen Drucker, sagt es, und lässt das Verzeichnis ohne Dialog", () => {
    useLaden.setState({ umgebung: { plattform: "web", electron: "keine", programmversion: "0", rechnername: "r", clientId: "c", druckerDrucken: false, ordnerWaehlen: false } });
    render(<Huelle start={{ blatt: "a5", modus: "verzeichnis", pfad: "", drucker: "" }} />);
    expect((screen.getByRole("radio", { name: "Drucker" }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Wählen …" })).toBeNull();
    expect(screen.getByText(/Im Browser gibt es nur das Verzeichnis/)).toBeDefined();
  });
});

describe("Der leere Vordruck in den Ausgaben", () => {
  it("nennt neben dem Papier-Vordruck den leeren Nachrichtenvordruck", async () => {
    attrappe.antwortet("ausgabeErzeugen", {
      pfad: "/share/einsaetze/E1/ausgaben/papier-vordruck_2026-11-16_2200.pdf",
      bytes: 9000,
      weitere: [{ pfad: "/share/einsaetze/E1/ausgaben/vordruck-nachricht-leer.pdf", bytes: 7000 }],
    });
    render(<Ausgaben />);
    fireEvent.click(screen.getByRole("button", { name: "Papier-Vordruck als PDF" }));
    expect(await screen.findByText(/Dazu geschrieben: .*vordruck-nachricht-leer\.pdf \(7000 Bytes\)/)).toBeDefined();
    expect(screen.getByText(/Geschrieben: .*papier-vordruck_/)).toBeDefined();
  });
});
