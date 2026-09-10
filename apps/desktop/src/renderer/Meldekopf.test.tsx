/**
 * Komponententests zum Meldekopf-Modus (M6.4).
 *
 * Der Kern der Aussage ist ein Weglassen: Ein Meldekopf sieht Scanner,
 * Eingangskorb und Bündeldatei — **kein** Lagebild. Das ist ein Zuschnitt der
 * Oberfläche und kein Rechtesystem; geprüft wird deshalb, was das Fenster
 * zeigt, und nicht, was es verbietet.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Arbeitsplatz } from "./Arbeitsplatz.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

let attrappe: Attrappe;

/** Ein vollständiger Baumknoten — die Baumansicht liest jedes Feld. */
const KNOTEN = {
  id: "BR1",
  name: "Bereitstellungsraum Hafen",
  typ: "BEREITSTELLUNGSRAUM",
  reihenfolge: 1,
  tiefe: 0,
  eigeneStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  summenStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  einheiten: 0,
  einheitenSumme: 0,
  zaehlt: true,
  systemAbschnitt: false,
  kinder: [],
} as never;

/** Ein vollständiges Lagebild — die Statuszeile liest jedes Feld. */
const LAGEBILD = {
  einsatzId: "2026-09-10_uebung_ab12cd",
  einsatzName: "Übung Weser",
  einsatzArt: "UEBUNG",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T08:00:00.000Z",
  letzterShareKontakt: "2026-09-10T08:00:00.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 0,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 1,
} as const;

function grundzustand(betriebsart: "fuehrungsstelle" | "meldekopf"): void {
  // `starte()` liest die Einstellungen nach — die Attrappe muss dieselbe
  // Betriebsart melden, sonst überschreibt sie den gesetzten Zustand.
  attrappe.antwortet("einstellungenLesen", {
    sharePfad: "/share",
    anzeigename: "Meldekopf BR1",
    betriebsart,
  });
  useLaden.setState({
    akteId: "akte-1",
    einstellungen: { sharePfad: "/share", anzeigename: "Meldekopf BR1", betriebsart },
    lagebild: LAGEBILD,
    umgebung: {
      plattform: "linux",
      electron: "43.0.0",
      programmversion: "0.0.0-test",
      rechnername: "meldekopf-1",
      clientId: "aabbccdd-0000-0000-0000-000000000001",
    },
    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    eingangskorb: undefined,
    eingangsfilter: {},
    fehler: undefined,
    hinweise: [],
  });
}

beforeEach(() => {
  attrappe = baueAttrappe();
  // `Arbeitsplatz` fährt beim Rendern `starte()`. Ohne diese drei Antworten
  // trüge der Store `null` statt der Umgebung — die Attrappe antwortet auf
  // Unbekanntes mit `null`, und das ist richtig so.
  attrappe.antwortet("umgebung", {
    plattform: "linux",
    electron: "43.0.0",
    programmversion: "0.0.0-test",
    rechnername: "meldekopf-1",
    clientId: "aabbccdd-0000-0000-0000-000000000001",
  });
  attrappe.antwortet("einstellungenLesen", {
    sharePfad: "/share",
    anzeigename: "Meldekopf BR1",
    betriebsart: "meldekopf",
  });
  attrappe.antwortet("einsaetzeAuflisten", []);
  attrappe.antwortet("baumAnfordern", { lageZeiger: 1, baum: [KNOTEN] });
  attrappe.antwortet("eingangskorbAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    von: 0,
    gesamtzahl: 0,
    jeZustand: {},
    offen: 0,
  });
  attrappe.antwortet("tagebuchAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    von: 0,
    gesamtzahl: 0,
  });
});

describe("Der Meldekopf-Modus", () => {
  it("zeigt Eingangskorb und Scannerknopf statt des Lagebilds", async () => {
    grundzustand("meldekopf");
    render(<Arbeitsplatz />);

    await waitFor(() => {
      expect(screen.getByLabelText("Meldekopf")).toBeDefined();
    });
    expect(screen.getByText("Bogen scannen")).toBeDefined();
    expect(screen.getByLabelText("Eingangskorb")).toBeDefined();
    // Was die Führungsstelle entscheidet, steht hier nicht.
    expect(screen.queryByLabelText("Abschnittsbaum")).toBeNull();
    expect(screen.queryByLabelText("Einheitentabelle")).toBeNull();
    expect(screen.queryByLabelText("Ausgaben")).toBeNull();
  });

  it("zeigt in der Führungsstelle weiterhin das Lagebild", async () => {
    grundzustand("fuehrungsstelle");
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 1,
      zeilen: [],
      von: 0,
      gesamtzahl: 0,
      spalten: [],
    });
    render(<Arbeitsplatz />);

    await waitFor(() => {
      expect(screen.getByLabelText("Ausgaben")).toBeDefined();
    });
    expect(screen.queryByLabelText("Meldekopf")).toBeNull();
  });

  it("holt den Abschnittsbaum für die Zuordnung, ohne ihn zu zeigen", async () => {
    grundzustand("meldekopf");
    render(<Arbeitsplatz />);

    // Die Zuordnung zu einem Abschnitt ist die eine Entscheidung, die ein
    // Meldekopf über die Lage trifft — dafür braucht er die Namen.
    await waitFor(() => {
      expect(attrappe.rufeDerArt("baumAnfordern").length).toBeGreaterThan(0);
    });
    // Der Name steht in den Auswahlfeldern — zweimal, weil auch das Bündel
    // ein Ziel braucht —, aber nirgends als Baum.
    await waitFor(() => {
      expect(screen.getAllByText("Bereitstellungsraum Hafen").length).toBeGreaterThan(0);
    });
    expect(screen.queryByLabelText("Abschnittsbaum")).toBeNull();
  });

  it("führt dasselbe Tagebuch — es ist eine Projektion desselben Stroms", async () => {
    grundzustand("meldekopf");
    render(<Arbeitsplatz />);
    // §5.9.1: Das Tagebuch ist eine Projektion des Ereignisstroms, und beide
    // Stellen schreiben in denselben. Ein eigenes wäre eine zweite Wahrheit.
    await waitFor(() => {
      expect(attrappe.rufeDerArt("tagebuchAnfordern").length).toBeGreaterThan(0);
    });
  });
});
