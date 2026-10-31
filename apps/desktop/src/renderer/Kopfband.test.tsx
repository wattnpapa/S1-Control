/**
 * Das Kopfband (Entwurf „Oberfläche", Option 2a).
 *
 * Geprüft wird, was oben am Fenster steht und was der Themenschalter meldet —
 * nicht, aus welchen Elementen das Band gebaut ist.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Kopfband, STAERKE_REGEL, staerkeNebenText } from "./Kopfband.js";
import type { Lagebild } from "../kontrakt/index.js";

afterEach(cleanup);

const JETZT = new Date(2026, 8, 10, 14, 43).getTime();

const PEER = {
  clientId: "b",
  anzeigename: "B",
  rechnername: "rb",
  veraltet: false,
  wanduhr: "",
  programmversion: "2.0.0",
  segment: 1,
  offset: 0,
  gelesenerOffset: 0,
  uhrAbweichungMs: 0,
  quarantaene: 0,
};

const LAGEBILD: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: new Date(JETZT - 6000).toISOString(),
  letzterShareKontakt: new Date(JETZT - 3000).toISOString(),
  shareErreichbar: true,
  peers: [
    { ...PEER, clientId: "b", anzeigename: "B", rechnername: "rb" },
    { ...PEER, clientId: "c", anzeigename: "C", rechnername: "rc" },
  ],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 6,
  einheiten: 42,
  gesamtstaerke: { fuehrer: 24, unterfuehrer: 61, mannschaft: 183 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 0,
};

describe("Kopfband", () => {
  it("zeigt Stärke und taktische Zeit in der vereinbarten Schreibweise", () => {
    render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText("24/61/183 // 268")).toBeDefined();
    expect(screen.getByText("101443SEP26")).toBeDefined();
  });

  it("erklärt die Zählregel und zeigt Köpfe im Eingang/angefordert neben der Kopfzahl", () => {
    const { container } = render(
      <Kopfband
        lagebild={{ ...LAGEBILD, staerkeErwartet: 6, staerkeBeendet: 2 }}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.getByText("Ist-Stärke")).toBeDefined();
    expect(screen.getByText("+6 im Eingang/angefordert · 2 beendet")).toBeDefined();
    expect(container.querySelector(".kennzahl")?.getAttribute("title")).toBe(STAERKE_REGEL);
  });

  it("zeigt ohne Köpfe außerhalb der Zählung keine Nebenzahl", () => {
    expect(staerkeNebenText(LAGEBILD)).toBe("");
    expect(staerkeNebenText({ ...LAGEBILD, staerkeBeendet: 3 })).toBe("3 beendet");
  });

  it("nennt in einer Zeile Einsatz, Stand, Share und die anderen Arbeitsplätze", () => {
    render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(
      screen.getByText(
        /Hochwasser Oldenburg · Stand vor 6 s · Share erreichbar — 2 weitere Arbeitsplätze/,
      ),
    ).toBeDefined();
  });

  it("nennt den FüSt-Namen aus den Stammdaten neben dem Einsatz", () => {
    const stammdaten = {
      name: "Hochwasser Oldenburg",
      art: "EINSATZ",
      fuestName: "FüSt Weser-Ems",
      beginn: "2026-09-10T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
    };
    render(
      <Kopfband
        lagebild={{ ...LAGEBILD, stammdaten }}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.getByText(/Hochwasser Oldenburg · FüSt Weser-Ems · Stand vor 6 s/)).toBeDefined();
  });

  it("meldet den unerreichbaren Share auch oben, nicht nur unten", () => {
    render(
      <Kopfband
        lagebild={{ ...LAGEBILD, shareErreichbar: false }}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.getByText(/Share nicht erreichbar/)).toBeDefined();
  });

  it("sagt ohne offenen Einsatz, dass keiner offen ist", () => {
    render(
      <Kopfband lagebild={undefined} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText("Kein Einsatz geöffnet")).toBeDefined();
  });

  it("zeigt das gewählte Erscheinungsbild als gedrückt und meldet den Wechsel", async () => {
    const waehleTheme = vi.fn();
    render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="nacht" waehleTheme={waehleTheme} aufHilfe={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Nacht", pressed: true })).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: "Feld" }));
    expect(waehleTheme).toHaveBeenCalledWith("feld");
  });

  it("zeigt „Abmelden“ nur hinter der Anmeldung, als Formular POST abmeldung", () => {
    const { rerender } = render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.queryByRole("button", { name: "Abmelden" })).toBeNull();

    rerender(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        angemeldet
      />,
    );
    const knopf = screen.getByRole("button", { name: "Abmelden" });
    expect(knopf.getAttribute("type")).toBe("submit");
    const formular = knopf.closest("form");
    expect(formular?.getAttribute("method")).toBe("post");
    // Relativ, damit es auch hinter einem Unterpfad stimmt.
    expect(formular?.getAttribute("action")).toBe("abmeldung");
  });

  it("zeigt den Weg zurück nur, wenn ein Einsatz offen ist", async () => {
    const zurueck = vi.fn();
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        zurueckZurAuswahl={zurueck}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Einsatzauswahl/ }));
    expect(zurueck).toHaveBeenCalledOnce();

    cleanup();
    render(
      <Kopfband lagebild={undefined} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.queryByRole("button", { name: /Einsatzauswahl/ })).toBeNull();
  });

  it("zeigt die Reiter erst mit offenem Einsatz und meldet die Wahl", async () => {
    const waehleBlatt = vi.fn();
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        blatt="lage"
        waehleBlatt={waehleBlatt}
        offeneMeldungen={7}
      />,
    );
    expect(screen.getByRole("tab", { name: "Lage", selected: true })).toBeDefined();
    // Der Zähler steht am Reiter, weil dort die Entscheidung fällt, ob man
    // hinsieht — nicht erst im Blatt.
    expect(screen.getByRole("tab", { name: "Eingangskorb 7 offen" })).toBeDefined();

    await userEvent.click(screen.getByRole("tab", { name: /Eingangskorb/ }));
    expect(waehleBlatt).toHaveBeenCalledWith("eingang");
  });

  it("lässt die Reiterzeile weg, solange kein Einsatz offen ist", () => {
    render(
      <Kopfband
        lagebild={undefined}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("nennt keinen Zähler, wenn nichts offen ist", () => {
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        blatt="kosten"
        waehleBlatt={() => undefined}
      />,
    );
    expect(screen.getByRole("tab", { name: "Eingangskorb" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Kosten", selected: true })).toBeDefined();
  });

  it("sagt in der Zustandszeile, dass ein beendeter oder archivierter Einsatz gesperrt ist", () => {
    const { rerender } = render(
      <Kopfband lagebild={{ ...LAGEBILD, einsatzStatus: "BEENDET" }} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText(/BEENDET — Eingaben gesperrt/u)).toBeDefined();
    rerender(
      <Kopfband lagebild={{ ...LAGEBILD, einsatzStatus: "ARCHIVIERT" }} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText(/ARCHIVIERT — nur lesen/u)).toBeDefined();
    rerender(
      <Kopfband lagebild={{ ...LAGEBILD, einsatzStatus: "AKTIV" }} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.queryByText(/gesperrt|nur lesen/u)).toBeNull();
  });
});
