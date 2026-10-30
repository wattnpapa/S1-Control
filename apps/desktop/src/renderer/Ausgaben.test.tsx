/**
 * Die Ausgabenleiste — hier: der Weg zur Einheitenliste.
 *
 * Geprüft wird, dass die Knöpfe die richtige Ausgabeart und das richtige
 * Format rufen und dass der Pfad der geschriebenen Datei genannt wird. Was
 * in der Datei steht, prüfen die Ausgaben selbst und ihr Goldfile.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Ausgaben } from "./Ausgaben.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("ausgabeErzeugen", { pfad: "/share/ausgaben/einheitenliste_2026-09-08_0815.pdf", bytes: 2048 });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [], htmlMonitor: undefined });
});

describe("Die Einheitenliste in den Ausgaben", () => {
  it("steht als PDF und als HTML in der Reihe der anderen Ausgaben", () => {
    render(<Ausgaben />);
    const knoepfe = screen.getAllByRole("button").map((knopf) => knopf.textContent);
    expect(knoepfe).toContain("Einheitenliste als PDF");
    expect(knoepfe).toContain("Einheitenliste als HTML");
    // Neben Druck und Status, nicht irgendwo hinten: Es sind die drei
    // Ausdrucke der Lagebesprechung.
    expect(knoepfe.indexOf("Einheitenliste als PDF")).toBe(knoepfe.indexOf("Status als HTML") + 1);
  });

  it("ruft die Ausgabe als PDF ohne Organisationsfilter und nennt den Pfad", async () => {
    render(<Ausgaben />);
    await userEvent.click(screen.getByRole("button", { name: "Einheitenliste als PDF" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("ausgabeErzeugen")).toMatchObject({ ausgabe: "einheitenliste", format: "pdf" });
    });
    // Der Filter „Davon Stärke“ gehört zum Druck; die Liste führt alle.
    expect(attrappe.letzterRuf("ausgabeErzeugen")?.organisation).toBeUndefined();
    expect(await screen.findByText(/einheitenliste_2026-09-08_0815\.pdf/)).toBeDefined();
  });

  it("ruft die Ausgabe als HTML", async () => {
    render(<Ausgaben />);
    await userEvent.click(screen.getByRole("button", { name: "Einheitenliste als HTML" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("ausgabeErzeugen")).toMatchObject({ ausgabe: "einheitenliste", format: "html" });
    });
  });
});

describe("Öffnen, Ordner zeigen und Drucken an der erzeugten Ausgabe", () => {
  const UMGEBUNG = { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c" };
  const HTML = "/share/ausgaben/einheitenliste_2026-09-08_0815.html";

  it("bietet bei HTML alle drei Knöpfe an und ruft die Schale mit dem gemeldeten Pfad", async () => {
    attrappe.antwortet("ausgabeErzeugen", { pfad: HTML, bytes: 512 });
    useLaden.setState({ umgebung: { ...UMGEBUNG, dateienZeigen: true } });
    render(<Ausgaben />);
    await userEvent.click(screen.getByRole("button", { name: "Einheitenliste als HTML" }));
    for (const [knopf, wie] of [["Öffnen", "oeffnen"], ["Ordner zeigen", "ordner"], ["Drucken", "drucken"]] as const) {
      await userEvent.click(await screen.findByRole("button", { name: knopf }));
      await waitFor(() => {
        expect(attrappe.letzterRuf("ausgabeZeigen")).toEqual({ art: "ausgabeZeigen", akteId: "akte-1", pfad: HTML, wie });
      });
    }
  });

  it("bietet bei PDF kein Drucken an — das macht das Programm, das es öffnet", async () => {
    useLaden.setState({ umgebung: { ...UMGEBUNG, dateienZeigen: true } });
    render(<Ausgaben />);
    await userEvent.click(screen.getByRole("button", { name: "Einheitenliste als PDF" }));
    expect(await screen.findByRole("button", { name: "Öffnen" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Drucken" })).toBeNull();
  });

  it("blendet die Knöpfe in der Web-Schale aus und nennt nur den Pfad", async () => {
    useLaden.setState({ umgebung: { ...UMGEBUNG, plattform: "web", dateienZeigen: false } });
    render(<Ausgaben />);
    await userEvent.click(screen.getByRole("button", { name: "Einheitenliste als PDF" }));
    expect(await screen.findByText(/einheitenliste_2026-09-08_0815\.pdf/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Öffnen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ordner zeigen" })).toBeNull();
  });

  it("meldet ein gescheitertes Öffnen als Hinweis statt still", async () => {
    attrappe.scheitert("ausgabeZeigen", "Die Datei ließ sich nicht öffnen: kein Programm");
    useLaden.setState({ umgebung: { ...UMGEBUNG, dateienZeigen: true } });
    render(<Ausgaben />);
    await userEvent.click(screen.getByRole("button", { name: "Einheitenliste als PDF" }));
    await userEvent.click(await screen.findByRole("button", { name: "Öffnen" }));
    await waitFor(() => {
      expect(useLaden.getState().hinweise.map((h) => h.text)).toContain("Die Datei ließ sich nicht öffnen: kein Programm");
    });
  });
});
