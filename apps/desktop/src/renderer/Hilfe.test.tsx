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

import { Hilfe } from "./Hilfe.js";
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

  it("nennt bei den übernommenen Kürzeln ihre Herkunft aus der Excel", () => {
    render(<Hilfe aufSchliessen={() => undefined} />);
    // Wer die Excel bedient hat, erkennt sie wieder und muss nichts Neues
    // lernen — das ist der Grund, aus dem die Buchstaben übernommen wurden.
    expect(screen.getByText(/in der Excel: Strg\+N/)).toBeDefined();
    expect(screen.getByText(/in der Excel: Strg\+H/)).toBeDefined();
  });

  it("zeigt die vollständige Abkürzungsliste", () => {
    zeige("Abkürzungen");
    expect(screen.getByText(`${String(AKUELI.length)} Einträge aus dem Blatt „AküLi“ der Excel`)).toBeDefined();
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
        expect(screen.getByText(schritt), fall.kennung).toBeDefined();
      }
    }
  });

  it("zeigt immer nur einen Bereich — sonst sucht man im Fenster statt in der Sache", () => {
    zeige();
    expect(screen.queryByText(STOERFAELLE[0]?.titel ?? "")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Störfälle" }));
    expect(screen.queryByText(/Einträge aus dem Blatt/)).toBeNull();
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
