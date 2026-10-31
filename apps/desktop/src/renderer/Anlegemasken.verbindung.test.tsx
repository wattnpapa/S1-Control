/**
 * Alle Masken, die etwas erzeugen, bei verlorener Antwort und bei Unterbrechung.
 *
 * Gemessen wird je Maske dasselbe: Geht die Antwort verloren, bleiben alle
 * Eingaben stehen, ein Hinweis steht dauerhaft im Dialog, und die Wiederholung
 * trägt dieselbe Kennung (damit der Dienst nur ein Objekt anlegt). Ohne
 * Verbindung ist das Schreiben gesperrt, mit Grund am Knopf.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AbschnittAnlegen } from "./AbschnittAnlegen.js";
import { Anforderungsneu } from "./Anforderungsneu.js";
import { FahrzeugErfassung } from "./UntertabellenErfassung.js";
import { setzeBruecke } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { useVerbindung } from "./verbindung.js";
import { KOPF_ANFRAGE_ID, webBruecke } from "./webBruecke.js";

afterEach(() => {
  cleanup();
  setzeBruecke(undefined);
});

function geschrieben(): Response {
  return new Response(JSON.stringify({ ok: true, wert: { art: "geschrieben", ereignisId: "a-1" } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

/** Der erste Ruf verliert seine Antwort, alle weiteren gehen durch. */
function baue(): ReturnType<typeof vi.fn> {
  const hole = vi
    .fn<typeof fetch>()
    .mockRejectedValueOnce(new TypeError("Failed to fetch"))
    .mockImplementation(async () => geschrieben());
  setzeBruecke(webBruecke({ hole, ueberwachen: false, Quelle: class {} as unknown as typeof EventSource }));
  useVerbindung.getState().zuruecksetzen();
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [], lagebild: undefined });
  return hole;
}

function sendungen(hole: ReturnType<typeof vi.fn>): { id: string | undefined; koerper: string }[] {
  return hole.mock.calls
    .filter((aufruf) => aufruf[0] === "ruf")
    .map((aufruf) => {
      const init = aufruf[1] as RequestInit;
      return { id: (init.headers as Record<string, string>)[KOPF_ANFRAGE_ID], koerper: init.body as string };
    })
    .filter((s) => s.koerper.includes('"bedienen"'));
}

async function klicke(knopf: HTMLElement): Promise<void> {
  await act(async () => {
    fireEvent.click(knopf);
    await Promise.resolve();
  });
  await act(async () => {
    await new Promise((fertig) => setTimeout(fertig, 20));
  });
}

/** Der Herzschlag stellt den Kontakt wieder her. */
function wiederVerbunden(): void {
  act(() => useVerbindung.getState().meldeKontakt(Date.now()));
}

function offline(): void {
  act(() => {
    useVerbindung.getState().meldeKontakt(Date.now() - 3000);
    useVerbindung.getState().meldeAusfall(Date.now());
  });
}

describe("Anforderung (Blatt)", () => {
  it("behält die Eingabe bei verlorener Antwort, zeigt den Hinweis dauerhaft und wiederholt mit derselben Kennung", async () => {
    const hole = baue();
    render(<Anforderungsneu einheitenwahl={[]} />);
    fireEvent.change(screen.getByLabelText("Vorgesehene Einheit"), { target: { value: "OV Hude" } });
    await klicke(screen.getByRole("button", { name: "Anfordern" }));

    expect((screen.getByLabelText("Vorgesehene Einheit") as HTMLInputElement).value).toBe("OV Hude");
    expect(screen.getByText(/Unklar, ob gespeichert – bitte Liste prüfen/)).toBeTruthy();

    // „Wieder verbunden" löscht die Meldung des Fensters, nicht den Hinweis im Dialog.
    act(() => useLaden.getState().entferneVerbindungsmeldungen());
    expect(screen.getByText(/Unklar, ob gespeichert/)).toBeTruthy();

    wiederVerbunden();
    await klicke(screen.getByRole("button", { name: "Anfordern" }));
    const [erste, zweite] = sendungen(hole);
    expect(zweite?.id).toBe(erste?.id);
    expect(zweite?.koerper).toBe(erste?.koerper);
    expect(sendungen(hole)).toHaveLength(2);
    // Erst nach bestätigtem Schreiben leert sich das Formular.
    expect((screen.getByLabelText("Vorgesehene Einheit") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText(/Unklar, ob gespeichert/)).toBeNull();
  });

  it("sperrt offline den Knopf mit Grund, ohne die Eingabe zu leeren", async () => {
    const hole = baue();
    render(<Anforderungsneu einheitenwahl={[]} />);
    fireEvent.change(screen.getByLabelText("Vorgesehene Einheit"), { target: { value: "OV Hude" } });
    offline();
    const knopf = screen.getByRole("button", { name: "Anfordern" }) as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    expect(knopf.title).toContain("Keine Verbindung zum Dienst");
    expect(screen.getByRole("alert").textContent).toContain("Keine Verbindung zum Dienst");
    expect((screen.getByLabelText("Vorgesehene Einheit") as HTMLInputElement).value).toBe("OV Hude");
    expect(sendungen(hole)).toHaveLength(0);
  });

  it("sagt im beendeten Einsatz im Blatt selbst, dass nichts gespeichert wird", () => {
    baue();
    useLaden.setState({ lagebild: { einsatzStatus: "BEENDET" } as never });
    render(<Anforderungsneu einheitenwahl={[]} />);
    expect(screen.getByText(/Einsatz beendet – nur lesen/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Anfordern" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("Abschnitt anlegen", () => {
  const maske = (): void => {
    render(<AbschnittAnlegen elternId={undefined} reihenfolge={1} aufSchliessen={() => undefined} typwahl={() => null} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "ES Nord" } });
  };

  it("legt bei verlorener Antwort nur einen Abschnitt an: gleiche Kennung, Eingabe und Hinweis bleiben", async () => {
    const hole = baue();
    maske();
    const knopf = (): HTMLElement => screen.getByRole("button", { name: "Abschnitt anlegen" });
    await klicke(knopf());
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("ES Nord");
    expect(screen.getByText(/Unklar, ob gespeichert/)).toBeTruthy();
    wiederVerbunden();
    await klicke(knopf());
    const [erste, zweite] = sendungen(hole);
    expect(zweite?.id).toBe(erste?.id);
    expect(zweite?.koerper).toBe(erste?.koerper);
  });

  it("sperrt offline Übernehmen mit sichtbarem Grund", () => {
    baue();
    maske();
    offline();
    expect((screen.getByRole("button", { name: "Abschnitt anlegen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Eingaben bleiben stehen");
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("ES Nord");
  });
});

describe("Fahrzeug erfassen (Untertabelle)", () => {
  it("wiederholt mit derselben Fahrzeugkennung und lässt den Hinweis stehen", async () => {
    const hole = baue();
    render(<FahrzeugErfassung einheitId="E-1" aufSchliessen={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "GKW" } });
    await klicke(screen.getByRole("button", { name: "Erfassen" }));
    expect((screen.getByLabelText("Typ") as HTMLInputElement).value).toBe("GKW");
    expect(screen.getByRole("alert").textContent).toMatch(/Unklar, ob gespeichert/);
    wiederVerbunden();
    await klicke(screen.getByRole("button", { name: "Erfassen" }));
    const [erste, zweite] = sendungen(hole);
    expect(zweite?.id).toBe(erste?.id);
    expect(zweite?.koerper).toBe(erste?.koerper);
  });

  it("sperrt offline Erfassen mit Grund", () => {
    baue();
    render(<FahrzeugErfassung einheitId="E-1" aufSchliessen={() => undefined} />);
    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "GKW" } });
    offline();
    expect((screen.getByRole("button", { name: "Erfassen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Keine Verbindung zum Dienst");
  });
});
