/**
 * Das Kopfband (Entwurf „Oberfläche", Option 2a).
 *
 * Geprüft wird, was oben am Fenster steht und was der Themenschalter meldet —
 * nicht, aus welchen Elementen das Band gebaut ist.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Kopfband } from "./Kopfband.js";
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
});
