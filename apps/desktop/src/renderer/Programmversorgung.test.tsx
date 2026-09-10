/**
 * Prüffälle zum Versorgungsknopf (M9.1).
 *
 * Zwei Aussagen tragen diese Datei. **Erstens**: Es geht kein Ruf nach
 * draußen, bevor ein Mensch zweimal gedrückt hat — einmal auf den Knopf,
 * einmal auf die Bestätigung. **Zweitens**: Ist ein Einsatz geöffnet, steht
 * die Warnung da, und zwar als Meldung mit Alarmrolle und nicht als Fußnote.
 *
 * Beides ist prüfbar, weil der Ruf über die Attrappe geht: Was gerufen wurde,
 * steht danach in ihrer Liste.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Programmversorgung } from "./Programmversorgung.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("programmpaketHolen", {
    art: "geholt",
    version: "2.1.0",
    datei: "S1-Control-2.1.0-win-x64.exe",
    groesse: 92_000_000,
    pfad: "\\\\nas\\einsatz\\S1-Control\\programm\\S1-Control-2.1.0-win-x64.exe",
    kurzform: "1a2b 3c4d 5e6f 7a8b",
  });
  attrappe.antwortet("programmstandPruefen", { art: "keinManifest", ordner: "programm" });
  useLaden.setState({
    akteId: undefined,
    bezug: undefined,
    holtPaket: false,
    einstellungen: { sharePfad: "\\\\nas\\einsatz", anzeigename: "Zugtrupp" },
    fehler: undefined,
    hinweise: [],
  });
});

function gerufen(): number {
  return attrappe.rufe.filter((r) => r.art === "programmpaketHolen").length;
}

describe("Der Versorgungsknopf", () => {
  it("steht nicht da, solange kein Share eingestellt ist", () => {
    // Ein Knopf, der nur eine Fehlermeldung erzeugte, ist kein Angebot,
    // sondern eine Falle.
    useLaden.setState({ einstellungen: { sharePfad: "", anzeigename: "" } });
    render(<Programmversorgung />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("ruft beim ersten Druck noch nichts nach draußen", () => {
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    expect(gerufen()).toBe(0);
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("holt erst nach der Bestätigung", async () => {
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Paket holen" }));
    await waitFor(() => {
      expect(gerufen()).toBe(1);
    });
  });

  it("holt nichts, wenn abgebrochen wird", () => {
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(gerufen()).toBe(0);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("warnt deutlich, wenn ein Einsatz geöffnet ist", () => {
    useLaden.setState({ akteId: "akte-1" });
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));

    // Als Meldung mit Alarmrolle und nicht als Fußnote: Wer mitten in einer
    // Lage sitzt, soll den Satz nicht überlesen können.
    const warnung = screen.getByRole("alert");
    expect(warnung.textContent).toContain("nicht während einer laufenden");
    // Und die Bestätigung heißt anders — „Trotzdem" ist der halbe Satz.
    expect(screen.getByRole("button", { name: "Trotzdem holen" })).toBeDefined();
  });

  it("sagt ohne offenen Einsatz, dass der Zeitpunkt der richtige ist", () => {
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/richtige Zeitpunkt/)).toBeDefined();
  });

  it("nennt nach dem Holen Fassung, Ort und Schlüsselkurzform", async () => {
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Paket holen" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("2.1.0");
    });
    const text = screen.getByRole("status").textContent ?? "";
    expect(text).toContain("programm");
    expect(text).toContain("1a2b 3c4d 5e6f 7a8b");
    // Die Aussage, die auch nach dem Holen gilt.
    expect(text).toContain("angeboten");
  });

  it("zeigt eine Ablehnung als Ablehnung und nicht als Erfolg", async () => {
    attrappe.antwortet("programmpaketHolen", {
      art: "abgelehnt",
      grund: "dateiPasstNicht",
      meldung: "Die geladene Datei hat einen anderen Hash als das Manifest nennt.",
    });
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Paket holen" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Es wurde nichts geholt.");
    });
  });

  it("meldet „aktuell“ als Auskunft und nicht als Fehler", async () => {
    attrappe.antwortet("programmpaketHolen", { art: "aktuell", vorhanden: "2.1.0" });
    render(<Programmversorgung />);
    fireEvent.click(screen.getByRole("button", { name: /Paket für die Führungsstelle holen/ }));
    fireEvent.click(screen.getByRole("button", { name: "Paket holen" }));

    await waitFor(() => {
      expect(screen.getByRole("status").textContent).toContain("bereits der neueste Stand");
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
