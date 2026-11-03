/**
 * Prüffälle zur Einstiegszeile je Blatt (Entwurf „Entlastung", 3.6).
 *
 * Sie erscheint beim ersten Aufschlagen, „Verstanden" merkt sie je Gerät,
 * und ohne Speicher (privates Fenster, gesperrte Websitedaten) erscheint sie
 * beim nächsten Mal wieder, statt die Bedienung zu stören.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ANSICHTEN } from "@s1/domaene";

import { Einstiegszeile, einstiegsschluessel, ersterSatz } from "./Einstiegszeile.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  localStorage.clear();
});

describe("Die Einstiegszeile", () => {
  it("nennt Blatt und ersten Satz aus den Ansichtstexten und verschwindet mit „Verstanden“", () => {
    const { unmount } = render(<Einstiegszeile ort="eingang.eingangskorb" />);
    const zeile = screen.getByRole("complementary", { name: "Einstieg: Eingang · Eingangskorb" });
    const wozu = ANSICHTEN.find((a) => a.kennung === "eingangskorb")?.wozu ?? "";
    expect(zeile.textContent).toContain(ersterSatz(wozu));
    expect(zeile.textContent).toContain("Strg+H");

    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(localStorage.getItem(einstiegsschluessel("eingang.eingangskorb"))).toBe("1");

    // Gemerkt je Gerät: beim nächsten Aufschlagen nicht mehr da.
    unmount();
    render(<Einstiegszeile ort="eingang.eingangskorb" />);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("gilt je Blatt — ein anderes Blatt zeigt seine eigene Zeile", () => {
    localStorage.setItem(einstiegsschluessel("lage"), "1");
    render(<Einstiegszeile ort="funkplan" />);
    expect(screen.getByRole("complementary", { name: "Einstieg: Funkplan" })).toBeDefined();
  });

  it("hat je Unteransicht eines Sammelblatts eine eigene Zeile und einen eigenen Merker (E3)", () => {
    const { rerender } = render(<Einstiegszeile ort="eingang.anforderungen" />);
    const wozu = ANSICHTEN.find((a) => a.kennung === "anforderungen")?.wozu ?? "";
    expect(screen.getByRole("complementary", { name: "Einstieg: Eingang · Anforderungen" }).textContent).toContain(ersterSatz(wozu));
    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(localStorage.getItem("s1.einstieg.eingang.anforderungen")).toBe("1");

    // Der Eingangskorb im selben Blatt ist davon unberührt.
    rerender(<Einstiegszeile ort="eingang.eingangskorb" />);
    expect(screen.getByRole("complementary", { name: "Einstieg: Eingang · Eingangskorb" })).toBeDefined();
    rerender(<Einstiegszeile ort="fuest.fueorg" />);
    const harke = ANSICHTEN.find((a) => a.kennung === "abschnitte")?.wozu ?? "";
    expect(screen.getByRole("complementary", { name: "Einstieg: Führungsstelle · Führungsorganisation" }).textContent).toContain(
      ersterSatz(harke),
    );
    rerender(<Einstiegszeile ort="fuest.stammdaten" />);
    expect(screen.getByRole("complementary", { name: "Einstieg: Führungsstelle · Stammdaten und Schichtplan" })).toBeDefined();
  });

  it("erscheint ohne Speicher beim nächsten Mal wieder, ohne zu stören", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("gesperrt");
    });
    const { unmount } = render(<Einstiegszeile ort="lage" />);
    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(screen.queryByRole("complementary")).toBeNull();
    unmount();
    render(<Einstiegszeile ort="lage" />);
    expect(screen.getByRole("complementary", { name: "Einstieg: Lage" })).toBeDefined();
  });

  it("nimmt nur den ersten Satz", () => {
    expect(ersterSatz("Erstens. Zweitens.")).toBe("Erstens.");
    expect(ersterSatz("Ohne Punkt")).toBe("Ohne Punkt");
  });
});
