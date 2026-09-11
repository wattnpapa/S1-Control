/**
 * Das taktische Zeichen aus dem importierten Satz.
 *
 * Geprüft wird die Naht zum Zeichensatz: Was im Bündel liegt, wird inline
 * gesetzt; was fehlt, steht als Wort da und nicht als Lücke.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Zeichen } from "./zeichen.js";
import { bekannteZeichen, zeichenSvg } from "./zeichensatz.js";

afterEach(cleanup);

describe("Der Zeichensatz", () => {
  it("trägt die Führungsstellen und die Einrichtungen aus dem Import", () => {
    expect(bekannteZeichen()).toContain("Führungsstellen/EAL");
    expect(bekannteZeichen()).toContain("Einrichtungen/Meldekopf");
  });

  it("nimmt DOCTYPE und feste Maße heraus, lässt die viewBox stehen", () => {
    const svg = zeichenSvg("Führungsstellen/EAL") ?? "";
    expect(svg).not.toContain("DOCTYPE");
    expect(svg).not.toMatch(/<svg[^>]*width="256"/);
    expect(svg).toContain('viewBox="0 0 256 256"');
  });
});

describe("Zeichen", () => {
  it("setzt das Zeichen inline, damit die mitgelieferte Schrift greift", () => {
    render(<Zeichen kennung="Führungsstellen/EAL" bedeutung="Einsatzabschnittsleitung" breite={120} />);
    const marke = screen.getByLabelText("Einsatzabschnittsleitung");
    expect(marke.querySelector("svg")).not.toBeNull();
    expect(marke.textContent).toContain("EAL");
  });

  it("schneidet den Rand der Zeichenfläche weg, wenn ein Ausschnitt genannt ist", () => {
    render(
      <Zeichen
        kennung="Führungsstellen/EAL"
        bedeutung="Einsatzabschnittsleitung"
        breite={120}
        ausschnitt="0 56 256 176"
      />,
    );
    const svg = screen.getByLabelText("Einsatzabschnittsleitung").querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 56 256 176");
  });

  it("nennt ein fehlendes Zeichen beim Namen", () => {
    render(<Zeichen kennung="Gibt/EsNicht" bedeutung="Etwas Unbekanntes" breite={80} />);
    expect(screen.getByText("Etwas Unbekanntes")).toBeDefined();
  });
});
