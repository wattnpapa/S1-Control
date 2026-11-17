/**
 * Zusätze der Nachrichtenzeile aus dem zweiten Audit-Durchlauf (2026-11-17):
 * Wartezeit vor FmZ und Sichter, Zurückziehen mit Grund, das Mittel der
 * Nachweisung, der Zeitraum einer Schicht und die laufende Nummer des
 * Tagebuchs. Eigene Datei, damit `nachrichtenzeile.ts` nicht weiter wächst;
 * alles reine Funktionen über Zustand, Zeile oder Ereignissen — Ring 2 liest
 * keine Uhr.
 */

import type { EreignisId } from "../ereignis.js";
import type { EingehendesEreignis } from "../fold.js";
import { vergleicheHlc } from "../hlc.js";
import type { NachrichtZustand, Zeitvermerk } from "../zustand-nachricht.js";
import { eintreffenMs, vorSichterAusGrundlage, wartezeitAusGrundlage, type Wartegrundlage } from "./nachrichtenstand.js";
import type { Nachrichtenzeile } from "./nachrichtenzeile.js";
import { mittelWort } from "./tagebuch-nachrichten.js";

function textwert(wert: unknown): string | undefined {
  return typeof wert === "string" ? wert : undefined;
}

function iso(ms: number): string | undefined {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/**
 * Die Grundlage der Wartezeiten aus dem Zustand einer Nachricht. Seit wann
 * der Ausgang bei der FmZ liegt: das Eintreffen (HLC der Anlage) oder eine
 * frühere, vom Papier nacherfasste Annahme (LdF P0-2). Seit wann der Eingang
 * vor dem Sichter liegt: die Weitergabe des LdF, sonst die Anlage (Sichter P1-4).
 */
export function wartegrundlage(n: NachrichtZustand, annahme?: Zeitvermerk): Wartegrundlage {
  const richtung = textwert(n.richtung.wert) ?? "";
  const gespraechsnotiz = n.gespraechsnotiz?.wert === true;
  const angelegt = n.angelegtMit.millisekunden;
  const annahmeWert = annahme ?? (n.annahme?.wert as Zeitvermerk | null | undefined) ?? undefined;
  const ausgang = richtung === "AUSGANG" && !gespraechsnotiz;
  return {
    richtung,
    gespraechsnotiz,
    laufzustand: n.laufzustand,
    ...(ausgang ? { eintreffenBeiFmz: iso(eintreffenMs(angelegt, typeof annahmeWert?.zeitpunkt === "string" ? annahmeWert : undefined)) } : {}),
    ...(richtung === "EINGANG" ? { vorSichterSeit: iso(n.weitergabe?.hlc.millisekunden ?? angelegt) } : {}),
  };
}

function istZustand(quelle: Wartegrundlage | NachrichtZustand): quelle is NachrichtZustand {
  return typeof (quelle as { richtung: unknown }).richtung === "object";
}

/**
 * Die Wartezeit bei der FmZ in ganzen Minuten — aus einer Zeile oder dem
 * Zustand einer Nachricht, für die Spalte „Wartet“ wie für das Band
 * (`fmzUeberSchwelle`, `Nachrichtenlage.ueberSchwelle`). `undefined`, wenn
 * die Nachricht nicht in der Warteschlange liegt oder `jetzt` fehlt.
 */
export function wartezeitMinuten(quelle: Wartegrundlage | NachrichtZustand, jetzt: string | number | undefined): number | undefined {
  return wartezeitAusGrundlage(istZustand(quelle) ? wartegrundlage(quelle) : quelle, jetzt);
}

/** Dasselbe für einen Eingang vor dem Sichter (Sichter P1-4, `wartetSeitSichter`). */
export function wartezeitVorSichterMinuten(quelle: Wartegrundlage | NachrichtZustand, jetzt: string | number | undefined): number | undefined {
  return vorSichterAusGrundlage(istZustand(quelle) ? wartegrundlage(quelle) : quelle, jetzt);
}

/** Zeitpunkt und Grund des Zurückziehens (ETB P1-3, P2-7). */
export interface Zurueckziehung {
  /** Die Wanduhr des zurückziehenden Ereignisses (ISO). */
  readonly zeitpunkt: string;
  /**
   * Der Pflichtgrund aus dem Rahmen des Ereignisses. Der Zustand hält ihn
   * nicht (er ist kein Feldwert, und dafür den Fold zu ändern hieße
   * `FOLD_VERSION`); der Worker setzt ihn aus den Ereignissen nach
   * (`mitTagebuchbezug`). Fehlt in Ring 2 ohne Ereignisse.
   */
  readonly grund?: string;
}

/** Aus dem Feld `entfernt`: die Wanduhr der zurückziehenden Beobachtung. */
export function zurueckziehungAus(n: NachrichtZustand): Zurueckziehung | undefined {
  const feld = n.entfernt;
  if (feld?.wert !== true) return undefined;
  return { zeitpunkt: feld.wanduhr ?? new Date(feld.hlc.millisekunden).toISOString() };
}

/**
 * Das Mittel der Nachweisung: das tatsächliche (Aufnahme oder Beförderung);
 * ist nur ein Weg vorgeschlagen, das vorgeschlagene mit „(vorgeschlagen)“,
 * statt „—“ zu zeigen, was der LdF schon festgelegt hat. `undefined` ohne beides.
 */
export function nachweisungsmittel(zeile: Pick<Nachrichtenzeile, "aufnahme" | "befoerderung" | "vorschlag">): string | undefined {
  const tatsaechlich = zeile.aufnahme?.mittel ?? zeile.befoerderung?.mittel;
  if (tatsaechlich !== undefined) return mittelWort(tatsaechlich);
  const vorgeschlagen = zeile.vorschlag?.mittel;
  return vorgeschlagen === undefined ? undefined : `${mittelWort(vorgeschlagen)} (vorgeschlagen)`;
}

/**
 * Der Zeitpunkt einer Zeile für Zeitraum und Schichtausdruck der Nachweisung
 * (LdF P2-5): der erste Vermerk der FmZ (Aufnahme, Annahme, Beförderung),
 * sonst die Abfassung, sonst die Anlage.
 */
export function nachweisungszeit(zeile: Pick<Nachrichtenzeile, "aufnahme" | "annahme" | "befoerderung" | "abfassungszeit" | "angelegtMit">): string {
  const vermerk = zeile.aufnahme?.zeitpunkt ?? zeile.annahme?.zeitpunkt ?? zeile.befoerderung?.zeitpunkt ?? zeile.abfassungszeit;
  if (vermerk !== undefined && Number.isFinite(Date.parse(vermerk))) return vermerk;
  return new Date(zeile.angelegtMit.millisekunden).toISOString();
}

/** Der Zeitraum der Zeilen: früheste und späteste {@link nachweisungszeit}; `undefined` ohne Zeilen. */
export function nachweisungszeitraum(zeilen: readonly Parameters<typeof nachweisungszeit>[0][]): { readonly von: string; readonly bis: string } | undefined {
  const zeiten = zeilen.map(nachweisungszeit).sort((a, b) => Date.parse(a) - Date.parse(b));
  const von = zeiten[0];
  const bis = zeiten[zeiten.length - 1];
  return von === undefined || bis === undefined ? undefined : { von, bis };
}

/** Die Zeilen innerhalb `von` … `bis` (ISO, beide einschließlich, beide optional) — der Schichtausdruck. */
export function nachweisungImZeitraum<T extends Parameters<typeof nachweisungszeit>[0]>(zeilen: readonly T[], von?: string, bis?: string): T[] {
  const ab = von === undefined ? Number.NEGATIVE_INFINITY : Date.parse(von);
  const bisMs = bis === undefined ? Number.POSITIVE_INFINITY : Date.parse(bis);
  return zeilen.filter((z) => {
    const ms = Date.parse(nachweisungszeit(z));
    return (Number.isNaN(ab) || ms >= ab) && (Number.isNaN(bisMs) || ms <= bisMs);
  });
}

/**
 * Die laufende Nummer jeder Tagebuchzeile — die Zeile in HLC-Ordnung, wie
 * das gedruckte Tagebuch sie zählt (ETB P0-3). Für die ETB-Nummer in Feld 20
 * des Vordrucks und in der Nachrichtenansicht (ETB P1-2): Sie gehört der
 * Zeile „aufgegeben/aufgenommen“, der Anlage der Nachricht.
 */
export function etbNummern(ereignisse: readonly EingehendesEreignis[]): ReadonlyMap<EreignisId, number> {
  const geordnet = [...ereignisse].sort((a, b) => vergleicheHlc(a.hlc, b.hlc) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return new Map(geordnet.map((e, i) => [e.id, i + 1]));
}

/** Was die Ereignisse zu den Zeilen beitragen: ETB-Nummern und die Gründe des Zurückziehens. */
export interface Tagebuchbezug {
  readonly etbNummern: ReadonlyMap<EreignisId, number>;
  /** Je Nachricht der Grund des geltenden (jüngsten) Zurückziehens. */
  readonly rueckzugsgruende: ReadonlyMap<string, string>;
}

/** Baut den {@link Tagebuchbezug} in einem Durchgang über die Ereignisse. */
export function tagebuchbezug(ereignisse: readonly EingehendesEreignis[]): Tagebuchbezug {
  const etb = etbNummern(ereignisse);
  const gruende = new Map<string, { grund: string; nummer: number }>();
  for (const e of ereignisse) {
    if (e.typ !== "NachrichtZurueckgezogen") continue;
    const id = (e.nutzlast as { nachrichtId?: unknown } | undefined)?.nachrichtId;
    const nummer = etb.get(e.id) ?? 0;
    if (typeof id !== "string" || (gruende.get(id)?.nummer ?? -1) > nummer) continue;
    gruende.set(id, { grund: e.grund ?? "", nummer });
  }
  return { etbNummern: etb, rueckzugsgruende: new Map([...gruende].map(([id, g]) => [id, g.grund])) };
}

/**
 * Die Zeilen mit `etbNummer` (aus der Anlage) und dem Grund des
 * Zurückziehens — der Worker kennt die Ereignisse, Ring 2 nur den Zustand.
 */
export function mitTagebuchbezug<T extends Pick<Nachrichtenzeile, "id" | "angelegtDurch" | "zurueckgezogenMit">>(zeilen: readonly T[], bezug: Tagebuchbezug): T[] {
  return zeilen.map((zeile) => {
    const etbNummer = bezug.etbNummern.get(zeile.angelegtDurch);
    const grund = bezug.rueckzugsgruende.get(zeile.id);
    const mit = zeile.zurueckgezogenMit;
    return {
      ...zeile,
      ...(etbNummer === undefined ? {} : { etbNummer }),
      ...(mit === undefined || grund === undefined || grund === "" ? {} : { zurueckgezogenMit: { ...mit, grund } }),
    };
  });
}
