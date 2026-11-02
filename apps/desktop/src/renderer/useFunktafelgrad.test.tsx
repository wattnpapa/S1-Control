/**
 * Der nachgezogene Grad der Tafel „Funkplan" (Nachbesserung F4).
 *
 * jsdom hat kein Layout. Die Tests geben deshalb ein Bild vor, das mit dem
 * Grad wächst — Tafelhöhe und Kachelbreite hängen an `font-size` der Tafel —
 * und prüfen, dass die Ansicht die Fläche nutzt: wachsen, solange unter der
 * Tafel Platz ist; zurück, sobald etwas überläuft; neu suchen erst, wenn sich
 * Fenster oder Inhalt ändern, nicht bei jeder Sekunde der Uhr.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MonitorFunkplan, fusswarnung } from "./MonitorFunkplan.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";
import { funktafelgrad } from "./funktafelmass.js";
import { monitorFunkansicht, monitorFunklage, MONITOR_RUFGRUPPEN } from "./pruefhilfen/monitorfunkbeispiel.js";
import { BEISPIEL_JETZT } from "./pruefhilfen/versorgungsbeispiel.js";
import { FUNKTAFEL_GRAD_MIN, naechsterGradstand, type Gradstand } from "./useFunktafelgrad.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ANFANG: Gradstand = { schluessel: "k", grad: 12, fest: false };

describe("naechsterGradstand", () => {
  it("wächst um eins, solange Platz ist und nichts überläuft", () => {
    expect(naechsterGradstand(ANFANG, { ueberlauf: false, frei: 40 }, 30)).toEqual({ schluessel: "k", grad: 13, fest: false });
  });

  it("geht bei Überlauf einen zurück und bleibt dort", () => {
    const zurueck = naechsterGradstand(ANFANG, { ueberlauf: true, frei: 0 }, 30);
    expect(zurueck).toEqual({ schluessel: "k", grad: 11, fest: true });
    expect(naechsterGradstand(zurueck, { ueberlauf: false, frei: 40 }, 30)).toBe(zurueck);
  });

  it("ändert nichts ohne Platz, am Deckel oder am kleinsten Grad", () => {
    expect(naechsterGradstand(ANFANG, { ueberlauf: false, frei: 0 }, 30)).toBe(ANFANG);
    expect(naechsterGradstand(ANFANG, { ueberlauf: false, frei: 40 }, 12)).toBe(ANFANG);
    const klein = { ...ANFANG, grad: FUNKTAFEL_GRAD_MIN, fest: true };
    expect(naechsterGradstand(klein, { ueberlauf: true, frei: 0 }, 30)).toBe(klein);
  });
});

function eigenschaften(jetzt = BEISPIEL_JETZT, mass = { breite: 960, hoehe: 540 }): Ansichtseigenschaften {
  const ansicht = monitorFunkansicht();
  return { lagebild: monitorFunklage(ansicht), jetzt, zeit: "101443SEP26", mass, funkplan: ansicht };
}

function grad(): number {
  return Number.parseInt(screen.getByRole("table").style.fontSize, 10);
}

function rechteck(oben: number, hoehe: number): DOMRect {
  return { x: 0, y: oben, top: oben, left: 0, right: 960, bottom: oben + hoehe, width: 960, height: hoehe, toJSON: () => ({}) };
}

/**
 * Ein Bild, dessen Tafel je Pixel Schrift `jePixel` hoch ist, unter einem
 * Kopf von 60 px, mit einem Fuß von 50 px am unteren Rand des Fensters
 * (jsdom: 768 px hoch). Läuft die Tafel in den Fuß, wird das Bild höher als
 * das Fenster.
 */
function bildMitHoehe(jePixel: number): void {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const tafelUnten = 60 + jePixel * Number.parseInt(document.querySelector("table")?.style.fontSize ?? "0", 10);
    const bild = Math.max(window.innerHeight, tafelUnten + 8 + 50);
    if (this.tagName === "SECTION") return rechteck(0, bild);
    if (this.tagName === "TABLE") return rechteck(60, tafelUnten - 60);
    if (this.classList.contains("monitorfuss")) return rechteck(bild - 50, 50);
    return rechteck(0, 0);
  });
}

describe("Monitor „Funkplan“ misst nach", () => {
  it("bleibt ohne Layout bei der Schätzung", () => {
    const e = eigenschaften();
    render(<MonitorFunkplan {...e} />);
    const plan = monitorFunkansicht().plan;
    const fusszeichen = fusswarnung(plan).length + e.lagebild.einsatzName.length + e.zeit.length + 24;
    const gruppen = MONITOR_RUFGRUPPEN.filter((r) => !r.aufgeloest);
    expect(grad()).toBe(funktafelgrad(e.mass, gruppen, fusszeichen));
  });

  it("wächst über die Schätzung, bis die Tafel den Platz füllt", () => {
    // 60 + 40·g + 8 + 50 ≤ 768 gilt bis g = 16.
    bildMitHoehe(40);
    render(<MonitorFunkplan {...eigenschaften()} />);
    expect(grad()).toBe(16);
  });

  it("verkleinert, wenn die Schätzung überläuft", () => {
    // 60 + 70·g + 8 + 50 ≤ 768 gilt bis g = 9.
    bildMitHoehe(70);
    render(<MonitorFunkplan {...eigenschaften()} />);
    expect(grad()).toBe(9);
  });

  it("geht zurück, wenn eine Kachel ihren Text abschneiden würde", () => {
    bildMitHoehe(10);
    vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(function (this: Element) {
      const g = Number.parseInt(document.querySelector("table")?.style.fontSize ?? "0", 10);
      return this.classList.contains("funkkachel") && g > 14 ? 200 : 0;
    });
    render(<MonitorFunkplan {...eigenschaften()} />);
    expect(grad()).toBe(14);
  });

  it("sucht bei neuer Uhrzeit nicht neu, bei neuem Fenster schon", () => {
    bildMitHoehe(40);
    const { rerender } = render(<MonitorFunkplan {...eigenschaften()} />);
    expect(grad()).toBe(16);
    // Mehr Platz, aber nur die Uhr tickt: Der gefundene Grad bleibt, die
    // Suche läuft nicht bei jeder Sekunde von vorn.
    bildMitHoehe(30);
    rerender(<MonitorFunkplan {...eigenschaften(BEISPIEL_JETZT + 1000)} />);
    expect(grad()).toBe(16);
    // 60 + 30·g + 58 ≤ 768 gilt bis g = 21.
    rerender(<MonitorFunkplan {...eigenschaften(BEISPIEL_JETZT + 2000, { breite: 961, hoehe: 540 })} />);
    expect(grad()).toBe(21);
  });
});
