/**
 * Die Monitoransicht „Funkplan" in jsdom (Funkplan F4, Option 5a).
 *
 * Geprüft wird, was an der Wand steht: eine Zeile je geltender Rufgruppe mit
 * Betriebsart, die Teilnehmer als Kacheln mit Statuskante, der Bernsteinrahmen
 * über der Schwelle, Mithörer, die leere Gruppe, der Fuß mit der offenen
 * Arbeit — und dass viele Gruppen die Schrift verkleinern, statt eine
 * wegzulassen. Ohne Rufgruppen bleibt das Bild ruhig.
 */

import { EINHEIT_STATUS } from "@s1/domaene";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MonitorFunkplan, fusswarnung } from "./MonitorFunkplan.js";
import type { Ansichtseigenschaften } from "./Monitoransichten.js";
import { funktafelgrad, kachelreihen } from "./funktafelmass.js";
import { gruppe, monitorFunkansicht, monitorFunklage, MONITOR_RUFGRUPPEN, teilnehmer, vieleRufgruppen } from "./pruefhilfen/monitorfunkbeispiel.js";
import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import type { Funkplanansicht } from "../kontrakt/index.js";

afterEach(cleanup);

function eigenschaften(ansicht: Funkplanansicht | undefined, mass = { breite: 960, hoehe: 540 }): Ansichtseigenschaften {
  return {
    lagebild: ansicht === undefined ? BEISPIEL_LAGEBILD : monitorFunklage(ansicht),
    jetzt: BEISPIEL_JETZT,
    zeit: "101443SEP26",
    mass,
    funkplan: ansicht,
  };
}

function grad(): number {
  return Number.parseInt(screen.getByRole("table").style.fontSize, 10);
}

function kachel(name: string): HTMLElement {
  const zeile = screen.getByText(name).closest("li");
  if (zeile === null) throw new Error(`keine Kachel ${name}`);
  return zeile;
}

describe("Monitor „Funkplan“ ohne Rufgruppen", () => {
  it("bleibt ruhig, wenn der Plan keine geltende Rufgruppe hat", () => {
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht([MONITOR_RUFGRUPPEN[6] ?? gruppe("X", "X", [])]))} />);
    const bild = screen.getByLabelText("Monitor Funkplan");
    expect(within(bild).getByText("Noch keine Rufgruppen")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("sagt ohne Plan „Noch keine Rufgruppen“ nur, wenn auch das Lagebild keine kennt", () => {
    const leer = eigenschaften(undefined);
    render(<MonitorFunkplan {...leer} />);
    expect(screen.getByText("Noch keine Rufgruppen")).toBeDefined();
    cleanup();
    render(<MonitorFunkplan {...leer} lagebild={monitorFunklage()} />);
    expect(screen.getByText("Funkplan wird geholt …")).toBeDefined();
  });
});

describe("Monitor „Funkplan“ mit sechs Rufgruppen", () => {
  it("zeigt eine Zeile je geltender Rufgruppe, die aufgelöste nicht", () => {
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht())} />);
    const zeilen = within(screen.getByRole("table")).getAllByRole("row");
    expect(zeilen).toHaveLength(7);
    expect(screen.queryByText("THW_OL_BR")).toBeNull();
    expect(screen.getByText("Funkplan · wer ist auf welcher Rufgruppe")).toBeDefined();
    const fue = within(screen.getByRole("row", { name: /THW_OL_FUE/ }));
    expect(fue.getByText("Führung · FüSt ↔ Abschnitte · hört FmZ Platz 1")).toBeDefined();
    expect(fue.getAllByRole("listitem")).toHaveLength(5);
    expect(fue.getByText("Heros Delmenhorst 22/10")).toBeDefined();
  });

  it("setzt die Betriebsart als Marke: DMO in Bernstein mit Gateway, Analog gestrichelt", () => {
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht())} />);
    const dmo = within(screen.getByRole("row", { name: /DMO 310/ }));
    expect(dmo.getByText("DMO").className).toContain("warn");
    expect(dmo.getByText(/Gateway Heros Varel 25\/10/)).toBeDefined();
    expect(within(screen.getByRole("row", { name: /2 m Kanal 55/ })).getByText("Analog").className).toContain("analog");
    expect(within(screen.getByRole("row", { name: /THW_OL_FUE/ })).getByText("TMO").className).not.toContain("warn");
  });

  it("rahmt eine Kachel über der Schwelle in Bernstein und nennt den letzten Kontakt", () => {
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht())} />);
    const still = kachel("FGr WP 2 OV Oldenburg");
    expect(still.className).toContain("still");
    expect(within(still).getByText(/letzter Kontakt 1250/).className).toBe("monitorwarn");
    expect(kachel("FGr WP OV Cloppenburg").className).not.toContain("still");
  });

  it("stellt Mithörer gestrichelt mit „hört mit“ dazu und lässt eine Gruppe ohne Teilnehmer leer", () => {
    const leer = gruppe("RL", "THW_OL_LEER", [], { zweck: "Reserve" });
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht([...MONITOR_RUFGRUPPEN, leer]))} />);
    const analog = within(screen.getByRole("row", { name: /2 m Kanal 55/ }));
    const hoerer = analog.getByText("2. Zug FF Hude").closest("li");
    expect(hoerer?.className).toContain("mithoerer");
    expect(hoerer?.textContent).toContain("hört mit");
    const zelle = screen.getByRole("row", { name: /THW_OL_LEER/ }).querySelector("td");
    expect(zelle?.textContent).toBe("");
  });

  it("nennt im Fuß die offene Arbeit in Bernstein, dann Einsatz, Stand und Zeit", () => {
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht())} />);
    const warn = screen.getByText(/^Ohne Rufgruppe: 2/);
    expect(warn.className).toBe("monitorwarn");
    expect(warn.textContent).toMatch(/^Ohne Rufgruppe: 2 \(FGr Notversorgung 2 OV Cloppenburg, SEG DLRG Oldenburg\) · kein\sKontakt\s>\s60\smin:\s1$/);
    const fuss = warn.closest("p");
    expect(fuss?.className).toBe("monitorfuss");
    expect(fuss?.textContent).toContain("Hochwasser Oldenburg");
    expect(fuss?.textContent).toContain("101443SEP26");
    expect(fuss?.textContent).toContain("Stand: vor 6 s");
  });
});

describe("Kachelstatus je Einheitenstatus", () => {
  const TON: Readonly<Record<string, string>> = {
    RUFBEREITSCHAFT: "ton-ruhe",
    EINSATZVORBEHALT: "ton-ruhe",
    ANGEFORDERT: "ton-warn",
    ANMARSCH: "ton-warn",
    EINSATZBEREIT: "ton-ok",
    IM_EINSATZ: "ton-ok",
    RUHE: "ton-ruhe",
    NICHT_EINSATZBEREIT: "ton-fehler",
    RUECKMARSCH: "ton-warn",
  };

  it("trägt den Status an der linken Kante und nennt ihn im Wort, außer bei grün", () => {
    const alle = EINHEIT_STATUS.map((status) => teilnehmer(status, `Einheit ${status}`, `Heros ${status}`, { status }));
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht([gruppe("R", "THW_OL_ALLE", alle)], []))} />);
    for (const status of EINHEIT_STATUS) {
      const k = kachel(`Einheit ${status}`);
      expect(k.className, status).toContain(TON[status]);
      const wort = within(k).getByText(new RegExp(`Heros ${status}`)).textContent;
      if (TON[status] === "ton-ok") expect(wort).toBe(`Heros ${status}`);
      else expect(wort?.length, status).toBeGreaterThan(`Heros ${status}`.length);
    }
    expect(within(kachel("Einheit NICHT_EINSATZBEREIT")).getByText(/Nicht einsatzbereit/)).toBeDefined();
    // Ohne Ausstehendes kein Bernstein im Fuß.
    expect(screen.queryByText(/Ohne Rufgruppe/)).toBeNull();
  });
});

describe("Viele Rufgruppen", () => {
  it("verkleinert bei neun Gruppen die Schrift, statt eine wegzulassen", () => {
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht(vieleRufgruppen(6)))} />);
    const sechs = grad();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(7);
    cleanup();
    render(<MonitorFunkplan {...eigenschaften(monitorFunkansicht(vieleRufgruppen(9)))} />);
    const neun = grad();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(10);
    expect(screen.getByText("THW_OL_EA9")).toBeDefined();
    expect(neun).toBeLessThan(sechs);
    expect(neun).toBeGreaterThanOrEqual(9);
  });

  it("wächst mit dem Fenster", () => {
    const gruppen = MONITOR_RUFGRUPPEN.filter((r) => !r.aufgeloest);
    const klein = funktafelgrad({ breite: 960, hoehe: 540 }, gruppen, 120);
    const gross = funktafelgrad({ breite: 1920, hoehe: 1080 }, gruppen, 120);
    expect(gross).toBeGreaterThan(klein * 1.8);
    expect(klein).toBeGreaterThanOrEqual(11);
  });

  it("bricht Kacheln als Ganzes in die nächste Reihe", () => {
    expect(kachelreihen([], 50)).toBe(0);
    expect(kachelreihen([20, 20], 50)).toBe(1);
    expect(kachelreihen([20, 20, 20], 50)).toBe(2);
    expect(kachelreihen([80, 10], 50)).toBe(2);
  });

  it("kürzt im Fuß die Namen ohne Rufgruppe nach drei", () => {
    const ohne = ["A", "B", "C", "D", "E"].map((n) => teilnehmer(n, `Einheit ${n}`, ""));
    const plan = monitorFunkansicht(MONITOR_RUFGRUPPEN, ohne).plan;
    expect(fusswarnung(plan)).toMatch(/^Ohne Rufgruppe: 5 \(Einheit A, Einheit B, Einheit C und 2 weitere\) · kein/);
    expect(fusswarnung({ ...plan, ohneRufgruppe: [], zahlen: { ...plan.zahlen, ohneKontakt: 0 } })).toBe("");
  });
});
