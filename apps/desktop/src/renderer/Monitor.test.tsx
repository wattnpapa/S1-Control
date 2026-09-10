/**
 * Der Stärke-Monitor als Komponente (M3.5).
 *
 * Geprüft wird, was jemand aus fünf Metern liest, und nicht, welche Elemente
 * dabei entstehen — dieselbe Linie wie in `Statuszeile.test.tsx`. Vier
 * Aussagen stehen zur Prüfung an, und sie sind genau die vier, an denen die
 * DoD M3.5 hängt (05-UMSETZUNGSPLAN.md): die Gesamtstärke, die NATO-Zeit, die
 * dynamische Schrift und das Verhalten ohne geöffnete Akte.
 */

import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Monitor } from "./Monitor.js";
import { SCHRIFT_MIN } from "./monitorZahlen.js";
import type { Lagebild } from "../kontrakt/index.js";

afterEach(cleanup);

const JETZT = Date.parse("2026-09-10T13:30:08.000Z");

const GRUND: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T13:30:00.000Z",
  letzterShareKontakt: "2026-09-10T13:30:07.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 3,
  einheiten: 2,
  gesamtstaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 20 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 7,
};

/** Setzt die Fenstermasse, die jsdom meldet — der Zweitbildschirm des Tests. */
function setzeFenster(breite: number, hoehe: number): void {
  window.innerWidth = breite;
  window.innerHeight = hoehe;
}

beforeEach(() => {
  // Die Vorbelegung von jsdom, damit kein Test die Masse eines anderen erbt.
  setzeFenster(1024, 768);
});

function zeige(teil: Partial<Lagebild> = {}): void {
  render(<Monitor lagebild={{ ...GRUND, ...teil }} jetzt={JETZT} />);
}

/** Die Schriftgrösse der grossen Zeile in Pixeln, so wie sie im Stil steht. */
function grad(text: string): number {
  return Number.parseFloat(screen.getByText(text).style.fontSize);
}

describe("Monitor", () => {
  it("zeigt die Gesamtstärke in der Schreibweise des Blatts Stärke", () => {
    zeige();
    expect(screen.getByText("1/2/20 = 23")).toBeDefined();
    expect(screen.getByText("Fü / UFü / He = Gesamt")).toBeDefined();
  });

  it("zeigt die NATO-Zeit in der Zone A", () => {
    zeige();
    expect(screen.getByText("101430A SEP 26")).toBeDefined();
  });

  it("nimmt einen anderen Zonenbuchstaben von aussen entgegen", () => {
    render(<Monitor lagebild={GRUND} jetzt={JETZT} zone="Z" />);
    expect(screen.getByText("101330Z SEP 26")).toBeDefined();
  });

  it("nennt Einsatz und Stand klein darunter", () => {
    zeige();
    expect(screen.getByText("Hochwasser")).toBeDefined();
    expect(screen.getByText(/vor 8 s/)).toBeDefined();
  });

  it("meldet einen Einsatz ohne Ereignisse nicht als uralt", () => {
    zeige({ standWanduhr: "" });
    expect(screen.getByText(/keine Ereignisse/)).toBeDefined();
  });

  it("bleibt ohne Lagebild ruhig und zeigt keine erfundene Null", () => {
    render(<Monitor lagebild={undefined} jetzt={JETZT} />);
    expect(screen.getByText("Kein Einsatz geöffnet")).toBeDefined();
    expect(screen.queryByText(/=/)).toBeNull();
    // Die Uhr gilt auch ohne Akte und bleibt deshalb stehen.
    expect(screen.getByText("101430A SEP 26")).toBeDefined();
  });

  it("trägt seine Beschriftung für die Fensterwahl", () => {
    zeige();
    expect(screen.getByLabelText("Stärke-Monitor")).toBeDefined();
  });

  it("setzt die Zahl grösser, wenn das Fenster wächst", () => {
    zeige();
    const vorher = grad("1/2/20 = 23");
    expect(vorher).toBeGreaterThan(SCHRIFT_MIN);

    setzeFenster(3000, 2000);
    fireEvent(window, new Event("resize"));

    expect(grad("1/2/20 = 23")).toBeGreaterThan(vorher);
  });

  it("setzt die Zahl kleiner, wenn das Fenster schrumpft, und nie unter das Minimum", () => {
    zeige();
    const vorher = grad("1/2/20 = 23");

    // So schmal, dass die Heuristik unter das Minimum liefe — dort klemmt sie.
    setzeFenster(120, 400);
    fireEvent(window, new Event("resize"));

    const nachher = grad("1/2/20 = 23");
    expect(nachher).toBeLessThan(vorher);
    expect(nachher).toBe(SCHRIFT_MIN);
  });

  it("meldet seinen resize-Hörer beim Abräumen wieder ab", () => {
    // Ein Zweitfenster geht auf und zu. Ein Hörer, der das überlebt, schriebe
    // in eine abgeräumte Komponente — React meldete das als Warnung, und der
    // Speicher liefe über die Schichten hinweg voll.
    zeige();
    cleanup();
    setzeFenster(3000, 2000);
    expect(() => {
      fireEvent(window, new Event("resize"));
    }).not.toThrow();
  });
});
