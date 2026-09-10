/**
 * Prüffälle zur Hilfemarke an einer Ansicht (M8.1).
 *
 * Die Aussage, auf die es ankommt, ist wieder die über die Herkunft: Der
 * Text kommt aus `ANSICHTEN` in Ring 2 und nicht aus dem JSX. Ein Test, der
 * eine feste Zeichenkette erwartete, ginge an der Sache vorbei — er prüfte
 * dann eine zweite Fassung desselben Satzes.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ansichtshilfe } from "@s1/domaene";

import { Hilfemarke } from "./Hilfemarke.js";

afterEach(cleanup);

describe("Die Hilfemarke", () => {
  it("zeigt zunächst nur das Fragezeichen", () => {
    render(<Hilfemarke kennung="einheiten" />);
    const knopf = screen.getByRole("button", { name: "Hilfe zu Einheitentabelle" });
    expect(knopf.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("klappt den Text aus Ring 2 auf und wieder zu", () => {
    const hilfe = ansichtshilfe("abschnitte");
    render(<Hilfemarke kennung="abschnitte" />);
    const knopf = screen.getByRole("button", { name: `Hilfe zu ${hilfe.titel}` });

    fireEvent.click(knopf);
    expect(screen.getByText(hilfe.wozu)).toBeDefined();
    expect(screen.getByText(hilfe.ueberraschung)).toBeDefined();

    fireEvent.click(knopf);
    expect(screen.queryByText(hilfe.wozu)).toBeNull();
  });

  it("nennt die Kürzel dieser Ansicht in ihrer Schreibweise", () => {
    render(<Hilfemarke kennung="abschnitte" />);
    fireEvent.click(screen.getByRole("button", { name: /Hilfe zu/ }));
    // Zweimal: einmal im Fließtext („Mit Strg+N einen Abschnitt anlegen"),
    // einmal in der Kürzelzeile darunter. Beide stammen aus derselben Liste.
    expect(screen.getAllByText(/Strg\+N/).length).toBeGreaterThanOrEqual(2);
  });

  it("kommt ohne Kürzel aus, wo keine angemeldet sind", () => {
    // Die Kostenübersicht hat keine eigenen Kürzel. Eine leere Zeile
    // „ · “ darunter wäre schlechter als keine.
    render(<Hilfemarke kennung="kosten" />);
    fireEvent.click(screen.getByRole("button", { name: /Hilfe zu/ }));
    expect(screen.queryByText(/Strg\+/)).toBeNull();
  });
});
