/**
 * Die Versorgung im Worker (S4.1) — die Naht zwischen Uhr und Ring 2.
 *
 * Ring 2 rechnet die Vorausschau, kennt aber keine Uhr und keine Zeitzone.
 * Beides hat der Worker: `jetzt` aus seiner Zeitquelle, den Versatz der
 * Ortszeit aus der Laufzeit. Diese Datei reicht beides hinein und sonst
 * nichts — gerechnet wird in `projektion.versorgungszahlen` und
 * `projektion.versorgungsblatt`.
 *
 * **Warum ein Zwischenspeicher.** Das Lagebild wird in jedem Takt gebaut,
 * also einmal je Sekunde, auch wenn nichts geschieht. Die Versorgungszahlen
 * ändern sich aber nur mit dem Zustand oder wenn eine Mahlzeit vorbei ist;
 * eine Minute Auflösung genügt für eine Ausgabezeit „1800". Gemerkt wird
 * deshalb das letzte Ergebnis je Zustand und Minute.
 */

import { projektion, type Zustand } from "@s1/domaene";

import type { Ruf, Versorgungsansicht, Versorgungszahlen } from "../kontrakt/index.js";

const MINUTE_MS = 60_000;

/** Ortszeit minus UTC in Minuten — dieselbe Zone, in der Kopfband und Monitor die Uhr zeigen. */
export function ortsversatz(ms: number): number {
  return -new Date(ms).getTimezoneOffset();
}

let gemerkt: { zustand: Zustand; minute: number; zahlen: Versorgungszahlen } | undefined;

/** Die Zahlen fürs Lagebild; gleicher Zustand in derselben Minute rechnet nicht neu. */
export function versorgungFuerLagebild(zustand: Zustand, jetztMs: number): Versorgungszahlen {
  const minute = Math.floor(jetztMs / MINUTE_MS);
  if (gemerkt !== undefined && gemerkt.zustand === zustand && gemerkt.minute === minute) return gemerkt.zahlen;
  const ms = minute * MINUTE_MS;
  const zahlen = projektion.versorgungszahlen(zustand, {
    jetzt: new Date(ms).toISOString(),
    versatzMinuten: ortsversatz(ms),
  });
  gemerkt = { zustand, minute, zahlen };
  return zahlen;
}

/** Das Blatt „Versorgung" für den Ruf `versorgungAnfordern`. */
export function versorgungsansicht(
  zustand: Zustand,
  ruf: Extract<Ruf, { art: "versorgungAnfordern" }>,
  jetztMs: number,
  lageZeiger: number,
): Versorgungsansicht {
  const jetzt = new Date(jetztMs).toISOString();
  return {
    lageZeiger,
    jetzt,
    blatt: projektion.versorgungsblatt(zustand, {
      jetzt,
      versatzMinuten: ortsversatz(jetztMs),
      stunden: ruf.stunden ?? 24,
    }),
    logistik: projektion.logistikblatt(zustand),
  };
}
