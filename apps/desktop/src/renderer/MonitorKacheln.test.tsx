/**
 * Die Kachelbilder im Renderer: Warnkacheln tragen Zeichen und Wort, eine
 * fehlende Nachrichtenlage zeigt einen ruhigen Hinweis statt Nullen.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonitorIukLage, MonitorNachrichtenweg, MonitorOffenePunkte } from "./MonitorKacheln.js";
import { rasterspalten } from "./MonitorKacheln.js";
import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";

const E: Ansichtseigenschaften = { lagebild: BEISPIEL_LAGEBILD, jetzt: BEISPIEL_JETZT, zeit: "101443SEP26", mass: { breite: 1920, hoehe: 1080 } };

afterEach(cleanup);

describe("Kachelbilder des Monitors", () => {
  it("legt bis vier Kacheln nebeneinander, mehr in Reihen", () => {
    expect(rasterspalten(3)).toBe(3);
    expect(rasterspalten(6)).toBe(3);
    expect(rasterspalten(8)).toBe(4);
    expect(rasterspalten(9)).toBe(3);
  });

  it("zeigt bei offenen Punkten eine Warnkachel mit ⚠ und Wort", () => {
    render(<MonitorOffenePunkte {...E} lagebild={{ ...BEISPIEL_LAGEBILD, hinweise: 2 }} />);
    expect(screen.getByLabelText("Monitor Offene Punkte")).toBeDefined();
    const kachel = screen.getByLabelText("Konflikthinweise: 2");
    expect(kachel.className).toBe("kachel warn");
    expect(kachel.textContent).toContain("⚠ Konflikthinweise");
  });

  it("zeigt ohne Nachrichtenlage einen ruhigen Hinweis, mit Lage die Besetzung im Fuß", () => {
    render(<MonitorNachrichtenweg {...E} />);
    expect(screen.getByText("Noch keine Nachrichten")).toBeDefined();
    cleanup();
    const lagebild = { ...BEISPIEL_LAGEBILD, besetzteStellen: ["LDF"], nachrichten: { neuFuerStellen: 0, vorFmz: 0, vorSichter: 0, mitVorrangOffen: 0, ueberSchwelle: 0 } };
    render(<MonitorNachrichtenweg {...E} lagebild={lagebild} />);
    expect(screen.getByLabelText("vor der FmZ: 0").className).toBe("kachel leise");
    expect(screen.getByText(/LdF besetzt · Fernmelder nicht besetzt · Sichter nicht besetzt/)).toBeDefined();
  });

  it("zeigt die IuK-Lage mit erreichbarem Share", () => {
    render(<MonitorIukLage {...E} />);
    expect(screen.getByLabelText("Share erreichbar: ja")).toBeDefined();
  });
});
