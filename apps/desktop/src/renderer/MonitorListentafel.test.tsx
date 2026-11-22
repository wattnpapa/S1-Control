/**
 * Die gemeinsame Listentafel: Warnzeilen mit ⚠, Gruppenzeilen, „+N weitere".
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Listentafel, listenplatz, listenzeichen, type Listenzeile } from "./MonitorListentafel.js";
import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";

const E: Ansichtseigenschaften = { lagebild: BEISPIEL_LAGEBILD, jetzt: BEISPIEL_JETZT, zeit: "101443SEP26", mass: { breite: 1920, hoehe: 1080 } };
const SPALTEN = [{ titel: "A", text: true }, { titel: "Zahl" }];

afterEach(cleanup);

describe("Listentafel", () => {
  it("rechnet die Breite je Spalte aus dem längsten Eintrag", () => {
    const zeilen: Listenzeile[] = [
      { schluessel: "1", zellen: ["kurz", "1"] },
      { schluessel: "2", zellen: ["deutlich länger", "12"], warn: true },
      { schluessel: "g", zellen: ["eine sehr lange Gruppenzeile zählt nicht"], gruppe: true },
    ];
    expect(listenzeichen(SPALTEN, zeilen)).toBe(17 + 4 + 6);
  });

  it("zeigt Warnzeilen mit ⚠, Gruppen über die ganze Breite und den Rest", () => {
    const viele: Listenzeile[] = Array.from({ length: 30 }, (_, i) => ({ schluessel: String(i), zellen: [`Zeile ${String(i)}`, String(i)], warn: i === 0 }));
    render(<Listentafel e={E} titel="Probe" beschriftung="Probe" spalten={SPALTEN} zeilen={[{ schluessel: "g", zellen: ["Gruppe"], gruppe: true }, ...viele]} leer="leer" />);
    expect(screen.getByText("Gruppe").getAttribute("colspan")).toBe("2");
    expect(screen.getByText(/Zeile 0/).closest("tr")?.textContent).toMatch(/^⚠ Zeile 0/);
    expect(screen.getByText(`+${String(31 - listenplatz(1080))} weitere`)).toBeDefined();
  });

  it("sagt „Wird geladen“ ohne Zeilen und den Leertext bei leerer Liste", () => {
    render(<Listentafel e={E} titel="Probe" beschriftung="Probe" spalten={SPALTEN} zeilen={undefined} leer="nichts da" />);
    expect(screen.getByText("Wird geladen …")).toBeDefined();
    cleanup();
    render(<Listentafel e={E} titel="Probe" beschriftung="Probe" spalten={SPALTEN} zeilen={[]} leer="nichts da" />);
    expect(screen.getByText("nichts da")).toBeDefined();
  });
});
