/**
 * Komponententests zum letzten Kontakt im Blatt „Funkplan" (Funkplan F3,
 * KONZEPT-FUNKPLAN.md §5, Option 5b).
 *
 * Gemessen wird die Verdrahtung: das Band mit sechs Kacheln, die Spalte
 * „Letzter Kontakt" mit Bernstein über der Schwelle und „kein Kontakt"
 * daneben, die Sicht „Funkproben", „Funkprobe eintragen" mit Strg+P für die
 * gewählte Einheit, „kein Kontakt …" mit Grund in der Auswahlleiste und
 * die Schwelle im Menü „⋯". Die Rechnung prüft Ring 2.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Funkplan } from "./Funkplan.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { FUNK_ANSICHT, um } from "./pruefhilfen/funkplanbeispiel.js";
import { BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("funkplanAnfordern", FUNK_ANSICHT);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

async function geladen(): Promise<HTMLElement> {
  render(<Funkplan />);
  return waitFor(() => screen.getByRole("table", { name: "Zuordnung je Rufgruppe" }));
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Der letzte Kontakt im Blatt „Funkplan“", () => {
  it("zeigt sechs Kacheln: „kein Kontakt“ über der Schwelle in Bernstein, die letzte Funkprobe als Uhrzeit", async () => {
    await geladen();
    const band = screen.getByLabelText("Zahlen des Funkplans");
    expect(band.querySelectorAll(".kpi")).toHaveLength(6);
    const kein = within(band).getByText("kein Kontakt > 60 min").closest(".kpi");
    expect(kein?.className).toContain("warn");
    expect(kein?.textContent).toBe("1kein Kontakt > 60 min");
    expect(within(band).getByText("letzte Funkprobe").closest(".kpi")?.textContent).toBe("1431letzte Funkprobe");
  });

  it("führt „Letzter Kontakt“ als Marke: neutral, Bernstein mit Alter über der Schwelle und „kein Kontakt“ daneben", async () => {
    const tabelle = await geladen();
    const fue = within(tabelle).getByRole("row", { name: /Abschnittsleitung EA 1 Deich Nord/ });
    expect(within(fue).getByText("1431 Funkprobe").className).not.toContain("warn");
    const wp = within(tabelle).getByRole("row", { name: /FGr WP OV Cloppenburg/ });
    const marke = within(wp).getByText("1250 · 1 h 53 min");
    expect(marke.className).toContain("warn");
    expect(marke.getAttribute("title")).toMatch(/kein Kontakt seit mehr als 60 min/);
    expect(within(wp).getByText("kein Kontakt 1305").getAttribute("title")).toBe("Grund: Funkloch Deich");
  });

  it("zeigt in der Sicht „Funkproben“ die Zeitfolge mit Ergebnis, Grund und Akteur", async () => {
    await geladen();
    fireEvent.click(screen.getByRole("button", { name: "Funkproben" }));
    const liste = screen.getByRole("table", { name: "Funkproben als Zeitfolge" });
    const zeilen = within(liste).getAllByRole("row").slice(1);
    expect(zeilen.map((z) => z.querySelector("td")?.textContent)).toEqual(["1431", "1305", "1140"]);
    expect(within(zeilen[1] as HTMLElement).getByText("kein Kontakt").className).toContain("warn");
    expect(within(zeilen[1] as HTMLElement).getByText("Funkloch Deich")).toBeDefined();
    expect(zeilen[2]?.className).toBe("blass");
    expect(within(zeilen[2] as HTMLElement).getByText(/zurückgenommen/)).toBeDefined();
    expect(screen.getByText(/· 3 · jüngste zuerst · 1 ohne Kontakt/)).toBeDefined();
  });

  it("trägt mit Strg+P „Kontakt“ für die markierte Einheit ein, mit der gesehenen Probe als Vorher-Wert", async () => {
    const tabelle = await geladen();
    fireEvent.click(within(tabelle).getByRole("row", { name: /FGr WP OV Cloppenburg/ }));
    expect(within(tabelle).getByRole("row", { name: /FGr WP OV Cloppenburg/ }).getAttribute("aria-selected")).toBe("true");
    const vorher = Date.now();
    fireEvent.keyDown(window, { key: "p", ctrlKey: true });
    await waitFor(() => {
      expect(bedient()).toHaveLength(1);
    });
    const entwurf = bedient()[0] as { neu: { zeitpunkt: string } };
    expect(entwurf).toEqual({
      typ: "FunkprobeDurchgefuehrt",
      nutzlast: { einheitId: "E2", ergebnis: "KONTAKT" },
      vorher: { zeitpunkt: um(12, 50), rufgruppeId: "R2" },
      neu: { zeitpunkt: expect.any(String), rufgruppeId: "R2" },
    });
    expect(Date.parse(entwurf.neu.zeitpunkt)).toBeGreaterThanOrEqual(vorher - 1000);
    await waitFor(() => {
      expect(useLaden.getState().hinweise.at(-1)?.text).toMatch(/^Funkprobe FGr WP OV Cloppenburg: Kontakt \d{4}$/);
    });
  });

  it("schreibt mit Strg+P ohne markierte Einheit nichts und sagt, was fehlt", async () => {
    await geladen();
    expect(screen.queryByRole("toolbar", { name: "Auswahl" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Funkprobe: Kontakt" })).toBeNull();
    await waitFor(() => {
      fireEvent.keyDown(window, { key: "p", ctrlKey: true });
      expect(useLaden.getState().hinweise.at(-1)?.text).toMatch(/erst eine Einheit in der Zuordnung markieren/);
    });
    expect(bedient()).toEqual([]);
  });

  it("fragt bei „kein Kontakt …“ nach dem Grund und schreibt ihn in Rahmen und Wert", async () => {
    const tabelle = await geladen();
    fireEvent.click(within(tabelle).getByRole("row", { name: /Abschnittsleitung EA 1 Deich Nord/ }));
    fireEvent.click(screen.getByRole("button", { name: "kein Kontakt …" }));
    const maske = screen.getByRole("form", { name: "„Abschnittsleitung EA 1 Deich Nord“ — kein Kontakt" });
    expect((within(maske).getByRole("button", { name: "Eintragen" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(maske).getByRole("textbox"), { target: { value: "keine Antwort" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Eintragen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([
        {
          typ: "FunkprobeDurchgefuehrt",
          nutzlast: { einheitId: "E1", ergebnis: "KEIN_KONTAKT" },
          vorher: null,
          neu: { zeitpunkt: expect.any(String), rufgruppeId: "R1", grund: "keine Antwort" },
          grund: "keine Antwort",
        },
      ]);
    });
  });

  it("stellt die Schwelle im Menü „⋯“ ein und schreibt sie mit dem gezeigten Wert als Vorher-Wert", async () => {
    await geladen();
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte im Funkplan" }));
    const gruppe = screen.getByRole("group", { name: "Schwelle „kein Kontakt“ in Minuten" });
    expect(within(gruppe).getByRole("menuitemradio", { name: "60 min" }).getAttribute("aria-checked")).toBe("true");
    expect(within(gruppe).getByText("Schwelle „kein Kontakt“: 60 min")).toBeDefined();
    fireEvent.click(within(gruppe).getByRole("menuitemradio", { name: "90 min" }));
    expect(screen.queryByRole("menu", { name: "Funkplan" })).toBeNull();
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "FunkParameterGesetzt", nutzlast: { einsatzId: "E1" }, vorher: 60, neu: 90 }]);
    });
  });

  it("bietet im beendeten Einsatz weder Funkprobe noch Schwelle an", async () => {
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, einsatzStatus: "BEENDET" } });
    const tabelle = await geladen();
    fireEvent.click(within(tabelle).getByRole("row", { name: /FGr WP OV Cloppenburg/ }));
    const leiste = screen.getByRole("toolbar", { name: "Auswahl" });
    expect(within(leiste).getAllByRole("button").map((k) => k.textContent)).toEqual(["Funk und Erreichbarkeit …"]);
    fireEvent.keyDown(window, { key: "p", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte im Funkplan" }));
    const neunzig = screen.getByRole("menuitemradio", { name: "90 min" });
    expect(neunzig.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(neunzig);
    expect(bedient()).toEqual([]);
  });

  it("zeigt die Auswahlleiste erst mit einer gewählten Einheit, mit Funkprobe als Hauptweg, und hebt sie mit Esc auf", async () => {
    const tabelle = await geladen();
    expect(screen.queryByRole("button", { name: "Funkprobe eintragen" })).toBeNull();
    fireEvent.click(within(tabelle).getByRole("row", { name: /FGr WP OV Cloppenburg/ }));
    const leiste = screen.getByRole("toolbar", { name: "Auswahl" });
    expect(within(leiste).getByText("1 gewählt · FGr WP OV Cloppenburg")).toBeDefined();
    expect(within(leiste).getAllByRole("button").map((k) => k.textContent)).toEqual([
      "Funkprobe: KontaktStrg+P",
      "kein Kontakt …",
      "Funk und Erreichbarkeit …",
      "Rufgruppe ändern …",
    ]);
    expect(within(leiste).getByRole("button", { name: "Funkprobe: Kontakt" }).className).toBe("haupt");
    await waitFor(() => {
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("toolbar", { name: "Auswahl" })).toBeNull();
    });
  });

  it("öffnet per Rechtsklick dieselben Schritte; „Funk und Erreichbarkeit …“ öffnet die Maske", async () => {
    const tabelle = await geladen();
    fireEvent.contextMenu(within(tabelle).getByRole("row", { name: /Abschnittsleitung EA 1 Deich Nord/ }));
    const menue = screen.getByRole("menu", { name: "Abschnittsleitung EA 1 Deich Nord" });
    expect(within(menue).getAllByRole("menuitem").map((e) => e.textContent)).toEqual([
      "Funkprobe: KontaktStrg+P",
      "kein Kontakt …",
      "Funk und Erreichbarkeit …",
      "Rufgruppe ändern …",
    ]);
    expect(within(tabelle).getByRole("row", { name: /Abschnittsleitung EA 1 Deich Nord/ }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(menue).getByRole("menuitem", { name: "Funk und Erreichbarkeit …" }));
    expect(screen.getByRole("form", { name: /Abschnittsleitung EA 1 Deich Nord/ })).toBeDefined();
  });

  it("öffnet mit „Rufgruppe ändern …“ die Zelle Rufgruppe der gewählten Zeile", async () => {
    const tabelle = await geladen();
    fireEvent.click(within(tabelle).getByRole("row", { name: /FGr WP OV Cloppenburg/ }));
    expect(screen.queryByLabelText("Rufgruppe für FGr WP OV Cloppenburg")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Rufgruppe ändern …" }));
    expect(screen.getByLabelText("Rufgruppe für FGr WP OV Cloppenburg")).toBeDefined();
  });
});
