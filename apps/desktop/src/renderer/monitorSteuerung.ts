/**
 * Die Steuerung des Monitors (S4.1, KONZEPT-S4.md §4) — alles im Renderer.
 *
 * Drei Wege schalten die Ansicht um: Kontextmenü, Hover-Leiste und Tastatur
 * (1 bis 9 und 0 wählen die ersten zehn, Pfeil links/rechts blättert,
 * R schaltet den Wechsel, Leertaste hält ihn an, F11
 * Vollbild, Esc verlässt Menü oder Vollbild). Keiner davon braucht den Main:
 * Der Monitor läuft auch als Browsertab in der Web-Schale (ADR-005).
 * Der Wechsel läuft durch alle Ansichten oder nur durch die eines
 * Sachgebiets (S1, S4, …); Leiste und Menü wählen den Modus.
 *
 * Die gewählte Ansicht und der Wechselschalter sind Fensterzustand und
 * stehen in den Einstellungen **dieses Geräts** (wie `theme`), nicht in der
 * Akte. Ein Wechsel durch den Zeitgeber wird nicht gemerkt — gemerkt wird,
 * was ein Mensch gewählt hat.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { rufe } from "./bruecke.js";
import { MONITOR_ANSICHTEN, type Einstellungen, type MonitorAnsicht } from "../kontrakt/index.js";
import { ansichtFuerModus, einstellungAusModus, modusAusEinstellung, naechsteAnsicht, vorherigeAnsicht, type Wechselmodus } from "./monitorWechsel.js";

/** Takt des Wechsels — 20 s, lang genug, um eine Zahl zu lesen. */
export const WECHSEL_MS = 20_000;
/** Wie lange die Hover-Leiste ohne Mausbewegung stehen bleibt. */
export const LEISTE_MS = 3_000;

export const ANSICHT_TITEL: Readonly<Record<MonitorAnsicht, string>> = {
  offen: "Offene Punkte",
  iuk: "IuK-Lage",
  nachrichtenweg: "Nachrichtenweg",
  staerke: "Stärke",
  verpflegung: "Verpflegung",
  vorausschau: "Nächste 24 h",
  unterbringung: "Unterbringung",
  tafel: "Bereiche · Schichten",
  funkplan: "Funkplan",
  abschnitte: "Abschnitte",
  organisationen: "Organisationen",
  kreuz: "Abschnitt × Organisation",
};

/** Taste „1" bis „9" → erste bis neunte Ansicht, „0" → zehnte; sonst `undefined`. */
export function ansichtAusTaste(taste: string): MonitorAnsicht | undefined {
  if (!/^[0-9]$/.test(taste)) return undefined;
  const zahl = taste === "0" ? 10 : Number(taste);
  return MONITOR_ANSICHTEN[zahl - 1];
}

export interface Monitorsteuerung {
  readonly ansicht: MonitorAnsicht;
  /** Ob der Wechsel läuft, gleich welcher Modus. */
  readonly wechsel: boolean;
  readonly modus: Wechselmodus;
  readonly gehalten: boolean;
  readonly leiste: boolean;
  readonly menue: { readonly x: number; readonly y: number } | undefined;
  waehle(ansicht: MonitorAnsicht): void;
  /** Taste R: aus ↔ durch alle Ansichten. */
  schalteWechsel(): void;
  setzeModus(modus: Wechselmodus): void;
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
async function merke(ansicht: MonitorAnsicht, modus: Wechselmodus): Promise<void> {
  const gelesen = await liesEinstellungen();
  if (gelesen === undefined) return;
  try {
    await rufe({ art: "einstellungenSetzen", einstellungen: { ...gelesen, monitor: einstellungAusModus(ansicht, modus) } });
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
  const [modus, setzeModusZustand] = useState<Wechselmodus>("aus");
  const [gehalten, setzeGehalten] = useState(false);
  const [menue, setzeMenue] = useState<Monitorsteuerung["menue"]>(undefined);
  const leiste = useLeiste();

  useEffect(() => {
    void liesEinstellungen().then((e) => {
      if (e?.theme !== undefined) document.documentElement.dataset["theme"] = e.theme;
      if (e?.monitor === undefined) return;
      setzeAnsicht(e.monitor.ansicht);
      setzeModusZustand(modusAusEinstellung(e.monitor));
    });
  }, []);

  const wechsel = modus !== "aus";
  const weiter = useCallback(() => {
    setzeAnsicht((bisher) => naechsteAnsicht(bisher, modus));
  }, [modus]);
  useWechsel(wechsel && !gehalten, weiter);

  const waehle = useCallback(
    (neu: MonitorAnsicht) => {
      setzeAnsicht(neu);
      setzeMenue(undefined);
      void merke(neu, modus);
    },
    [modus],
  );
  const setzeModus = useCallback(
    (neu: Wechselmodus) => {
      const start = ansichtFuerModus(ansicht, neu);
      setzeModusZustand(neu);
      setzeAnsicht(start);
      setzeGehalten(false);
      setzeMenue(undefined);
      void merke(start, neu);
    },
    [ansicht],
  );
  const schalteWechsel = useCallback(() => {
    setzeModus(wechsel ? "aus" : "alle");
  }, [setzeModus, wechsel]);

  const steuerung: Monitorsteuerung = {
    ansicht,
    wechsel,
    modus,
    gehalten,
    leiste: leiste.sichtbar,
    menue,
    waehle,
    schalteWechsel,
    setzeModus,
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
      else if (ereignis.key === "ArrowRight") s.waehle(naechsteAnsicht(s.ansicht));
      else if (ereignis.key === "ArrowLeft") s.waehle(vorherigeAnsicht(s.ansicht));
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
