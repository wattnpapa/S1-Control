/**
 * Prüffälle zum Hilfefenster (M3.6b).
 *
 * Die schärfste Aussage ist die über die **Herkunft** der Tastenkarte: Sie
 * wird nicht abgeschrieben, sondern aus derselben Liste gelesen, aus der die
 * Kürzel tatsächlich greifen. Ein Test, der nur prüft, dass irgendetwas
 * dasteht, liesse genau den Fehler durch, um den es geht — zwei Listen, von
 * denen die falsche in der Hilfe steht.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AKUELI, ANSICHTEN, STOERFAELLE } from "@s1/domaene";

import { Hilfe, klartext } from "./Hilfe.js";
import { useLaden } from "./laden.js";
import { KUERZEL, kuerzelText } from "./tastatur.js";

afterEach(cleanup);

/** Öffnet das Fenster und schlägt einen seiner vier Bereiche auf (M8.1). */
function zeige(bereich?: "Abkürzungen" | "Ansichten" | "Störfälle"): void {
  render(<Hilfe aufSchliessen={() => undefined} />);
  if (bereich !== undefined) fireEvent.click(screen.getByRole("tab", { name: bereich }));
}

describe("Das Hilfefenster", () => {
  it("zeigt jedes angemeldete Kürzel", () => {
    render(<Hilfe aufSchliessen={() => undefined} />);
    for (const eintrag of KUERZEL) {
      expect(screen.getByText(kuerzelText(eintrag))).toBeDefined();
    }
  });

  it("beginnt mit den ersten Schritten in Klartext und zeigt die Tastenkürzel danach", () => {
    render(<Hilfe aufSchliessen={() => undefined} />);
    const ersteSchritte = screen.getByText("Erste Schritte");
    const tasten = screen.getByText("Tastenkürzel");
    expect(ersteSchritte.compareDocumentPosition(tasten) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/Einsatz anlegen oder öffnen/)).toBeDefined();
  });

  it("verweist weder auf die Excel noch auf Paragrafen noch auf Konzeptdateien", () => {
    const { container } = render(<Hilfe aufSchliessen={() => undefined} />);
    for (const bereich of ["Erste Schritte und Tasten", "Abkürzungen", "Ansichten", "Störfälle"]) {
      fireEvent.click(screen.getByRole("tab", { name: bereich }));
      const text = container.textContent ?? "";
      expect(text, bereich).not.toMatch(/§|Excel|KONZEPT|\*\*/u);
    }
  });

  it("schließt mit Esc", () => {
    let geschlossen = 0;
    render(<Hilfe aufSchliessen={() => (geschlossen += 1)} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(geschlossen).toBe(1);
  });

  it("schließt bei einem Tipp außerhalb, nicht aber im Fenster und nicht am Hilfeknopf", () => {
    let geschlossen = 0;
    render(
      <>
        <button type="button" className="hilfeknopf">Hilfe</button>
        <p>Außerhalb</p>
        <Hilfe aufSchliessen={() => (geschlossen += 1)} />
      </>,
    );
    fireEvent.pointerDown(screen.getByText("Erste Schritte"));
    fireEvent.pointerDown(screen.getByText("Hilfe", { selector: "button.hilfeknopf" }));
    expect(geschlossen).toBe(0);
    fireEvent.pointerDown(screen.getByText("Außerhalb"));
    expect(geschlossen).toBe(1);
  });

  it("verschweigt im Browser den Startstörfall und den lokalen Zwischenspeicher", () => {
    useLaden.setState({ umgebung: { plattform: "web" } as never });
    try {
      zeige("Störfälle");
      expect(screen.queryByText("Die Anwendung startet nicht")).toBeNull();
      expect(screen.queryByText(/Spiegel/)).toBeNull();
    } finally {
      useLaden.setState({ umgebung: undefined });
    }
  });

  it("zeigt die vollständige Abkürzungsliste", () => {
    zeige("Abkürzungen");
    expect(screen.getByText(`${String(AKUELI.length)} Abkürzungen aus dem Abkürzungsverzeichnis`)).toBeDefined();
    expect(screen.getByText("Zugtrupp")).toBeDefined();
  });

  it("sucht im Kürzel und in der Bedeutung", () => {
    zeige("Abkürzungen");
    fireEvent.change(screen.getByLabelText("Suche"), { target: { value: "schlauch" } });
    // „Staffel Logistik Schlauch" trifft über die Bedeutung, „Tr Log
    // Schlauch" über beides. Wer ein Wort kennt und das Kürzel sucht, ist der
    // häufigere Fall am Meldekopf.
    expect(screen.getByText("Staffel Logistik Schlauch")).toBeDefined();
    expect(screen.queryByText("Zugtrupp")).toBeNull();
  });

  it("zeigt zu jeder Ansicht ihren Text aus Ring 2 (M8.1)", () => {
    // Derselbe Text hängt an der Ansicht selbst und steht im Handbuch. Was
    // hier geprüft wird, ist die Herkunft: nicht abgeschrieben, gelesen.
    zeige("Ansichten");
    for (const ansicht of ANSICHTEN) {
      expect(screen.getByText(ansicht.wozu), ansicht.kennung).toBeDefined();
    }
  });

  it("zeigt die sechs Störfälle mit ihren Schritten (M8.1)", () => {
    zeige("Störfälle");
    for (const fall of STOERFAELLE) {
      expect(screen.getByText(fall.titel), fall.kennung).toBeDefined();
      for (const schritt of fall.schritte) {
        expect(screen.getByText(klartext(schritt)), fall.kennung).toBeDefined();
      }
    }
  });

  it("zeigt immer nur einen Bereich — sonst sucht man im Fenster statt in der Sache", () => {
    zeige();
    expect(screen.queryByText(STOERFAELLE[0]?.titel ?? "")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Störfälle" }));
    expect(screen.queryByText(/Abkürzungen aus dem Abkürzungsverzeichnis/)).toBeNull();
  });

  it("lässt sich schließen", () => {
    let geschlossen = false;
    render(
      <Hilfe
        aufSchliessen={() => {
          geschlossen = true;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(geschlossen).toBe(true);
  });
});
