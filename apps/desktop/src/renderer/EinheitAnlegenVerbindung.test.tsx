/**
 * Einheit anlegen bei verlorener Antwort und bei Unterbrechung (P0-1, P0-3).
 *
 * Der Aufbau ist der des Befunds: echte Web-Brücke mit einem `fetch`, dessen
 * Antwort verloren geht. Gemessen wird, was beim erneuten „Übernehmen" zum
 * Dienst geht: dieselbe Kennung und dieselbe Anfrage-ID – damit legt der
 * Dienst (`web/wiederholung.ts`) die Einheit nur einmal an.
 */

import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EinheitAnlegen } from "./EinheitAnlegen.js";
import { setzeBruecke } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { MELDUNG_UNKLAR, useVerbindung } from "./verbindung.js";
import { KOPF_ANFRAGE_ID, webBruecke } from "./webBruecke.js";

afterEach(() => {
  cleanup();
  setzeBruecke(undefined);
});

function antwortGeschrieben(): Response {
  return new Response(JSON.stringify({ ok: true, wert: { art: "geschrieben", ereignisId: "a-0000000001" } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function baue(hole: typeof fetch): void {
  setzeBruecke(webBruecke({ hole, ueberwachen: false, Quelle: class {} as unknown as typeof EventSource }));
  useVerbindung.getState().zuruecksetzen();
  useLaden.setState({
    akteId: "akte-1",
    baum: {
      lageZeiger: 5,
      baum: [{ id: "EO", name: "Deich Nord", typ: "EINSATZORT", tiefe: 0, kinder: [] }],
    } as never,
    tabelle: undefined,
    fehler: undefined,
    hinweise: [],
  });
}

function fuelleFrei(): HTMLButtonElement {
  render(<EinheitAnlegen abschnittId="EO" aufSchliessen={() => undefined} />);
  fireEvent.click(screen.getByRole("button", { name: "Ohne Vorlage" }));
  fireEvent.change(screen.getByLabelText("Bezeichnung"), { target: { value: "OT-Verloren-A" } });
  fireEvent.change(screen.getByLabelText("Organisation"), { target: { value: "THW" } });
  fireEvent.change(screen.getByLabelText("Ebene"), { target: { value: "ZUG" } });
  fireEvent.change(screen.getByLabelText("Führer"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Unterführer"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Mannschaft"), { target: { value: "6" } });
  return within(screen.getByLabelText("Einheit anlegen")).getByRole("button", { name: "Einheit anlegen" }) as HTMLButtonElement;
}

function sendungen(hole: ReturnType<typeof vi.fn>): { id: string | undefined; koerper: string }[] {
  return hole.mock.calls
    .filter((aufruf) => aufruf[0] === "ruf")
    .map((aufruf) => {
      const init = aufruf[1] as RequestInit;
      return { id: (init.headers as Record<string, string>)[KOPF_ANFRAGE_ID], koerper: init.body as string };
    });
}

describe("Antwort verloren", () => {
  let hole: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    hole = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockImplementation(async () => antwortGeschrieben());
    baue(hole as unknown as typeof fetch);
  });

  it("sagt „Unklar, ob gespeichert“ und wiederholt dieselbe Anlage mit derselben ID", async () => {
    const knopf = fuelleFrei();
    fireEvent.click(knopf);
    await waitFor(() => {
      expect(useLaden.getState().fehler).toBe(MELDUNG_UNKLAR);
    });
    expect(useLaden.getState().fehler).not.toMatch(/Failed to fetch|nicht erreichbar/);

    // Der Herzschlag stellt den Kontakt wieder her; die Eingaben stehen noch da.
    act(() => useVerbindung.getState().meldeKontakt(Date.now()));
    expect((screen.getByLabelText("Bezeichnung") as HTMLInputElement).value).toBe("OT-Verloren-A");
    await waitFor(() => {
      expect(knopf.disabled).toBe(false);
    });
    fireEvent.click(knopf);
    await waitFor(() => {
      expect(sendungen(hole)).toHaveLength(2);
    });

    const [erste, zweite] = sendungen(hole);
    expect(erste?.id).toBeDefined();
    expect(zweite?.id).toBe(erste?.id);
    // Gleiche Einheitenkennung im Körper – sonst wäre es eine zweite Einheit.
    expect(zweite?.koerper).toBe(erste?.koerper);
  });
});

describe("Unterbrechung", () => {
  it("sperrt Übernehmen sichtbar mit Grund und behält die Eingaben", () => {
    const hole = vi.fn<typeof fetch>();
    baue(hole);
    const knopf = fuelleFrei();
    expect(knopf.disabled).toBe(false);

    act(() => {
      useVerbindung.getState().meldeKontakt(Date.now() - 3000);
      useVerbindung.getState().meldeAusfall(Date.now());
    });
    expect(knopf.disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Keine Verbindung zum Dienst");
    expect(screen.getByRole("alert").textContent).toContain("Eingaben bleiben stehen");
    expect((screen.getByLabelText("Bezeichnung") as HTMLInputElement).value).toBe("OT-Verloren-A");

    act(() => useVerbindung.getState().meldeKontakt(Date.now()));
    expect(knopf.disabled).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(hole).not.toHaveBeenCalled();
  });
});
