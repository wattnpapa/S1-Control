/**
 * Komponententests zur Maske „Funk und Erreichbarkeit" (KONZEPT-FUNKPLAN.md
 * §6, Option 5d).
 *
 * Gemessen wird, was die Maske schreibt: je geändertem Feld ein Schritt mit
 * dem Wert, den sie beim Öffnen sah; „Überschreiben …" setzt den Override,
 * „Ableitung verwenden" nimmt ihn zurück; die Chips schreiben die ganze
 * Liste. Dazu der Auszug des Tagebuchs, die Sperre, der Nur-Lesen-Zustand
 * und die beiden Wege hinein: aus dem Blatt „Funkplan" und aus der Lage.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Funkteilnehmer, Tabellenzeile, Tagebuchzeile } from "@s1/domaene";

import { Einheitenmasken } from "./Einheitenmasken.js";
import { Funkplan } from "./Funkplan.js";
import { FunkUndErreichbarkeit } from "./FunkUndErreichbarkeit.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { FUNK_ANSICHT } from "./pruefhilfen/funkplanbeispiel.js";
import { BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("funkplanAnfordern", FUNK_ANSICHT);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

const RUFGRUPPEN = FUNK_ANSICHT.plan.rufgruppen;

/** E2 aus dem Beispiel, dazu eine weitere Gruppe, ein Funkhinweis und ein Override der Erreichbarkeit. */
const E2: Funkteilnehmer = {
  ...(RUFGRUPPEN[1]?.teilnehmer[0] as Funkteilnehmer),
  erreichbarkeit: "Funk Kanal 31",
  erreichbarkeitOverride: "Funk Kanal 31",
  funkhinweis: "Bei Netzausfall auf DMO 311",
  weitereRufgruppen: [
    { rufgruppeId: "R1", name: "THW_OL_FUE", aufgeloest: false },
    { rufgruppeId: "R5", name: "THW_OL_BR", aufgeloest: true },
  ],
};

function zeile(typ: string, satz: string, feld?: string): Tagebuchzeile {
  return { ereignisId: `a-${satz}`, typ, hlcText: "0", wanduhr: new Date(2026, 8, 10, 12, 50).toISOString(), akteur: "Meier", rechner: "fmz", clientId: "c1", satz, einheitId: "E2", ...(feld === undefined ? {} : { feld }) };
}

function oeffne(t: Funkteilnehmer = E2, nurLesen = false): void {
  render(<FunkUndErreichbarkeit teilnehmer={t} rufgruppen={RUFGRUPPEN} nurLesen={nurLesen} aufSchliessen={() => undefined} />);
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

function uebernimm(): void {
  fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
}

describe("Die Maske „Funk und Erreichbarkeit“", () => {
  it("zeigt Hauptrufgruppe, weitere Gruppen als Chips, Ableitungen und Funkhinweis und sperrt die Einheit", () => {
    oeffne();
    expect(screen.getByRole("form", { name: "„FGr WP OV Cloppenburg“ — Funk und Erreichbarkeit" })).toBeDefined();
    expect((screen.getByLabelText(/Hauptrufgruppe/) as HTMLSelectElement).value).toBe("R2");
    const chips = within(screen.getByRole("list", { name: "Weitere Rufgruppen" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(chips).toEqual(["THW_OL_FUE×", "THW_OL_BR (aufgelöst)×"]);
    expect(screen.getByRole("status", { name: "Funkrufname" }).textContent).toBe("Heros Cloppenburg 28/51");
    expect((screen.getByLabelText("Erreichbarkeit") as HTMLInputElement).value).toBe("Funk Kanal 31");
    expect((screen.getByLabelText(/Funkhinweis/) as HTMLTextAreaElement).value).toBe("Bei Netzausfall auf DMO 311");
    expect(attrappe.letzterRuf("sperre")).toEqual({ art: "sperre", akteId: "akte-1", entitaetId: "E2" });
  });

  it("schreibt nichts, wenn nichts geändert wurde, und schließt", async () => {
    let zu = false;
    render(<FunkUndErreichbarkeit teilnehmer={E2} rufgruppen={RUFGRUPPEN} aufSchliessen={() => { zu = true; }} />);
    uebernimm();
    await waitFor(() => expect(zu).toBe(true));
    expect(bedient()).toEqual([]);
  });

  it("schreibt Hauptrufgruppe und Funkhinweis je mit dem gesehenen Vorher-Wert", async () => {
    oeffne();
    fireEvent.change(screen.getByLabelText(/Hauptrufgruppe/), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText(/Funkhinweis/), { target: { value: "nachts nur Telefon" } });
    uebernimm();
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId: "E2" }, vorher: "R2", neu: null, vorwertPruefen: true },
        { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E2", feld: "funkHinweis" }, vorher: "Bei Netzausfall auf DMO 311", neu: "nachts nur Telefon", vorwertPruefen: true },
      ]);
    });
  });

  it("entfernt und ergänzt Chips und schreibt die ganze Liste", async () => {
    oeffne();
    fireEvent.click(screen.getByRole("button", { name: "THW_OL_BR (aufgelöst) entfernen" }));
    const wahl = screen.getByLabelText("Weitere Rufgruppe hinzufügen");
    // Zur Wahl stehen nur geltende Gruppen, die weder Haupt- noch schon weitere Gruppe sind.
    expect(within(wahl).getAllByRole("option").map((o) => o.getAttribute("value"))).toEqual(["", "R3", "R4"]);
    fireEvent.change(wahl, { target: { value: "R3" } });
    uebernimm();
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E2", feld: "weitereRufgruppenIds" }, vorher: ["R1", "R5"], neu: ["R1", "R3"], vorwertPruefen: true },
      ]);
    });
  });

  it("überschreibt den Funkrufnamen und schreibt die unveränderte Vorbelegung nicht", async () => {
    let zu = false;
    render(<FunkUndErreichbarkeit teilnehmer={E2} rufgruppen={RUFGRUPPEN} aufSchliessen={() => { zu = true; }} />);
    fireEvent.click(within(screen.getByText("Funkrufname").closest(".ableitungsfeld") as HTMLElement).getByRole("button", { name: "Überschreiben …" }));
    expect((screen.getByLabelText("Funkrufname") as HTMLInputElement).value).toBe("Heros Cloppenburg 28/51");
    uebernimm();
    await waitFor(() => expect(zu).toBe(true));
    expect(bedient()).toEqual([]);
    cleanup();
    oeffne();
    fireEvent.click(within(screen.getByText("Funkrufname").closest(".ableitungsfeld") as HTMLElement).getByRole("button", { name: "Überschreiben …" }));
    fireEvent.change(screen.getByLabelText("Funkrufname"), { target: { value: "Heros Cloppenburg 28/10" } });
    uebernimm();
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E2", feld: "funkrufnameOverride" }, vorher: null, neu: "Heros Cloppenburg 28/10", vorwertPruefen: true },
      ]);
    });
  });

  it("nimmt einen gesetzten Override mit „Ableitung verwenden“ zurück (leer = wieder Ableitung)", async () => {
    oeffne();
    fireEvent.click(within(screen.getByText("Erreichbarkeit").closest(".ableitungsfeld") as HTMLElement).getByRole("button", { name: "Ableitung verwenden" }));
    expect(screen.getByRole("status", { name: "Erreichbarkeit" }).textContent).toBe("wird wieder aus Führungskraft und Kontakten abgeleitet");
    uebernimm();
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E2", feld: "erreichbarkeitOverride" }, vorher: "Funk Kanal 31", neu: null, vorwertPruefen: true },
      ]);
    });
  });

  it("zeigt darunter nur die Funkzeilen des Tagebuchs der Einheit", async () => {
    attrappe.antwortet("tagebuchAnfordern", {
      lageZeiger: 7,
      von: 0,
      gesamtzahl: 3,
      zeilen: [
        zeile("EinheitRufgruppeGesetzt", "FGr WP: Rufgruppe gesetzt: THW_OL_BR → THW_OL_EA2"),
        zeile("EinheitStammdatenGeaendert", "FGr WP: Stammdaten geändert (Bemerkung): (leer) → x", "bemerkung"),
        zeile("EinheitStammdatenGeaendert", "FGr WP: Stammdaten geändert (Funkhinweis): (leer) → y", "funkHinweis"),
      ],
    });
    oeffne();
    const auszug = await screen.findByRole("region", { name: "Tagebuch zu Funk" });
    await waitFor(() => expect(within(auszug).getAllByRole("listitem")).toHaveLength(2));
    expect(auszug.textContent).toContain("Rufgruppe gesetzt: THW_OL_BR → THW_OL_EA2");
    expect(auszug.textContent).not.toContain("Bemerkung");
    expect(attrappe.letzterRuf("tagebuchAnfordern")).toMatchObject({ einheitId: "E2" });
  });

  it("sperrt im beendeten Einsatz Felder und Übernehmen und hält keine Sperre", () => {
    oeffne(E2, true);
    // Gesperrt über das umgebende Feldset: `:disabled` und nicht die eigene Eigenschaft.
    expect(screen.getByLabelText(/Funkhinweis/).matches(":disabled")).toBe(true);
    expect((screen.getByRole("button", { name: "Übernehmen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(attrappe.rufeDerArt("sperre")).toEqual([]);
  });
});

describe("Die Wege in die Maske", () => {
  it("öffnet sie aus dem Blatt „Funkplan“ mit Doppelklick auf den Namen oder ✎", async () => {
    render(<Funkplan />);
    const name = await screen.findByRole("rowheader", { name: /FGr WP OV Cloppenburg/ });
    fireEvent.doubleClick(name);
    expect(screen.getByRole("form", { name: "„FGr WP OV Cloppenburg“ — Funk und Erreichbarkeit" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    fireEvent.click(screen.getByRole("button", { name: "Funk und Erreichbarkeit von Abschnittsleitung EA 1 Deich Nord bearbeiten" }));
    expect(screen.getByRole("form", { name: "„Abschnittsleitung EA 1 Deich Nord“ — Funk und Erreichbarkeit" })).toBeDefined();
  });

  it("warnt im Blatt bei fremder Sperre der Einheit und öffnet erst beim zweiten Versuch", async () => {
    const peer = { clientId: "c2", anzeigename: "Lage 2", rechnername: "r2", veraltet: false, bearbeitet: ["E2"] };
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, peers: [peer] } as never });
    render(<Funkplan />);
    const name = await screen.findByRole("rowheader", { name: /FGr WP OV Cloppenburg/ });
    fireEvent.doubleClick(name);
    expect(screen.queryByRole("form", { name: /Funk und Erreichbarkeit/ })).toBeNull();
    expect(useLaden.getState().hinweise.at(-1)?.text).toMatch(/wird von Lage 2 bearbeitet/);
    fireEvent.doubleClick(name);
    expect(screen.getByRole("form", { name: /Funk und Erreichbarkeit/ })).toBeDefined();
  });

  it("öffnet sie aus der Lage für die markierte Einheit und holt dazu den Funkplan", async () => {
    const markiert = { einheitId: "E4", anzeige: "FGr N 2 OV Cloppenburg", zellen: {} } as unknown as Tabellenzeile;
    render(<Einheitenmasken maske="funk" gewaehlte={[markiert]} abschnittId={undefined} aufSchliessen={() => undefined} />);
    expect(await screen.findByRole("form", { name: "„FGr N 2 OV Cloppenburg“ — Funk und Erreichbarkeit" })).toBeDefined();
    expect((screen.getByLabelText(/Hauptrufgruppe/) as HTMLSelectElement).value).toBe("R3");
  });

  it("sagt in der Lage, wenn die Einheit nicht im Funkplan steht", async () => {
    const markiert = { einheitId: "E9", anzeige: "weg", zellen: {} } as unknown as Tabellenzeile;
    render(<Einheitenmasken maske="funk" gewaehlte={[markiert]} abschnittId={undefined} aufSchliessen={() => undefined} />);
    expect(await screen.findByText("Die Einheit steht nicht im Funkplan (entfernt oder beendet).")).toBeDefined();
  });
});
