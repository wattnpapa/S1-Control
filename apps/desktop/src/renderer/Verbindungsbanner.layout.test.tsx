/**
 * Layout des Verbindungsbanners: Es meldet seine Höhe an die Seite, damit ein
 * Dialog unter ihm beginnt (das Stylesheet hält es oben und über Dialogen).
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { setzeBruecke, type Bruecke } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { useVerbindung } from "./verbindung.js";
import { Verbindungsbanner } from "./Verbindungsbanner.js";

beforeEach(() => {
  const bruecke: Bruecke = {
    plattform: "web",
    electron: "keine",
    async ruf() {
      return { ok: true, wert: null };
    },
    aufMitteilung: () => () => undefined,
  };
  setzeBruecke(bruecke);
  useVerbindung.getState().zuruecksetzen();
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty("--bannerhoehe");
});

describe("Verbindungsbanner-Layout", () => {
  it("meldet die Höhe als --bannerhoehe und nimmt sie mit dem Banner zurück", () => {
    const { unmount } = render(<Verbindungsbanner />);
    expect(document.documentElement.style.getPropertyValue("--bannerhoehe")).toBe("");
    act(() => {
      useVerbindung.getState().meldeKontakt(Date.now() - 3000);
      useVerbindung.getState().meldeAusfall(Date.now());
    });
    expect(document.documentElement.style.getPropertyValue("--bannerhoehe")).toMatch(/^\d+px$/);
    unmount();
    expect(document.documentElement.style.getPropertyValue("--bannerhoehe")).toBe("");
  });
});
