/**
 * Komponententests zur Verpflegung mit Bestellung (S4.3).
 *
 * Geprüft wird, was die Oberfläche schreibt und zeigt: die Bestellkarte mit
 * Differenz, Lieferung, Änderung und Stornierung, die Mahlzeitenregel als
 * Maske, die Ausgabestelle in der Zelle und der Bestellstand an den Karten
 * der Vorausschau und auf dem Monitor.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useLaden } from "./laden.js";
import { MonitorVerpflegung, MonitorVorausschau } from "./Monitoransichten.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BEISPIEL_ANSICHT, BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { Versorgung } from "./Versorgung.js";
import { VersorgungVerpflegung } from "./VersorgungVerpflegung.js";
import { VersorgungVorausschau } from "./VersorgungVorausschau.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("versorgungAnfordern", BEISPIEL_ANSICHT);
  useLaden.setState({
    akteId: "akte-1",
    lagebild: BEISPIEL_LAGEBILD,
    einstellungen: { sharePfad: "/share", anzeigename: "Meier (S4)" },
    fehler: undefined,
    hinweise: [],
  });
});

const bedient = (): unknown[] => attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);

function zeichne(): void {
  render(<VersorgungVerpflegung blatt={BEISPIEL_ANSICHT.blatt} jetzt={BEISPIEL_JETZT} />);
}

describe("Die Bestellkarte (4d)", () => {
  it("zeigt Bedarf, Bestellung und die Differenz in Bernstein", () => {
    zeichne();
    const karte = screen.getByRole("region", { name: "Bestellung" });
    expect(within(karte).getByText(/Bestellung · Abendessen 1800/)).toBeDefined();
    expect(within(karte).getByText("280")).toBeDefined();
    expect(within(karte).getByText("−12 fehlen").className).toContain("warn");
    expect(within(karte).getByLabelText("Verlauf der Bestellungen").textContent).toContain("Mittag 10.09. geliefert: 210");
  });

  it("meldet die Lieferung mit der bestellten Menge", async () => {
    zeichne();
    fireEvent.click(screen.getByRole("button", { name: "Als geliefert melden" }));
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "MahlzeitGeliefert", nutzlast: { bestellungId: "B1" }, vorher: null, neu: 280 }]);
    });
  });

  it("ändert die Bestellung über die Maske mit der Vorausschau als Vorschlag", async () => {
    zeichne();
    fireEvent.click(screen.getByRole("button", { name: "Bestellung ändern …" }));
    const maske = screen.getByRole("form", { name: "Bestellung Abend 1800" });
    expect((within(maske).getByLabelText("Portionen") as HTMLInputElement).value).toBe("292");
    expect((within(maske).getByLabelText("bestellt von") as HTMLInputElement).value).toBe("Meier (S4)");
    fireEvent.change(within(maske).getByLabelText("Portionen"), { target: { value: "300" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Bestellen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([
        {
          typ: "MahlzeitBestellt",
          nutzlast: expect.objectContaining({ datum: "2026-09-10", mahlzeit: "ABEND", portionen: 300, vegetarisch: 33, vegan: 6, ausgabestelleId: "AS1", bestelltVon: "Meier (S4)" }),
        },
      ]);
    });
  });

  it("storniert nur mit Grund", async () => {
    zeichne();
    fireEvent.click(screen.getByRole("button", { name: "Stornieren …" }));
    const maske = screen.getByRole("form", { name: /stornieren/ });
    fireEvent.change(within(maske).getByRole("textbox"), { target: { value: "Küche fällt aus" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Stornieren" }));
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "MahlzeitStorniert", nutzlast: { bestellungId: "B1" }, vorher: null, neu: true, grund: "Küche fällt aus" }]);
    });
  });
});

describe("Mahlzeitenplan und Werkzeuge", () => {
  it("setzt die Ausgabestelle eines Bereichs in der Zelle; leer heißt Vorbelegung", async () => {
    zeichne();
    expect(screen.getByText("Logistik (Vorbelegung)")).toBeDefined();
    fireEvent.doubleClick(screen.getByText("Lieferung Deich Nord"));
    const wahl = screen.getByLabelText("Ausgabestelle für EA 1 Deich Nord");
    fireEvent.change(wahl, { target: { value: "" } });
    fireEvent.keyDown(wahl, { key: "Enter" });
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "AbschnittAusgabestelleGesetzt", nutzlast: { abschnittId: "EA1" }, vorher: "AS2", neu: null, vorwertPruefen: true }]);
    });
  });

  it("setzt die Mahlzeitenregel über die Maske", async () => {
    render(<Versorgung />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Mahlzeitenregel: Vorbelegung/ })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: /Mahlzeitenregel: Vorbelegung/ }));
    const maske = screen.getByRole("form", { name: "Mahlzeitenregel des Einsatzes" });
    fireEvent.change(within(maske).getByLabelText("Ausgabezeit Nacht"), { target: { value: "0200" } });
    fireEvent.click(within(maske).getByLabelText("Nacht für Früh"));
    fireEvent.click(within(maske).getByRole("button", { name: "Regel setzen" }));
    await waitFor(() => {
      expect(bedient()).toHaveLength(1);
    });
    expect(bedient()[0]).toMatchObject({
      typ: "MahlzeitenregelGesetzt",
      nutzlast: { einsatzId: "E1" },
      vorher: null,
      neu: expect.arrayContaining([{ mahlzeit: "NACHT", uhrzeit: "0200", schichten: ["NACHT", "FRUEH"] }]),
    });
  });

  it("legt eine Ausgabestelle an", async () => {
    render(<Versorgung />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ausgabestelle anlegen" })).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Ausgabestelle anlegen" }));
    const maske = screen.getByRole("form", { name: "Ausgabestelle anlegen" });
    fireEvent.change(within(maske).getByLabelText("Name"), { target: { value: "Feldküche Süd" } });
    fireEvent.change(within(maske).getByLabelText("Träger"), { target: { value: "DRK" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Ausgabestelle anlegen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "AusgabestelleAngelegt", nutzlast: expect.objectContaining({ name: "Feldküche Süd", traeger: "DRK" }) }]);
    });
  });
});

describe("Der Bestellstand in Vorausschau und Monitor", () => {
  it("zeigt an den Karten „bestellt 280 · −12“ in Bernstein und sonst „offen“", () => {
    render(<VersorgungVorausschau schau={BEISPIEL_ANSICHT.blatt.vorausschau} jetzt={BEISPIEL_JETZT} bestellstand={BEISPIEL_ANSICHT.blatt.bestellstand} />);
    const abend = screen.getByRole("article", { name: "Abend 1800" });
    expect(within(abend).getByText("bestellt 280 · −12").className).toContain("warn");
    expect(within(screen.getByRole("article", { name: "Nacht 0000" })).getByText("offen")).toBeDefined();
  });

  it("führt auf dem Monitor die Spalte „Bestellt“ und unter den Portionen die Bestellung", () => {
    const e = { lagebild: BEISPIEL_LAGEBILD, jetzt: BEISPIEL_JETZT, zeit: "101443SEP26", mass: { breite: 960, hoehe: 540 } };
    render(<MonitorVorausschau {...e} />);
    const zeilen = within(screen.getByRole("table")).getAllByRole("row");
    expect(within(zeilen[1] as HTMLElement).getByText("280 · −12").className).toContain("monitorwarn");
    expect(within(zeilen[2] as HTMLElement).getByText("offen")).toBeDefined();
    cleanup();
    render(<MonitorVerpflegung {...e} />);
    expect(screen.getByText(/bestellt 280 · Vorausschau 292, es fehlen 12/)).toBeDefined();
  });
});
