/**
 * Komponententests zur Stammdatenmaske (Blatt „Stammdaten“ der Excel).
 *
 * Gemessen wird an der abgeschickten Anfrage: dass je geändertem Feld genau
 * ein `EinsatzStammdatenGeaendert` mit dem `vorher`-Wert dieses Fensters
 * geht (§2.2a), dass ein unverändertes Bestätigen nichts schreibt und dass
 * ein leerer FüSt-Name gar nicht erst abgeschickt werden kann.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { zeitpunktText } from "@s1/domaene";

import { Stammdatenblock } from "./Stammdatenmaske.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import type { Einsatzstammdaten } from "../kontrakt/index.js";

afterEach(cleanup);

const EINSATZ_ID = "2026-09-08_hochwasser_ab12cd";

const STAMMDATEN: Einsatzstammdaten = {
  name: "Hochwasser Hunte",
  art: "EINSATZ",
  fuestName: "PC-3",
  ort: "Oldenburg",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
};

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    lagebild: { einsatzId: EINSATZ_ID, stammdaten: STAMMDATEN } as never,
    fehler: undefined,
    hinweise: [],
  });
});

function oeffneMaske(): void {
  render(<Stammdatenblock />);
  fireEvent.click(screen.getByRole("button", { name: "Stammdaten bearbeiten" }));
}

function tippe(beschriftung: string, wert: string): void {
  fireEvent.change(screen.getByLabelText(beschriftung), { target: { value: wert } });
}

function bestaetige(): void {
  fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
}

describe("Der Stammdatenblock", () => {
  it("zeigt die Stammdaten als eine Zeile mit den Wörtern der Excel", () => {
    render(<Stammdatenblock />);
    const tabelle = screen.getByRole("table", { name: "Stammdaten" });
    expect(tabelle.textContent).toContain("PC-3");
    expect(tabelle.textContent).toContain("Einsatz");
    expect(tabelle.textContent).toContain("Zwei Schichten");
    expect(tabelle.textContent).toContain(zeitpunktText(STAMMDATEN.beginn));
    // Die übergeordnete FüSt fehlt: ein Strich, kein leeres Kästchen.
    expect(tabelle.textContent).toContain("—");
  });

  it("fehlt, solange das Lagebild keine Stammdaten trägt", () => {
    useLaden.setState({ lagebild: { einsatzId: EINSATZ_ID } as never });
    render(<Stammdatenblock />);
    expect(screen.queryByRole("table", { name: "Stammdaten" })).toBeNull();
  });
});

describe("Die Stammdatenmaske", () => {
  it("schickt je geändertem Feld ein Ereignis mit dem gesehenen Vorher-Wert", async () => {
    oeffneMaske();
    tippe("Name der Führungsstelle (FüSt)", "FüSt Weser-Ems");
    tippe("Übergeordnete Führungsstelle", "TEL Landkreis Oldenburg");
    bestaetige();

    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(2);
    });
    const [fuest, oben] = attrappe.rufeDerArt("bedienen").map((ruf) => ruf.entwurf);
    expect(fuest).toEqual({
      typ: "EinsatzStammdatenGeaendert",
      nutzlast: { einsatzId: EINSATZ_ID, feld: "fuestName" },
      vorher: "PC-3",
      neu: "FüSt Weser-Ems",
    });
    expect(oben?.vorher).toBeNull();
    expect(oben?.neu).toBe("TEL Landkreis Oldenburg");
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Stammdaten des Einsatzes" })).toBeNull();
    });
  });

  it("schreibt nichts, wenn unverändert bestätigt wird — auch nicht für den Beginn", async () => {
    oeffneMaske();
    bestaetige();
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Stammdaten des Einsatzes" })).toBeNull();
    });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("leert ein freies Feld mit null und nicht mit einem leeren Text (§3.2)", async () => {
    oeffneMaske();
    tippe("Einsatzort", "  ");
    bestaetige();
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf).toMatchObject({ vorher: "Oldenburg", neu: null });
    });
  });

  it("sperrt das Übernehmen bei leerem FüSt-Namen und sagt warum", () => {
    oeffneMaske();
    tippe("Name der Führungsstelle (FüSt)", "");
    expect((screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("status").textContent).toContain("Führungsstelle");
  });

  it("liest den Beginn in der Schreibweise der Excel und schickt ihn als Zeitpunkt", async () => {
    oeffneMaske();
    tippe("Einsatzbeginn (TT.MM.JJJJ HH:MM)", "08.09.2026 10:30");
    fireEvent.change(screen.getByLabelText("Einsatzart"), { target: { value: "UEBUNG" } });
    bestaetige();
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(2);
    });
    const [art, beginn] = attrappe.rufeDerArt("bedienen").map((ruf) => ruf.entwurf);
    expect(art?.neu).toBe("UEBUNG");
    expect(beginn?.neu).toBe(new Date(2026, 8, 8, 10, 30).toISOString());
  });

  it("bleibt offen, wenn der Worker abweist — die Eingabe geht nicht verloren", async () => {
    attrappe.antwortet("bedienen", {
      art: "abgewiesen",
      meldung: "Der Name der Führungsstelle darf nicht leer sein.",
      code: "SCHEMA",
      dauerhafterHinweis: false,
    });
    oeffneMaske();
    tippe("Name der Führungsstelle (FüSt)", "FüSt Weser-Ems");
    bestaetige();
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    expect((screen.getByLabelText("Name der Führungsstelle (FüSt)") as HTMLInputElement).value).toBe(
      "FüSt Weser-Ems",
    );
  });

  it("schließt bei Escape, ohne zu schreiben", () => {
    oeffneMaske();
    fireEvent.keyDown(screen.getByLabelText("Einsatzort"), { key: "Escape" });
    expect(screen.queryByRole("form", { name: "Stammdaten des Einsatzes" })).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });
});
