/**
 * Die Steuerung des Monitors (S4.1, KONZEPT-S4.md §4) — alles im Renderer.
 *
 * Drei Wege schalten die Ansicht um: Kontextmenü, Hover-Leiste und Tastatur
 * (1 bis 5 wählen, R schaltet den Wechsel, Leertaste hält ihn an, F11
 * Vollbild, Esc verlässt Menü oder Vollbild). Keiner davon braucht den Main:
 * Der Monitor läuft auch als Browsertab in der Web-Schale (ADR-005).
 *
 * Die gewählte Ansicht und der Wechselschalter sind Fensterzustand und
 * stehen in den Einstellungen **dieses Geräts** (wie `theme`), nicht in der
 * Akte. Ein Wechsel durch den Zeitgeber wird nicht gemerkt — gemerkt wird,
 * was ein Mensch gewählt hat.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import { MONITOR_ANSICHTEN, type Einstellungen, type MonitorAnsicht } from "../kontrakt/index.js";

/** Takt des Wechsels — 20 s, lang genug, um eine Zahl zu lesen. */
export const WECHSEL_MS = 20_000;
/** Wie lange die Hover-Leiste ohne Mausbewegung stehen bleibt. */
export const LEISTE_MS = 3_000;

export const ANSICHT_TITEL: Readonly<Record<MonitorAnsicht, string>> = {
  staerke: "Stärke",
  verpflegung: "Verpflegung",
  vorausschau: "Nächste 24 h",
  unterbringung: "Unterbringung",
  tafel: "Bereiche · Schichten",
};

/** Die Ansicht, die im Wechsel als nächste kommt. */
export function naechsteAnsicht(ansicht: MonitorAnsicht): MonitorAnsicht {
  const stelle = MONITOR_ANSICHTEN.indexOf(ansicht);
  return MONITOR_ANSICHTEN[(stelle + 1) % MONITOR_ANSICHTEN.length] ?? "staerke";
}

/** Taste „1" bis „5" → Ansicht; sonst `undefined`. */
export function ansichtAusTaste(taste: string): MonitorAnsicht | undefined {
  const zahl = Number(taste);
  return Number.isInteger(zahl) && zahl >= 1 ? MONITOR_ANSICHTEN[zahl - 1] : undefined;
}

export interface Monitorsteuerung {
  readonly ansicht: MonitorAnsicht;
  readonly wechsel: boolean;
  readonly gehalten: boolean;
  readonly leiste: boolean;
  readonly menue: { readonly x: number; readonly y: number } | undefined;
  waehle(ansicht: MonitorAnsicht): void;
  schalteWechsel(): void;
  oeffneMenue(x: number, y: number): void;
  schliesseMenue(): void;
  zeigeLeiste(): void;
  schalteVollbild(): void;
  schliesseMonitor(): void;
}

async function liesEinstellungen(): Promise<Einstellungen | undefined> {
  try {
    const wert: unknown = await rufe({ art: "einstellungenLesen" });
    return wert !== null && typeof wert === "object" ? (wert as Einstellungen) : undefined;
  } catch {
    return undefined;
  }
}

/** Merkt die Wahl in den Geräteeinstellungen — frisch gelesen, damit nichts anderes verloren geht. */
async function merke(ansicht: MonitorAnsicht, wechsel: boolean): Promise<void> {
  const gelesen = await liesEinstellungen();
  if (gelesen === undefined) return;
  try {
    await rufe({ art: "einstellungenSetzen", einstellungen: { ...gelesen, monitor: { ansicht, wechsel } } });
  } catch {
    // Nicht gemerkt ist kein Fehlerbild an der Wand: Die Wahl gilt für dieses Fenster.
  }
}

export function schalteVollbild(): void {
  // jsdom kennt `fullscreenElement` nicht; fehlend heißt „kein Vollbild".
  if ((document.fullscreenElement ?? null) === null) {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  } else {
    void document.exitFullscreen?.().catch(() => undefined);
  }
}

function useWechsel(aktiv: boolean, weiter: () => void): void {
  useEffect(() => {
    if (!aktiv) return undefined;
    const zeitgeber = setInterval(weiter, WECHSEL_MS);
    return () => {
      clearInterval(zeitgeber);
    };
  }, [aktiv, weiter]);
}

function useLeiste(): { readonly sichtbar: boolean; readonly zeige: () => void } {
  const [sichtbar, setzeSichtbar] = useState(false);
  const zeitgeber = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const zeige = useCallback(() => {
    setzeSichtbar(true);
    clearTimeout(zeitgeber.current);
    zeitgeber.current = setTimeout(() => {
      setzeSichtbar(false);
    }, LEISTE_MS);
  }, []);
  useEffect(() => () => clearTimeout(zeitgeber.current), []);
  return { sichtbar, zeige };
}

export function useMonitorsteuerung(): Monitorsteuerung {
  const [ansicht, setzeAnsicht] = useState<MonitorAnsicht>("staerke");
  const [wechsel, setzeWechsel] = useState(false);
  const [gehalten, setzeGehalten] = useState(false);
  const [menue, setzeMenue] = useState<Monitorsteuerung["menue"]>(undefined);
  const leiste = useLeiste();

  useEffect(() => {
    void liesEinstellungen().then((e) => {
      if (e?.theme !== undefined) document.documentElement.dataset["theme"] = e.theme;
      if (e?.monitor === undefined) return;
      setzeAnsicht(e.monitor.ansicht);
      setzeWechsel(e.monitor.wechsel);
    });
  }, []);

  const weiter = useCallback(() => {
    setzeAnsicht((bisher) => naechsteAnsicht(bisher));
  }, []);
  useWechsel(wechsel && !gehalten, weiter);

  const waehle = useCallback(
    (neu: MonitorAnsicht) => {
      setzeAnsicht(neu);
      setzeMenue(undefined);
      void merke(neu, wechsel);
    },
    [wechsel],
  );
  const schalteWechsel = useCallback(() => {
    const neu = !wechsel;
    setzeWechsel(neu);
    setzeGehalten(false);
    setzeMenue(undefined);
    void merke(ansicht, neu);
  }, [ansicht, wechsel]);

  const steuerung: Monitorsteuerung = {
    ansicht,
    wechsel,
    gehalten,
    leiste: leiste.sichtbar,
    menue,
    waehle,
    schalteWechsel,
    oeffneMenue: (x, y) => setzeMenue({ x, y }),
    schliesseMenue: () => setzeMenue(undefined),
    zeigeLeiste: leiste.zeige,
    schalteVollbild,
    schliesseMonitor: () => window.close(),
  };
  const halte = useCallback(() => {
    setzeGehalten((bisher) => !bisher);
  }, []);
  useMonitortasten(steuerung, halte);
  return steuerung;
}

/** Die Tasten des Monitors; ein Hörer am Fenster, sauber abgemeldet. */
function useMonitortasten(steuerung: Monitorsteuerung, halte: () => void): void {
  const aktuell = useRef(steuerung);
  aktuell.current = steuerung;
  useEffect(() => {
    function beiTaste(ereignis: KeyboardEvent): void {
      if (ereignis.ctrlKey || ereignis.metaKey || ereignis.altKey) return;
      const s = aktuell.current;
      const gewaehlt = ansichtAusTaste(ereignis.key);
      if (gewaehlt !== undefined) s.waehle(gewaehlt);
      else if (ereignis.key === "r" || ereignis.key === "R") s.schalteWechsel();
      else if (ereignis.key === " " && s.wechsel) halte();
      else if (ereignis.key === "F11") s.schalteVollbild();
      else if (ereignis.key === "ContextMenu") s.oeffneMenue(window.innerWidth / 2, window.innerHeight / 3);
      else if (ereignis.key === "Escape") beiEscape(s);
      else return;
      ereignis.preventDefault();
    }
    window.addEventListener("keydown", beiTaste);
    return () => {
      window.removeEventListener("keydown", beiTaste);
    };
  }, [halte]);
}

function beiEscape(s: Monitorsteuerung): void {
  if (s.menue !== undefined) s.schliesseMenue();
  else if ((document.fullscreenElement ?? null) !== null) void document.exitFullscreen?.().catch(() => undefined);
}
