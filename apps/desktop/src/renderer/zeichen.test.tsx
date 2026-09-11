/**
 * Das taktische Zeichen aus dem importierten Satz.
 *
 * Geprüft wird die Naht zum Zeichensatz: Was im Bündel liegt, wird inline
 * gesetzt; was fehlt, steht als Wort da und nicht als Lücke.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Zeichen } from "./zeichen.js";
import {
  alleZeichen,
  kategorien,
  kenntZeichen,
  ladeZeichen,
  sucheZeichen,
  titelVon,
} from "./zeichensatz.js";

afterEach(cleanup);

describe("Der Zeichensatz", () => {
  it("kennt den ganzen Satz und nicht nur die Kategorien einer Ansicht", () => {
    expect(kenntZeichen("Führungsstellen/EAL")).toBe(true);
    expect(kenntZeichen("Einrichtungen/Meldekopf")).toBe(true);
    // Einheiten und Fahrzeuge werden anderswo gebraucht — sie sind da.
    expect(kenntZeichen("THW_Einheiten/Bergungsgruppe")).toBe(true);
    expect(alleZeichen().length).toBeGreaterThan(500);
    expect(kategorien()).toContain("Führungsstellen");
  });

  it("sucht über Titel und Kennung", () => {
    expect(sucheZeichen("EAL").map((eintrag) => eintrag.kennung)).toContain("Führungsstellen/EAL");
    expect(sucheZeichen("meldekopf").map((eintrag) => eintrag.kennung)).toContain(
      "Einrichtungen/Meldekopf",
    );
    // Die Kategorie grenzt ein, die Zahl der Treffer bleibt beherrschbar.
    const nurFuehrung = sucheZeichen("", { kategorie: "Führungsstellen", hoechstens: 5 });
    expect(nurFuehrung).toHaveLength(5);
    expect(nurFuehrung.every((eintrag) => eintrag.kennung.startsWith("Führungsstellen/"))).toBe(true);
    expect(titelVon("Führungsstellen/EAL")).toBe("Einsatzabschnittsleitung");
  });

  it("nimmt beim Laden DOCTYPE und feste Maße heraus, lässt die viewBox stehen", async () => {
    const svg = (await ladeZeichen("Führungsstellen/EAL")) ?? "";
    expect(svg).not.toContain("DOCTYPE");
    expect(svg).not.toMatch(/<svg[^>]*width="256"/);
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(await ladeZeichen("Gibt/EsNicht")).toBeUndefined();
  });
});

describe("Zeichen", () => {
  it("setzt das Zeichen inline, damit die mitgelieferte Schrift greift", async () => {
    render(<Zeichen kennung="Führungsstellen/EAL" breite={120} />);
    // Die Bedeutung steht schon da, bevor die Datei geladen ist: Der Titel
    // kommt aus dem Verzeichnis.
    const marke = await waitFor(() => screen.getByLabelText("Einsatzabschnittsleitung"));
    expect(marke.querySelector("svg")).not.toBeNull();
    expect(marke.textContent).toContain("EAL");
  });

  it("schneidet den Rand der Zeichenfläche weg, wenn ein Ausschnitt genannt ist", async () => {
    render(
      <Zeichen
        kennung="Führungsstellen/EAL"
        bedeutung="Einsatzabschnittsleitung"
        breite={120}
        ausschnitt="0 56 256 176"
      />,
    );
    const svg = await waitFor(() => {
      const knoten = screen.getByLabelText("Einsatzabschnittsleitung").querySelector("svg");
      expect(knoten).not.toBeNull();
      return knoten;
    });
    expect(svg?.getAttribute("viewBox")).toBe("0 56 256 176");
  });

  it("nennt ein fehlendes Zeichen beim Namen", () => {
    render(<Zeichen kennung="Gibt/EsNicht" bedeutung="Etwas Unbekanntes" breite={80} />);
    expect(screen.getByText("Etwas Unbekanntes")).toBeDefined();
  });
});
