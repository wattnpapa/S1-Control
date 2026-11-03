/**
 * Die Zustandsmarke im Kopfband (Entwurf „Entlastung", 6d): drei Zustände,
 * jeder mit Zeichen und Wort, die Ausführung im Tooltip.
 */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Lagebild } from "../kontrakt/index.js";
import { peer } from "../kontrakt/pruefhilfen.js";
import { useVerbindung } from "./verbindung.js";
import { Zustandsmarke, abschlussText, markenbild } from "./Zustandsmarke.js";

afterEach(cleanup);
beforeEach(() => {
  useVerbindung.getState().zuruecksetzen();
});

const JETZT = Date.parse("2026-09-10T08:00:30.000Z");

const GRUND = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "2026-09-10T08:00:22.000Z",
  letzterShareKontakt: "2026-09-10T08:00:29.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 1,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 0,
} as unknown as Lagebild;

const VERBUNDEN = { zustand: "verbunden", letzterKontakt: JETZT } as const;

describe("markenbild", () => {
  it("sagt „✓ aktuell“ und führt Stand, Share und Arbeitsplätze aus", () => {
    const bild = markenbild({ ...GRUND, peers: [peer({ clientId: "b", veraltet: false })] }, VERBUNDEN, JETZT);
    expect(bild).toEqual({
      ton: "ok",
      text: "✓ aktuell",
      erklaerung: "Stand vor 8 s · Share erreichbar · 1 weiterer Arbeitsplatz",
    });
    expect(markenbild(GRUND, { zustand: "unbekannt" }, JETZT)?.erklaerung).toMatch(/allein am Einsatz$/u);
  });

  it("sagt „⚠ Share nicht erreichbar“ in Bernstein mit Grund und offenen Bytes", () => {
    const bild = markenbild(
      { ...GRUND, shareErreichbar: false, shareMeldung: "ENOENT", unuebertrageneBytes: 14 * 1024 },
      VERBUNDEN,
      JETZT,
    );
    expect(bild?.ton).toBe("warnung");
    expect(bild?.text).toBe("⚠ Share nicht erreichbar");
    expect(bild?.erklaerung).toBe(
      "Stand vor 8 s · Share nicht erreichbar — ENOENT · 14.0 kB noch nicht übertragen · Sie können weiterarbeiten",
    );
  });

  it("sagt „Verbindung unterbrochen“ — erst in Bernstein, ab der roten Stufe mit ✖ in Rot", () => {
    const gelb = markenbild(GRUND, { zustand: "unterbrochen", stufe: "gelb", seitMs: 14_000 }, JETZT);
    expect(gelb?.ton).toBe("warnung");
    expect(gelb?.text).toBe("⚠ Verbindung unterbrochen");
    expect(gelb?.erklaerung).toBe(
      "Keine Verbindung zum Dienst seit 14 s — Stand vor 8 s (veraltet), Share und Arbeitsplätze unbekannt",
    );
    const rot = markenbild(GRUND, { zustand: "unterbrochen", stufe: "rot", seitMs: 190_000 }, JETZT);
    expect(rot?.ton).toBe("fehler");
    expect(rot?.text).toBe("✖ Verbindung unterbrochen");
  });

  it("schweigt ohne Einsatz, solange die Verbindung steht, und meldet sonst nur die Unterbrechung", () => {
    expect(markenbild(undefined, VERBUNDEN, JETZT)).toBeUndefined();
    expect(markenbild(undefined, { zustand: "unterbrochen", stufe: "rot", seitMs: 65_000 }, JETZT)?.erklaerung).toBe(
      "Keine Verbindung zum Dienst seit 1 min",
    );
  });
});

describe("abschlussText", () => {
  it("nennt BEENDET und ARCHIVIERT mit ihrer Folge, im laufenden Einsatz nichts", () => {
    expect(abschlussText({ ...GRUND, einsatzStatus: "BEENDET" })).toBe("BEENDET — Eingaben gesperrt");
    expect(abschlussText({ ...GRUND, einsatzStatus: "ARCHIVIERT" })).toBe("ARCHIVIERT — nur lesen");
    expect(abschlussText({ ...GRUND, einsatzStatus: "AKTIV" })).toBe("");
    expect(abschlussText(undefined)).toBe("");
  });
});

describe("Zustandsmarke", () => {
  it("zeigt die drei Zustände mit Zeichen, Wort und Klasse", () => {
    const { rerender } = render(<Zustandsmarke lagebild={GRUND} jetzt={JETZT} />);
    const marke = screen.getByText("✓ aktuell");
    expect(marke.className).toBe("zustandsmarke ok");
    expect(marke.getAttribute("aria-description")).toBe(marke.getAttribute("title"));

    rerender(<Zustandsmarke lagebild={{ ...GRUND, shareErreichbar: false }} jetzt={JETZT} />);
    expect(screen.getByText("⚠ Share nicht erreichbar").className).toBe("zustandsmarke warnung");

    act(() => {
      useVerbindung.getState().meldeKontakt(Date.now() - 120_000);
      useVerbindung.getState().meldeAusfall(Date.now());
    });
    rerender(<Zustandsmarke lagebild={GRUND} jetzt={JETZT} />);
    const getrennt = screen.getByText("✖ Verbindung unterbrochen");
    expect(getrennt.className).toBe("zustandsmarke fehler");
    expect(getrennt.getAttribute("title")).toMatch(/^Keine Verbindung zum Dienst seit \d+ min — Stand/u);
  });
});
