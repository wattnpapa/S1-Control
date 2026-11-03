/**
 * Dauer und Stufe der Unterbrechung sowie die Zustandsmarke im Kopfband.
 */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { Kopfband } from "./Kopfband.js";
import { Verbindungsbanner } from "./Verbindungsbanner.js";
import { useVerbindung } from "./verbindung.js";
import type { Lagebild } from "../kontrakt/index.js";

beforeEach(() => {
  vi.useFakeTimers();
  useVerbindung.getState().zuruecksetzen();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const LAGE = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "",
  letzterShareKontakt: "",
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
  lageZeiger: 0,
} as unknown as Lagebild;

it("zählt „seit N s“ hoch, wird nach 60 s rot und färbt die Zustandsmarke mit", async () => {
  const jetzt = Date.now();
  act(() => {
    useVerbindung.getState().meldeKontakt(jetzt);
    useVerbindung.getState().meldeAusfall(jetzt + 1000);
  });
  render(
    <>
      <Kopfband lagebild={LAGE} jetzt={jetzt} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />
      <Verbindungsbanner />
    </>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(screen.getByRole("alert").textContent).toContain("seit 30 s");
  const marke = (): Element | null => document.querySelector(".zustandsmarke");
  expect(marke()?.textContent).toBe("⚠ Verbindung unterbrochen");
  expect(marke()?.getAttribute("title")).toContain("Keine Verbindung zum Dienst seit 30 s");
  expect(marke()?.getAttribute("title")).not.toContain("Share erreichbar");

  await act(async () => {
    await vi.advanceTimersByTimeAsync(35_000);
  });
  expect(screen.getByRole("alert").textContent).toContain("✖");
  expect(screen.getByRole("alert").textContent).toContain("seit 1 min");
  expect(marke()?.textContent).toBe("✖ Verbindung unterbrochen");
  expect(marke()?.className).toBe("zustandsmarke fehler");
});
