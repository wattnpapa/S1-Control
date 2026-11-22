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

export const GRUPPE_KURZ: Readonly<Record<MonitorGruppe, string>> = { fuehrung: "Fü", s1: "S1", s2: "S2", s3: "S3", s4: "S4", s6: "S6", fmz: "FmZ" };
export const GRUPPE_TITEL: Readonly<Record<MonitorGruppe, string>> = {
  fuehrung: "Führung",
  s1: "S1 · Personal",
  s2: "S2 · Lage",
  s3: "S3 · Einsatz",
  s4: "S4 · Versorgung",
  s6: "S6 · IuK",
  fmz: "FmZ · Fernmelde",
};

/**
 * Besucheransicht (Review S5): nur Kräftezahlen, keine Funk-, Nachrichten-,
 * Tagebuch- oder Personenlisten. Pressefotos und Besucher sehen dann nichts,
 * was nicht für sie gedacht ist.
 */
export const BESUCHER_ANSICHTEN: readonly MonitorAnsicht[] = ["staerke", "status", "abschnitte", "organisationen", "kreuz"];

/** Die Ansichten, die zu sehen sind — alle oder die der Besucheransicht. */
export function sichtbareAnsichten(besucher = false): readonly MonitorAnsicht[] {
  return besucher ? MONITOR_ANSICHTEN.filter((a) => BESUCHER_ANSICHTEN.includes(a)) : MONITOR_ANSICHTEN;
}

/** Die Ansichten eines Sachgebiets in Tastenreihenfolge. */
export function ansichtenDerGruppe(gruppe: MonitorGruppe, besucher = false): readonly MonitorAnsicht[] {
  return sichtbareAnsichten(besucher).filter((a) => MONITOR_GRUPPE_DER_ANSICHT[a] === gruppe);
}

/** Sachgebiete, die (sichtbare) Ansichten haben — eine leere Gruppe erscheint nirgends. */
export function belegteGruppen(besucher = false): readonly MonitorGruppe[] {
  return MONITOR_GRUPPEN.filter((g) => ansichtenDerGruppe(g, besucher).length > 0);
}

/** Die Ansichten, durch die der Wechsel in diesem Modus läuft. */
export function wechselfolge(modus: Wechselmodus, besucher = false): readonly MonitorAnsicht[] {
  return modus === "aus" || modus === "alle" ? sichtbareAnsichten(besucher) : ansichtenDerGruppe(modus, besucher);
}

/** Die Wechselmodi, die angeboten werden: aus, alle, je Sachgebiet mit mindestens zwei Ansichten. */
export function wechselmodi(besucher = false): readonly Wechselmodus[] {
  return ["aus", "alle", ...MONITOR_GRUPPEN.filter((g) => ansichtenDerGruppe(g, besucher).length > 1)];
}

/** Der nächste Modus für den Schalter in der Leiste; nach dem letzten wieder „aus". */
export function naechsterModus(modus: Wechselmodus, besucher = false): Wechselmodus {
  const modi = wechselmodi(besucher);
  return modi[(modi.indexOf(modus) + 1) % modi.length] ?? "aus";
}

/**
 * Die Ansicht, die im Wechsel als nächste kommt. Steht der Monitor auf einer
 * Ansicht außerhalb der Folge (von Hand gewählt), geht es mit deren erster weiter.
 */
export function naechsteAnsicht(ansicht: MonitorAnsicht, modus: Wechselmodus = "alle", besucher = false): MonitorAnsicht {
  const folge = wechselfolge(modus, besucher);
  const stelle = folge.indexOf(ansicht);
  return folge[(stelle + 1) % folge.length] ?? "staerke";
}

/** Die Ansicht davor in der Folge der sichtbaren (Pfeil links). */
export function vorherigeAnsicht(ansicht: MonitorAnsicht, besucher = false): MonitorAnsicht {
  const folge = sichtbareAnsichten(besucher);
  const stelle = folge.indexOf(ansicht);
  if (stelle === -1) return folge[0] ?? "staerke";
  return folge[(stelle - 1 + folge.length) % folge.length] ?? "staerke";
}

/** Die Taste einer Ansicht: „1" bis „9", die zehnte „0", danach keine. */
export function tasteDerAnsicht(ansicht: MonitorAnsicht): string | undefined {
  const stelle = MONITOR_ANSICHTEN.indexOf(ansicht);
  if (stelle < 9) return String(stelle + 1);
  return stelle === 9 ? "0" : undefined;
}

/** Die Ansicht, mit der ein neu gewählter Modus beginnt: die aktuelle, wenn sie dazugehört. */
export function ansichtFuerModus(ansicht: MonitorAnsicht, modus: Wechselmodus, besucher = false): MonitorAnsicht {
  const folge = modus === "aus" ? sichtbareAnsichten(besucher) : wechselfolge(modus, besucher);
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
  return gruppe !== undefined && wechselmodi(monitor.besucher === true).includes(gruppe) ? gruppe : "alle";
}

/** Modus → gemerkte Einstellung; `wechselgruppe` und `besucher` stehen nur da, wo sie etwas sagen. */
export function einstellungAusModus(ansicht: MonitorAnsicht, modus: Wechselmodus, besucher = false): NonNullable<Einstellungen["monitor"]> {
  const zusatz = besucher ? { besucher: true } : {};
  if (modus === "aus" || modus === "alle") return { ansicht, wechsel: modus === "alle", ...zusatz };
  return { ansicht, wechsel: true, wechselgruppe: modus, ...zusatz };
}
