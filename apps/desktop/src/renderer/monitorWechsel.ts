/**
 * Gruppen und Wechsel des Monitors — reine Helfer ohne React.
 *
 * Die Ansichten sind nach Sachgebiet gruppiert (S1, S4, FmZ). Der Wechsel
 * läuft entweder durch alle Ansichten oder nur durch die eines Sachgebiets:
 * Der Monitor in der S4-Ecke zeigt dann nur Versorgung. Ein Sachgebiet mit
 * nur einer Ansicht wird für den Wechsel nicht angeboten — dort gäbe es
 * nichts zu wechseln; kommt eine zweite dazu, erscheint es von selbst.
 */

import {
  MONITOR_ANSICHTEN,
  MONITOR_GRUPPEN,
  MONITOR_GRUPPE_DER_ANSICHT,
  type Einstellungen,
  type MonitorAnsicht,
  type MonitorGruppe,
} from "../kontrakt/index.js";

/** Aus, durch alle Ansichten oder nur durch die eines Sachgebiets. */
export type Wechselmodus = "aus" | "alle" | MonitorGruppe;

export const GRUPPE_KURZ: Readonly<Record<MonitorGruppe, string>> = { s1: "S1", s4: "S4", fmz: "FmZ" };
export const GRUPPE_TITEL: Readonly<Record<MonitorGruppe, string>> = {
  s1: "S1 · Personal",
  s4: "S4 · Versorgung",
  fmz: "FmZ · Fernmelde",
};

/** Die Ansichten eines Sachgebiets in Tastenreihenfolge. */
export function ansichtenDerGruppe(gruppe: MonitorGruppe): readonly MonitorAnsicht[] {
  return MONITOR_ANSICHTEN.filter((a) => MONITOR_GRUPPE_DER_ANSICHT[a] === gruppe);
}

/** Die Ansichten, durch die der Wechsel in diesem Modus läuft. */
export function wechselfolge(modus: Wechselmodus): readonly MonitorAnsicht[] {
  return modus === "aus" || modus === "alle" ? MONITOR_ANSICHTEN : ansichtenDerGruppe(modus);
}

/** Die Wechselmodi, die angeboten werden: aus, alle, je Sachgebiet mit mindestens zwei Ansichten. */
export function wechselmodi(): readonly Wechselmodus[] {
  return ["aus", "alle", ...MONITOR_GRUPPEN.filter((g) => ansichtenDerGruppe(g).length > 1)];
}

/** Der nächste Modus für den Schalter in der Leiste; nach dem letzten wieder „aus". */
export function naechsterModus(modus: Wechselmodus): Wechselmodus {
  const modi = wechselmodi();
  return modi[(modi.indexOf(modus) + 1) % modi.length] ?? "aus";
}

/**
 * Die Ansicht, die im Wechsel als nächste kommt. Steht der Monitor auf einer
 * Ansicht außerhalb der Folge (von Hand gewählt), geht es mit deren erster weiter.
 */
export function naechsteAnsicht(ansicht: MonitorAnsicht, modus: Wechselmodus = "alle"): MonitorAnsicht {
  const folge = wechselfolge(modus);
  const stelle = folge.indexOf(ansicht);
  return folge[(stelle + 1) % folge.length] ?? "staerke";
}

/** Die Ansicht, mit der ein neu gewählter Modus beginnt: die aktuelle, wenn sie dazugehört. */
export function ansichtFuerModus(ansicht: MonitorAnsicht, modus: Wechselmodus): MonitorAnsicht {
  const folge = wechselfolge(modus);
  return folge.includes(ansicht) ? ansicht : (folge[0] ?? ansicht);
}

/** Wie der Schalter den Modus nennt: „aus", „alle", „S1" … */
export function modusKurz(modus: Wechselmodus): string {
  return modus === "aus" || modus === "alle" ? modus : GRUPPE_KURZ[modus];
}

/** Gemerkte Einstellung → Modus; eine Gruppe, die nicht mehr angeboten wird, heißt „alle". */
export function modusAusEinstellung(monitor: Einstellungen["monitor"]): Wechselmodus {
  if (monitor === undefined || !monitor.wechsel) return "aus";
  const gruppe = monitor.wechselgruppe;
  return gruppe !== undefined && wechselmodi().includes(gruppe) ? gruppe : "alle";
}

/** Modus → gemerkte Einstellung; `wechselgruppe` steht nur da, wo sie etwas sagt. */
export function einstellungAusModus(ansicht: MonitorAnsicht, modus: Wechselmodus): NonNullable<Einstellungen["monitor"]> {
  if (modus === "aus" || modus === "alle") return { ansicht, wechsel: modus === "alle" };
  return { ansicht, wechsel: true, wechselgruppe: modus };
}
