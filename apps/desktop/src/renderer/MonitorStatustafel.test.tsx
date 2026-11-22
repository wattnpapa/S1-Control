/**
 * „Status" (S1), „Einsatzmittel" (S3) und „Kommen und Gehen" (S1) im Renderer.
 */

import type { Statuszeile } from "@s1/domaene";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonitorKommenGehen, marke, zeilenplatz, zeitText } from "./MonitorKommenGehen.js";
import { MonitorEinsatzmittel, MonitorStatus, organisationszeilen, summiere } from "./MonitorStatustafel.js";
import { BEISPIEL_STAERKETAFEL } from "./pruefhilfen/staerketafelbeispiel.js";
import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";

const E: Ansichtseigenschaften = {
  lagebild: BEISPIEL_LAGEBILD,
  jetzt: BEISPIEL_JETZT,
  zeit: "101443SEP26",
  mass: { breite: 1920, hoehe: 1080 },
  staerketafel: BEISPIEL_STAERKETAFEL,
};

afterEach(cleanup);

function zeile(im: number, bereit = 0): Statuszeile {
  const z = (k: number): { einheiten: number; koepfe: number } => ({ einheiten: k > 0 ? 1 : 0, koepfe: k });
  return { IM_EINSATZ: z(im), EINSATZBEREIT: z(bereit), RUHE: z(0), NICHT_EINSATZBEREIT: z(0), SONSTIGE: z(0) };
}

describe("Status und Einsatzmittel", () => {
  it("zeigt je Organisation Köpfe mit Einheiten klein, Ausfälle in Bernstein, die Gesamtzeile wie die Ist-Stärke", () => {
    render(<MonitorStatus {...E} />);
    const tafel = screen.getByLabelText("Monitor Status");
    const thw = within(tafel).getByText("THW").closest("tr");
    expect(thw?.textContent).toBe("THW240 12 E60 3 E70 4 E10 1 E");
    expect(thw?.querySelector(".monitorwarn")?.textContent).toBe("10 1 E");
    expect(within(tafel).queryByText("Sonstige")).toBeNull();
    const summe = BEISPIEL_STAERKETAFEL.tafel.status?.gesamt;
    const koepfe = summe === undefined ? 0 : summe.IM_EINSATZ.koepfe + summe.EINSATZBEREIT.koepfe + summe.RUHE.koepfe + summe.NICHT_EINSATZBEREIT.koepfe;
    expect(koepfe).toBe(BEISPIEL_STAERKETAFEL.tafel.gesamt.gesamt);
  });

  it("zeigt je Abschnitt Einheiten mit Köpfen klein, Unterabschnitte eingerückt", () => {
    render(<MonitorEinsatzmittel {...E} />);
    const zeile = screen.getByText("Strand Schillig");
    expect(zeile.getAttribute("style")).toContain("padding-left");
    expect(zeile.closest("tr")?.textContent).toContain("6 110 K");
  });

  it("bildet die Zwischensumme Sanitätsdienst erst ab zwei Sanitätsorganisationen", () => {
    const tafel = BEISPIEL_STAERKETAFEL.tafel;
    const status = { jeOrganisation: { DRK: zeile(10), JUH: zeile(4, 2), THW: zeile(30) }, jeAbschnitt: {}, gesamt: zeile(44, 2) };
    const mitJuh = { ...tafel, organisationen: [...tafel.organisationen, { ...tafel.organisationen[0], schluessel: "JUH", name: "JUH" }] } as typeof tafel;
    const zeilen = organisationszeilen(mitJuh, status);
    expect(zeilen.at(-1)).toMatchObject({ name: "davon Sanitätsdienst", tiefe: 1 });
    expect(zeilen.at(-1)?.werte.IM_EINSATZ.koepfe).toBe(14);
    expect(organisationszeilen(tafel, status).some((z) => z.schluessel === "SAN")).toBe(false);
    expect(summiere([zeile(1), zeile(2, 3)]).EINSATZBEREIT.koepfe).toBe(3);
  });

  it("zeigt ohne Statustafel einen ruhigen Hinweis", () => {
    const ohne = { ...BEISPIEL_STAERKETAFEL.tafel };
    delete ohne.status;
    render(<MonitorStatus {...E} staerketafel={{ ...BEISPIEL_STAERKETAFEL, tafel: ohne }} />);
    expect(screen.getByText("Noch keine Stärke")).toBeDefined();
  });
});

describe("Kommen und Gehen", () => {
  it("markiert abgelaufene und ablaufende Verfügbarkeit mit ⚠ und Wort", () => {
    render(<MonitorKommenGehen {...E} />);
    const abgelaufen = screen.getByText("FGr WP 1 OV Oldenburg").closest("tr");
    expect(abgelaufen?.className).toBe("monitorwarn");
    expect(abgelaufen?.textContent).toContain("⚠ verfügbar bis · abgelaufen");
    expect(screen.getByText("2. Zug FF Hude").closest("tr")?.textContent).toContain("läuft ab");
    expect(screen.getByText("BGr OV Varel").closest("tr")?.className).toBe("");
  });

  it("nennt Tag und Uhrzeit, ohne Zeitpunkt nichts, und markiert nur „verfügbar bis“", () => {
    expect(zeitText("2026-09-11T06:00:00+02:00", BEISPIEL_JETZT)).toBe("morgen 0600");
    expect(zeitText(undefined, BEISPIEL_JETZT)).toBe("");
    expect(marke({ schluessel: "a", art: "zugesagt", name: "x", zeitpunkt: "2020-01-01T00:00:00Z" }, BEISPIEL_JETZT)).toBeUndefined();
    expect(zeilenplatz(300)).toBe(6);
  });

  it("kürzt auf den Platz und nennt den Rest", () => {
    const viele = Array.from({ length: 30 }, (_, i) => ({ schluessel: `b${String(i)}`, art: "anmarsch" as const, name: `Einheit ${String(i)}` }));
    render(<MonitorKommenGehen {...E} staerketafel={{ ...BEISPIEL_STAERKETAFEL, tafel: { ...BEISPIEL_STAERKETAFEL.tafel, kommenGehen: viele } }} />);
    expect(screen.getByText(`+${String(30 - zeilenplatz(1080))} weitere`)).toBeDefined();
  });

  it("sagt, wenn nichts ansteht", () => {
    render(<MonitorKommenGehen {...E} staerketafel={{ ...BEISPIEL_STAERKETAFEL, tafel: { ...BEISPIEL_STAERKETAFEL.tafel, kommenGehen: [] } }} />);
    expect(screen.getByText("Nichts angefordert, keine Frist offen")).toBeDefined();
  });
});
