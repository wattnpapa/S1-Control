/**
 * Gemeinsame Umgebung der Monitorbild-Tests: Attrappe mit allen Antworten,
 * falsche Uhr, Zeichnen, Tasten, Ansicht wählen und gemerkte Einstellungen.
 * Ausschließlich für Tests.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

import type { Einstellungen, MonitorAnsicht } from "../../kontrakt/index.js";
import { Monitorbild } from "../Monitorbild.js";
import { ANSICHT_TITEL } from "../monitorSteuerung.js";
import { tasteDerAnsicht } from "../monitorWechsel.js";
import { baueAttrappe, type Attrappe } from "./attrappe.js";
import { monitorFunkansicht } from "./monitorfunkbeispiel.js";
import { TICKER, WARTENDE } from "./monitorlistenbeispiel.js";
import { BEISPIEL_STAERKETAFEL } from "./staerketafelbeispiel.js";
import { BEISPIEL_ANSICHT, BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./versorgungsbeispiel.js";

export const GRUND: Einstellungen = { sharePfad: "/share", anzeigename: "Zelt", theme: "nacht" };

/** Die Attrappe des laufenden Tests — gesetzt in `beforeEach`. */
export const umgebung: { attrappe: Attrappe } = { attrappe: baueAttrappe() };

/** Meldet Vor- und Nachbereitung an; einmal je Testdatei aufrufen. */
export function monitorUmgebung(): void {
  beforeEach(() => {
    vi.useFakeTimers();
    const a = baueAttrappe();
    umgebung.attrappe = a;
    a.antwortet("einstellungenLesen", GRUND);
    a.antwortet("versorgungAnfordern", BEISPIEL_ANSICHT);
    a.antwortet("funkplanAnfordern", monitorFunkansicht());
    a.antwortet("staerketafelAnfordern", BEISPIEL_STAERKETAFEL);
    a.antwortet("nachrichtenAnfordern", { lageZeiger: 1, zeilen: WARTENDE, gesamtzahl: WARTENDE.length, von: 0, jetzt: "2026-09-10T12:43:00Z", anschriften: [] });
    a.antwortet("tagebuchAnfordern", { lageZeiger: 1, zeilen: TICKER, gesamtzahl: TICKER.length, von: 0 });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    delete document.documentElement.dataset["theme"];
  });
}

export async function zeichne(lagebild = BEISPIEL_LAGEBILD): Promise<void> {
  render(<Monitorbild lagebild={lagebild} akteId="akte-1" jetzt={BEISPIEL_JETZT} />);
  // Die Einstellungen kommen über einen Ruf; erst danach steht die Wahl.
  await act(async () => {
    await Promise.resolve();
  });
}

export function taste(key: string): void {
  act(() => {
    fireEvent.keyDown(window, { key });
  });
}

/** Wählt eine Ansicht über ihre Taste, ohne Taste (ab der elften) über das Menü. */
export function zeige(ansicht: MonitorAnsicht): void {
  const t = tasteDerAnsicht(ansicht);
  if (t !== undefined) {
    taste(t);
    return;
  }
  taste("ContextMenu");
  act(() => {
    fireEvent.click(within(screen.getByRole("group", { name: "Ansicht" })).getByRole("menuitemradio", { name: new RegExp(`^${ANSICHT_TITEL[ansicht]}`) }));
  });
}

/** Wie sich eine Ansicht im Bild nennt: die Stärke ist der Lagemonitor. */
export function bildname(ansicht: MonitorAnsicht): string {
  return ansicht === "staerke" ? "Lagemonitor" : `Monitor ${ANSICHT_TITEL[ansicht]}`;
}

export function gemerkt(): Einstellungen["monitor"][] {
  return umgebung.attrappe.rufeDerArt("einstellungenSetzen").map((r) => r.einstellungen.monitor);
}
