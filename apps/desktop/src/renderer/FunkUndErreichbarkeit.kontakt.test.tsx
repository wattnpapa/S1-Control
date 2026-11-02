/**
 * Die Zeile „Letzter Kontakt" der Maske „Funk und Erreichbarkeit" (Funkplan
 * F3, Option 5d).
 *
 * Gemessen wird: die Marke mit Alter und „kein Kontakt" daneben; „Funkprobe
 * jetzt: Kontakt" schreibt sofort, ohne die Maske zu schließen, und führt
 * Anzeige und Vorher-Wert nach; „kein Kontakt …" fragt den Grund in einer
 * eigenen Maske, deren Absenden die Maske der Einheit nicht mitnimmt; im
 * beendeten Einsatz sind die Knöpfe gesperrt.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Funkteilnehmer } from "@s1/domaene";

import { FunkUndErreichbarkeit } from "./FunkUndErreichbarkeit.js";
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
  attrappe.antwortet("tagebuchAnfordern", { lageZeiger: 7, zeilen: [], gesamtzahl: 0, von: 0 });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

const RUFGRUPPEN = FUNK_ANSICHT.plan.rufgruppen;
/** Seit 1250 still, um 1305 „kein Kontakt" mit Grund. */
const E2 = RUFGRUPPEN[1]?.teilnehmer[0] as Funkteilnehmer;

function oeffne(nurLesen = false): void {
  render(<FunkUndErreichbarkeit teilnehmer={E2} rufgruppen={RUFGRUPPEN} schwelleMinuten={60} nurLesen={nurLesen} aufSchliessen={() => undefined} />);
}

function zeile(): HTMLElement {
  return screen.getByRole("group", { name: "Letzter Kontakt" });
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Die Zeile „Letzter Kontakt“ der Maske", () => {
  it("zeigt die Marke mit Alter in Bernstein und „kein Kontakt“ mit Grund daneben", () => {
    oeffne();
    expect(within(zeile()).getByText(/^1250 · \d+ h \d+ min$/).className).toContain("warn");
    expect(within(zeile()).getByText("kein Kontakt 1305").getAttribute("title")).toBe("Grund: Funkloch Deich");
    expect(within(zeile()).getByText(/Bernstein ab 60 min/)).toBeDefined();
  });

  it("schreibt „Funkprobe jetzt: Kontakt“ sofort, lässt die Maske offen und führt Anzeige und Vorher-Wert nach", async () => {
    oeffne();
    fireEvent.click(within(zeile()).getByRole("button", { name: "Funkprobe jetzt: Kontakt" }));
    await waitFor(() => {
      expect(bedient()).toHaveLength(1);
    });
    expect(bedient()[0]).toMatchObject({ typ: "FunkprobeDurchgefuehrt", nutzlast: { einheitId: "E2", ergebnis: "KONTAKT" }, vorher: { zeitpunkt: um(12, 50), rufgruppeId: "R2" } });
    await waitFor(() => {
      expect(within(zeile()).getByText(/^\d{4} Funkprobe$/).className).not.toContain("warn");
    });
    expect(within(zeile()).queryByText(/kein Kontakt \d{4}/)).toBeNull();
    expect(screen.getByRole("form", { name: /Funk und Erreichbarkeit/ })).toBeDefined();
    // Die zweite Probe nimmt die eben geschriebene als Vorher-Wert.
    fireEvent.click(within(zeile()).getByRole("button", { name: "Funkprobe jetzt: Kontakt" }));
    await waitFor(() => {
      expect(bedient()).toHaveLength(2);
    });
    expect((bedient()[1] as { vorher: unknown }).vorher).toEqual((bedient()[0] as { neu: unknown }).neu);
  });

  it("fragt bei „kein Kontakt …“ den Grund in einer eigenen Maske und schreibt nur die Probe", async () => {
    oeffne();
    fireEvent.click(within(zeile()).getByRole("button", { name: "kein Kontakt …" }));
    const abfrage = screen.getByRole("form", { name: "„FGr WP OV Cloppenburg“ — kein Kontakt" });
    fireEvent.change(within(abfrage).getByRole("textbox"), { target: { value: "keine Antwort" } });
    fireEvent.submit(abfrage);
    await waitFor(() => {
      expect(bedient()).toEqual([
        {
          typ: "FunkprobeDurchgefuehrt",
          nutzlast: { einheitId: "E2", ergebnis: "KEIN_KONTAKT" },
          vorher: { zeitpunkt: um(13, 5), rufgruppeId: "R2", grund: "Funkloch Deich" },
          neu: { zeitpunkt: expect.any(String), rufgruppeId: "R2", grund: "keine Antwort" },
          grund: "keine Antwort",
        },
      ]);
    });
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: /kein Kontakt/ })).toBeNull();
    });
    expect(screen.getByRole("form", { name: /Funk und Erreichbarkeit/ })).toBeDefined();
    expect(within(zeile()).getByText(/^kein Kontakt \d{4}$/).getAttribute("title")).toBe("Grund: keine Antwort");
  });

  it("sperrt die Knöpfe im beendeten Einsatz", () => {
    oeffne(true);
    // Gesperrt über das Feldset der Maske: `:disabled` und nicht die eigene Eigenschaft.
    expect(within(zeile()).getByRole("button", { name: "Funkprobe jetzt: Kontakt" }).matches(":disabled")).toBe(true);
    expect(within(zeile()).getByRole("button", { name: "kein Kontakt …" }).matches(":disabled")).toBe(true);
  });
});
