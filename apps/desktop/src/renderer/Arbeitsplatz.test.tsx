/**
 * Der Arbeitsplatz als Fenster: **ein Blatt zur Zeit** (Entwurf „Oberfläche",
 * Option 2a).
 *
 * Vorher standen Lage, Ausgaben, Tagebuch und die Nebenblätter untereinander;
 * wer die Tabelle sehen wollte, scrollte an allem anderen vorbei. Geprüft wird
 * deshalb das Weglassen: Was der Reiter nicht wählt, ist nicht zu sehen — und
 * die Auswahl von Abschnitt und Einheit überlebt den Blattwechsel, weil
 * Ausgaben und Tagebuch sich auf sie beziehen.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Arbeitsplatz } from "./Arbeitsplatz.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const UMGEBUNG = {
  plattform: "linux",
  electron: "43.0.0",
  programmversion: "0.0.0-test",
  rechnername: "fuest-1",
  clientId: "aabbccdd-0000-0000-0000-000000000001",
};

const EINSTELLUNGEN = {
  sharePfad: "/share",
  anzeigename: "Führungsstelle 1",
  betriebsart: "fuehrungsstelle",
} as const;

const KNOTEN = {
  id: "EA1",
  name: "EA 1 Deich Nord",
  typ: "EINSATZORT",
  reihenfolge: 1,
  tiefe: 0,
  eigeneStaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  summenStaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  einheiten: 1,
  einheitenSumme: 1,
  zaehlt: true,
  systemAbschnitt: false,
  kinder: [],
} as never;

const LAGEBILD = {
  einsatzId: "2026-09-10_hochwasser_ab12cd",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T08:00:00.000Z",
  letzterShareKontakt: "2026-09-10T08:00:00.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 1,
  gesamtstaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 1,
} as const;

let attrappe: Attrappe;

/** Sichtbar heißt: in keinem zugeklappten Blatt. */
function sichtbar(name: string): boolean {
  const knoten = screen.queryByLabelText(name);
  return knoten !== null && knoten.closest("[hidden]") === null;
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("umgebung", UMGEBUNG);
  attrappe.antwortet("einstellungenLesen", EINSTELLUNGEN);
  attrappe.antwortet("einsaetzeAuflisten", []);
  attrappe.antwortet("baumAnfordern", { lageZeiger: 1, baum: [KNOTEN] });
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    von: 0,
    gesamtzahl: 0,
    spalten: [],
  });
  attrappe.antwortet("tagebuchAnfordern", { lageZeiger: 1, zeilen: [], von: 0, gesamtzahl: 0 });
  attrappe.antwortet("kostenAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    summe: 0,
    parameter: { stundensatz: 0, tagessatz: 0, verpflegungssatz: 0 },
  });
  useLaden.setState({
    akteId: "akte-1",
    einstellungen: EINSTELLUNGEN,
    lagebild: LAGEBILD,
    umgebung: UMGEBUNG,
    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    kosten: undefined,
    eingangskorb: undefined,
    tabellenfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

describe("Der Arbeitsplatz", () => {
  it("schlägt die Lage auf und zeigt sonst kein Blatt", async () => {
    render(<Arbeitsplatz />);

    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(sichtbar("Einheiten")).toBe(true);
    expect(sichtbar("Einsatztagebuch")).toBe(false);
    expect(screen.queryByLabelText("Ausgaben")).toBeNull();
    expect(screen.queryByLabelText("Kostenübersicht")).toBeNull();
  });

  it("wechselt mit dem Reiter das Blatt und legt die Lage darunter weg", async () => {
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });

    await userEvent.click(screen.getByRole("tab", { name: "Einsatztagebuch" }));
    await waitFor(() => {
      expect(sichtbar("Einsatztagebuch")).toBe(true);
    });
    // Die Lage bleibt eingehängt — sie hält die Auswahl —, ist aber weg.
    expect(sichtbar("Abschnitte")).toBe(false);

    await userEvent.click(screen.getByRole("tab", { name: "Lage" }));
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
  });

  it("holt ein Nebenblatt erst, wenn es aufgeschlagen wird (M3.7)", async () => {
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(attrappe.rufeDerArt("kostenAnfordern")).toHaveLength(0);

    await userEvent.click(screen.getByRole("tab", { name: "Kosten" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("kostenAnfordern").length).toBeGreaterThan(0);
    });
  });
});
