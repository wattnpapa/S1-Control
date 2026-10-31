/**
 * Der Abschluss des Einsatzes im Blatt „Ausgaben“.
 *
 * Geprüft wird, was die Ansicht je Zustand anbietet, welche Entwürfe und Rufe
 * ihre Masken abschicken und dass eine Abweisung lesbar ankommt. Ob der
 * Worker danach wirklich sperrt, prüfen die Szenarien in
 * `worker/szenarien-abschluss.test.ts`.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { zeitpunktText } from "@s1/domaene";

import { CODE_EINSATZ_ABGESCHLOSSEN, type Lagebild } from "../kontrakt/index.js";
import { Einsatzabschluss, zustandstext } from "./Einsatzabschluss.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const ENDE = "2026-10-30T16:00:00.000Z";
const BEENDEN = "Einsatz „Hochwasser Weser“ beenden";

const LAGEBILD: Lagebild = {
  einsatzId: "2026-10-30_hochwasser_ab12cd",
  einsatzName: "Hochwasser Weser",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "",
  letzterShareKontakt: "",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 0,
  einheiten: 0,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 0,
  einsatzStatus: "AKTIV",
  einsatzEnde: "",
};

let attrappe: Attrappe;

function setze(teil: Partial<Lagebild>, dateienZeigen = true): void {
  useLaden.setState({
    akteId: "akte-1",
    lagebild: { ...LAGEBILD, ...teil },
    fehler: undefined,
    hinweise: [],
    umgebung: { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c", dateienZeigen },
  });
}

function knopfnamen(): string[] {
  return screen.getAllByRole("button").map((knopf) => knopf.textContent ?? "");
}

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "e1" });
});

describe("zustandstext", () => {
  it("nennt die drei Zustände in Worten", () => {
    expect(zustandstext({ einsatzStatus: "AKTIV", einsatzEnde: "" })).toBe("Laufend");
    expect(zustandstext({ einsatzStatus: "BEENDET", einsatzEnde: ENDE })).toBe(`Beendet seit ${zeitpunktText(ENDE)}`);
    expect(zustandstext({ einsatzStatus: "ARCHIVIERT", einsatzEnde: ENDE })).toBe("Archiviert — nur lesen");
    // Ein Worker älterer Fassung schickt keinen Zustand: Dann gilt „laufend“.
    expect(zustandstext({})).toBe("Laufend");
  });
});

describe("Einsatz beenden", () => {
  it("bietet im laufenden Einsatz Beenden und die Akte an, aber weder Wiedereröffnen noch Archivieren", () => {
    setze({});
    render(<Einsatzabschluss />);
    expect(screen.getByText("Laufend")).toBeDefined();
    expect(knopfnamen()).toEqual(["Einsatz beenden", "Einsatzakte erzeugen"]);
  });

  it("schreibt das Ende mit vorbelegtem Zeitpunkt, vorher-Wert und Bemerkung", async () => {
    setze({});
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz beenden" }));
    const maske = screen.getByRole("form", { name: BEENDEN });
    const zeit = within(maske).getByLabelText(/Einsatzende/u) as HTMLInputElement;
    expect(zeit.value).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/u);
    await userEvent.clear(zeit);
    await userEvent.type(zeit, "30.10.2026 17:00");
    await userEvent.type(within(maske).getByLabelText("Bemerkung"), "Lage bereinigt");
    await userEvent.click(within(maske).getByRole("button", { name: "Einsatz beenden" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf).toEqual({
        typ: "EinsatzBeendet",
        nutzlast: { einsatzId: LAGEBILD.einsatzId },
        vorher: null,
        neu: new Date(2026, 9, 30, 17, 0).toISOString(),
        grund: "Lage bereinigt",
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole("form", { name: BEENDEN })).toBeNull();
    });
  });

  it("sperrt die Bestätigung, solange die Zeitangabe nicht lesbar ist", async () => {
    setze({});
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz beenden" }));
    const maske = screen.getByRole("form", { name: BEENDEN });
    const zeit = within(maske).getByLabelText(/Einsatzende/u);
    await userEvent.clear(zeit);
    await userEvent.type(zeit, "irgendwann");
    expect((within(maske).getByRole("button", { name: "Einsatz beenden" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(maske).getByText("Die Zeitangabe ist nicht lesbar.")).toBeDefined();
  });

  it("lässt die Maske offen und nennt die Meldung, wenn der Worker abweist", async () => {
    attrappe.antwortet("bedienen", { art: "abgewiesen", meldung: "Das Einsatzende ist keine lesbare Zeitangabe.", code: "SCHEMA", dauerhafterHinweis: false });
    setze({});
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz beenden" }));
    const maske = screen.getByRole("form", { name: BEENDEN });
    await userEvent.click(within(maske).getByRole("button", { name: "Einsatz beenden" }));
    expect(await within(maske).findByText("Das Einsatzende ist keine lesbare Zeitangabe.")).toBeDefined();
  });
});

describe("Rückfrage beim Beenden", () => {
  const PEER = { clientId: "p", anzeigename: "A2", rechnername: "r2", veraltet: false, wanduhr: "" };
  const lagebildMitPeers = (veraltet: boolean[]): Partial<Lagebild> => ({
    peers: veraltet.map((v, i) => ({ ...PEER, clientId: `p${String(i)}`, veraltet: v })) as unknown as Lagebild["peers"],
    einheiten: 7,
    offeneAnforderungen: 3,
  });

  it("nennt Einsatzname, Wirkung auf die anderen Arbeitsplätze und die offenen Posten", async () => {
    setze(lagebildMitPeers([false, false, true]));
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz beenden" }));
    const maske = screen.getByRole("form", { name: BEENDEN });
    expect(within(maske).getByText(/sperrt den Einsatz für Sie und 2 weitere Arbeitsplätze/u)).toBeDefined();
    expect(within(maske).getByText(/Schreiben ist nicht mehr\s+möglich/u)).toBeDefined();
    expect(within(maske).getByText(/Wiedereröffnen ist möglich/u)).toBeDefined();
    expect(within(maske).getByText(/3 offene Anforderungen; 7 Einheiten nicht abgeschlossen/u)).toBeDefined();
  });

  it("löst durch Enter im vorbelegten Zeitfeld nichts aus", async () => {
    setze({});
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz beenden" }));
    const maske = screen.getByRole("form", { name: BEENDEN });
    await userEvent.type(within(maske).getByLabelText(/Einsatzende/u), "{Enter}");
    await userEvent.type(within(maske).getByLabelText("Bemerkung"), "{Enter}");
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    expect(screen.getByRole("form", { name: BEENDEN })).toBeDefined();
  });
});

describe("Ein beendeter Einsatz", () => {
  it("zeigt das Ende und bietet Wiedereröffnen, Akte und Archivieren an", () => {
    setze({ einsatzStatus: "BEENDET", einsatzEnde: ENDE });
    render(<Einsatzabschluss />);
    expect(screen.getByText(`Beendet seit ${zeitpunktText(ENDE)}`)).toBeDefined();
    expect(knopfnamen()).toEqual(["Einsatz wiedereröffnen", "Einsatzakte erzeugen", "Archivieren"]);
  });

  it("öffnet wieder mit dem gesehenen Ende als vorher-Wert", async () => {
    setze({ einsatzStatus: "BEENDET", einsatzEnde: ENDE });
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz wiedereröffnen" }));
    const maske = screen.getByRole("form", { name: "Einsatz „Hochwasser Weser“ wiedereröffnen" });
    await userEvent.click(within(maske).getByRole("button", { name: "Wiedereröffnen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf).toEqual({
        typ: "EinsatzWiedereroeffnet",
        nutzlast: { einsatzId: LAGEBILD.einsatzId },
        vorher: ENDE,
        neu: null,
      });
    });
  });

  it("fragt vor dem Wiedereröffnen nach und schreibt bei Abbrechen nichts", async () => {
    setze({ einsatzStatus: "BEENDET", einsatzEnde: ENDE, peers: [{ clientId: "p", anzeigename: "A2", rechnername: "r", veraltet: false, wanduhr: "" }] as unknown as Lagebild["peers"] });
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatz wiedereröffnen" }));
    const maske = screen.getByRole("form", { name: "Einsatz „Hochwasser Weser“ wiedereröffnen" });
    expect(within(maske).getByText(/Sie und 1 weiteren Arbeitsplatz können wieder schreiben/u)).toBeDefined();
    await userEvent.click(within(maske).getByRole("button", { name: "Abbrechen" }));
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("setzt Archivieren abgesetzt vom Wiedereröffnen und nennt den Einsatz in der Maske", async () => {
    setze({ einsatzStatus: "BEENDET", einsatzEnde: ENDE });
    render(<Einsatzabschluss />);
    const gruppe = screen.getByRole("group", { name: "Unumkehrbar" });
    expect(within(gruppe).getByRole("button", { name: "Archivieren" })).toBeDefined();
    expect(within(gruppe).queryByRole("button", { name: "Einsatz wiedereröffnen" })).toBeNull();
    expect(within(gruppe).getByText(/„Hochwasser Weser“/u)).toBeDefined();
  });

  it("archiviert erst nach ausdrücklicher Bestätigung des Hinweises", async () => {
    attrappe.antwortet("einsatzArchivieren", { art: "geschrieben", ereignisId: "e2" });
    setze({ einsatzStatus: "BEENDET", einsatzEnde: ENDE });
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Archivieren" }));
    const maske = screen.getByRole("form", { name: "Einsatz „Hochwasser Weser“ archivieren" });
    expect(within(maske).getByText("nichts mehr geschrieben werden")).toBeDefined();
    const bestaetigen = within(maske).getByRole("button", { name: "Archivieren" }) as HTMLButtonElement;
    expect(bestaetigen.disabled).toBe(true);
    await userEvent.click(within(maske).getByRole("checkbox"));
    await userEvent.click(bestaetigen);
    await waitFor(() => {
      expect(attrappe.letzterRuf("einsatzArchivieren")).toMatchObject({ akteId: "akte-1" });
    });
    expect(Number.isNaN(Date.parse(attrappe.letzterRuf("einsatzArchivieren")?.zeitpunkt ?? ""))).toBe(false);
  });
});

describe("Ein archivierter Einsatz", () => {
  it("bietet nur noch die Einsatzakte an", () => {
    setze({ einsatzStatus: "ARCHIVIERT", einsatzEnde: ENDE });
    render(<Einsatzabschluss />);
    expect(screen.getByText("Archiviert — nur lesen")).toBeDefined();
    expect(knopfnamen()).toEqual(["Einsatzakte erzeugen"]);
  });
});

describe("Einsatzakte erzeugen", () => {
  it("nennt den Pfad und bietet Öffnen und Ordner zeigen an — Drucken nicht, es ist ein ZIP", async () => {
    attrappe.antwortet("akteErzeugen", { pfad: "/share/einsaetze/e/e_akte_2026-10-30_1700.zip", bytes: 4096, ereignisse: 12, befunde: 0 });
    setze({ einsatzStatus: "BEENDET", einsatzEnde: ENDE });
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatzakte erzeugen" }));
    expect(await screen.findByText(/e_akte_2026-10-30_1700\.zip \(4096 Bytes, 12 Ereignisse\)/u)).toBeDefined();
    expect(screen.getByRole("button", { name: "Öffnen" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ordner zeigen" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Drucken" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Ordner zeigen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("ausgabeZeigen")).toMatchObject({
        pfad: "/share/einsaetze/e/e_akte_2026-10-30_1700.zip",
        wie: "ordner",
      });
    });
  });

  it("nennt offene Befunde dazu", async () => {
    attrappe.antwortet("akteErzeugen", { pfad: "/share/a.zip", bytes: 10, ereignisse: 3, befunde: 2 });
    setze({});
    render(<Einsatzabschluss />);
    await userEvent.click(screen.getByRole("button", { name: "Einsatzakte erzeugen" }));
    expect(await screen.findByText(/2 Befunde — „s1 akte pruefe“ zeigt sie/u)).toBeDefined();
  });
});

describe("Schreiben nach dem Abschluss", () => {
  it("macht aus der Abweisung des Workers einen sichtbaren Hinweis — gleich, wer geschrieben hat", async () => {
    const meldung = "Der Einsatz ist archiviert. Es kann nichts mehr geschrieben werden.";
    attrappe.antwortet("bedienen", { art: "abgewiesen", meldung, code: CODE_EINSATZ_ABGESCHLOSSEN, dauerhafterHinweis: false });
    setze({ einsatzStatus: "ARCHIVIERT" });
    const ergebnis = await useLaden.getState().bediene({ typ: "StatusGesetzt", nutzlast: { einheitId: "U1" }, vorher: null, neu: "RUHE" });
    expect(ergebnis?.art).toBe("abgewiesen");
    expect(useLaden.getState().hinweise.map((h) => h.text)).toContain(meldung);
    // Kein Fehlerbild über dem Fenster: Die Abweisung ist ein regulärer Ausgang.
    expect(useLaden.getState().fehler).toBeUndefined();
  });

  it("lässt andere Abweisungen bei der Maske, die sie zeigt", async () => {
    attrappe.antwortet("bedienen", { art: "abgewiesen", meldung: "anders", code: "SCHEMA", dauerhafterHinweis: false });
    setze({});
    await useLaden.getState().bediene({ typ: "StatusGesetzt", nutzlast: { einheitId: "U1" }, vorher: null, neu: "RUHE" });
    expect(useLaden.getState().hinweise).toEqual([]);
  });
});
