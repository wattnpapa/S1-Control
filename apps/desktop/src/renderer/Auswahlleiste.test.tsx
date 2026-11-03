/**
 * Der allgemeine Baustein Auswahlleiste (Entwurf „Entlastung", 6c, 6f):
 * Titel und Knöpfe als Daten, Hauptweg gefüllt, Sperre grau mit Grund,
 * Satz statt Knöpfen im beendeten Einsatz, dasselbe als Kontextmenü.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Auswahlkontextmenue, Auswahlleiste, type Leistenknopf } from "./Auswahlleiste.js";

afterEach(cleanup);

function knoepfe(gewaehlt: string[]): readonly Leistenknopf[] {
  return [
    { schluessel: "a", text: "Funkprobe: Kontakt", kurz: "Strg+P", haupt: true, aufWahl: () => gewaehlt.push("a") },
    { schluessel: "b", text: "kein Kontakt …", sperre: "Erst wählen", aufWahl: () => gewaehlt.push("b") },
    { schluessel: "c", text: "Auflösen", menuetext: "Auflösen …", rot: true, aufWahl: () => gewaehlt.push("c") },
  ];
}

describe("Die Auswahlleiste", () => {
  it("zeigt Titel, Knöpfe mit Kürzel, den Hauptweg gefüllt und den Schluss", () => {
    const gewaehlt: string[] = [];
    render(<Auswahlleiste titel="1 gewählt · EAL 2" knoepfe={knoepfe(gewaehlt)} />);
    const leiste = screen.getByRole("toolbar", { name: "Auswahl" });
    expect(within(leiste).getByText("1 gewählt · EAL 2").tagName).toBe("STRONG");
    const haupt = within(leiste).getByRole("button", { name: /Funkprobe: Kontakt/ });
    expect(haupt.className).toBe("haupt");
    expect(haupt.getAttribute("title")).toBe("(Strg+P)");
    expect(within(leiste).getByRole("button", { name: "Auflösen" }).className).toBe("entfernen");
    expect(within(leiste).getByText("Esc hebt die Auswahl auf")).toBeDefined();
    fireEvent.click(haupt);
    fireEvent.click(within(leiste).getByRole("button", { name: "kein Kontakt …" }));
    expect(gewaehlt).toEqual(["a"]);
    expect(within(leiste).getByRole("button", { name: "kein Kontakt …" }).getAttribute("title")).toBe("Erst wählen");
  });

  it("zeigt im beendeten Einsatz einen Satz statt der Knöpfe und lässt den Schluss auf Wunsch weg", () => {
    render(<Auswahlleiste titel="Anforderung A-1" knoepfe={knoepfe([])} sperrtext="nur lesen" beschriftung="Gewählte Anforderung" schluss={null} />);
    const leiste = screen.getByRole("toolbar", { name: "Gewählte Anforderung" });
    expect(within(leiste).queryAllByRole("button")).toHaveLength(0);
    expect(within(leiste).getByText("nur lesen")).toBeDefined();
    expect(within(leiste).queryByText(/Esc/)).toBeNull();
  });

  it("zeigt dieselben Knöpfe als Kontextmenü, den folgenreichen abgesetzt unten", () => {
    const gewaehlt: string[] = [];
    let zu = 0;
    render(<Auswahlkontextmenue ort={{ x: 10, y: 10 }} titel="EAL 2" knoepfe={knoepfe(gewaehlt)} aufSchliessen={() => (zu += 1)} />);
    const menue = screen.getByRole("menu", { name: "EAL 2" });
    const eintraege = within(menue).getAllByRole("menuitem").map((e) => e.textContent);
    expect(eintraege).toEqual(["Funkprobe: KontaktStrg+P", "kein Kontakt …", "Auflösen …"]);
    expect(menue.querySelector("hr")?.nextElementSibling?.textContent).toBe("Auflösen …");
    fireEvent.click(within(menue).getByRole("menuitem", { name: "Auflösen …" }));
    expect(gewaehlt).toEqual(["c"]);
    expect(zu).toBe(1);
  });
});
