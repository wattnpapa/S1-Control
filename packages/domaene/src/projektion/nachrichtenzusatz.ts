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
import { eintreffenMs, vorLdfAusGrundlage, vorSichterAusGrundlage, wartezeitAusGrundlage, type Wartegrundlage } from "./nachrichtenstand.js";
import type { Nachrichtenzeile } from "./nachrichtenzeile.js";
import { istErsatzsichtung, mittelWort } from "./tagebuch-nachrichten.js";
import { akteurText, handzeichenDer, stelleDer } from "./tagebuch-nachrichtenbezug.js";
import { zeitpunktText } from "../beschriftungen.js";

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
    ...(n.laufzustand === "VOR_LDF" ? { vorLdfSeit: vorLdfSeit(n, richtung, annahmeWert) } : {}),
  };
}

/**
 * Seit wann die Nachricht beim LdF liegt (R2-LdF P1-2, R2-Si P1-1): der
 * Eingang ab der Aufnahme (Eintreffen, eine frühere nacherfasste Aufnahme
 * geht vor), der Ausgang ab der Annahme oder, seit er vor der Annahme beim
 * LdF steht (FOLD_VERSION 15), ab dem Eintreffen.
 */
function vorLdfSeit(n: NachrichtZustand, richtung: string, annahme: Zeitvermerk | null | undefined): string | undefined {
  if (richtung === "EINGANG") {
    const aufnahme = n.aufnahme?.wert as Zeitvermerk | null | undefined;
    return iso(eintreffenMs(n.angelegtMit.millisekunden, typeof aufnahme?.zeitpunkt === "string" ? aufnahme : undefined));
  }
  const seit = n.annahme?.hlc.millisekunden ?? n.angelegtMit.millisekunden;
  return iso(eintreffenMs(seit, typeof annahme?.zeitpunkt === "string" ? annahme : undefined));
}

/** Minuten beim LdF, solange VOR_LDF (`wartetSeitLdf` der Zeile). */
export function wartezeitBeimLdfMinuten(quelle: Wartegrundlage | NachrichtZustand, jetzt: string | number | undefined): number | undefined {
  return vorLdfAusGrundlage(istZustand(quelle) ? wartegrundlage(quelle) : quelle, jetzt);
}

/**
 * Die geltenden Vermerke bei zwei Sichtungen (R2-Si P1-2): Der Vermerk ist
 * die Handlungsanweisung des Sichters, und die Vereinigung der Verteiler
 * verlor den des Ersten still. Beide Texte stehen, je mit dem Handzeichen
 * davor, getrennt durch „ / “ — der ältere zuerst. Ein Text, der schon mit
 * „Hz:“ beginnt, bekommt es nicht doppelt.
 */
export function vereinigteVermerke(
  sichtung: { readonly zeitpunkt: string; readonly handzeichen: string; readonly vermerke?: string | undefined } | undefined,
  zweite: { readonly zeitpunkt: string; readonly handzeichen: string; readonly vermerke?: string | undefined } | undefined,
): string | undefined {
  if (zweite === undefined) return sichtung?.vermerke;
  const teile = [zweite, sichtung]
    .filter((s): s is NonNullable<typeof s> => s !== undefined && (s.vermerke ?? "").trim() !== "")
    .sort((a, b) => Date.parse(a.zeitpunkt) - Date.parse(b.zeitpunkt))
    .map((s) => mitHandzeichen(s.handzeichen, (s.vermerke ?? "").trim()));
  const einzig = [...new Set(teile)];
  return einzig.length === 0 ? undefined : einzig.join(" / ");
}

function mitHandzeichen(handzeichen: string, text: string): string {
  const hz = handzeichen.trim();
  if (hz === "" || text.toLocaleLowerCase("de-DE").startsWith(`${hz.toLocaleLowerCase("de-DE")}:`)) return text;
  return `${hz}: ${text}`;
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
  /** Additiv (R2-ETB P3-3): „S3 · Mü“ — Stelle und Handzeichen aus der Nutzlast des Zurückziehens; setzt der Worker. */
  readonly durch?: string;
}

/** „Zurückgezogen 17.11.2026 20:41 von S3 · Mü, Grund: „Fehlanlage““ (R2-ETB P3-3). */
export function zurueckgezogenSatz(mit: Zurueckziehung): string {
  const durch = mit.durch === undefined || mit.durch === "" ? "" : ` von ${mit.durch}`;
  const grund = mit.grund === undefined || mit.grund === "" ? "" : `, Grund: „${mit.grund}“`;
  return `Zurückgezogen ${zeitpunktText(mit.zeitpunkt)}${durch}${grund}`;
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
  /** Additiv (R2-ETB P3-3): je Nachricht Stelle und Handzeichen des geltenden Zurückziehens („S3 · Mü“). */
  readonly rueckzugDurch?: ReadonlyMap<string, string>;
  /**
   * Additiv (R2-LdF P2-1): die Nachrichten, deren geltende (jüngste)
   * Beförderung ohne Vorschlag des besetzten LdF geschah (`ohneVorschlag` in
   * der Nutzlast) — die Zeile trägt dann die Marke.
   */
  readonly ohneVorschlag?: ReadonlySet<string>;
  /** Additiv (R2-Si P2-1): die Nachrichten, deren geltende (jüngste) Sichtung eine Ersatzsichtung war. */
  readonly ersatzsichtungen?: ReadonlySet<string>;
}

/** Baut den {@link Tagebuchbezug} in einem Durchgang über die Ereignisse. */
export function tagebuchbezug(ereignisse: readonly EingehendesEreignis[]): Tagebuchbezug {
  const etb = etbNummern(ereignisse);
  const gruende = new Map<string, { grund: string; nummer: number; durch: string }>();
  const befoerderungen = new Map<string, { ohne: boolean; nummer: number }>();
  const sichtungen = new Map<string, { ohne: boolean; nummer: number }>();
  for (const e of ereignisse) {
    if (e.typ === "NachrichtBefoerdert") merkeBefoerderung(e, etb.get(e.id) ?? 0, befoerderungen);
    if (e.typ === "NachrichtGesichtet") merkeSichtung(e, etb.get(e.id) ?? 0, sichtungen);
    if (e.typ !== "NachrichtZurueckgezogen") continue;
    const id = (e.nutzlast as { nachrichtId?: unknown } | undefined)?.nachrichtId;
    const nummer = etb.get(e.id) ?? 0;
    if (typeof id !== "string" || (gruende.get(id)?.nummer ?? -1) > nummer) continue;
    gruende.set(id, { grund: e.grund ?? "", nummer, durch: akteurText({ akteur: "", stelle: stelleDer(e), handzeichen: handzeichenDer(e) }) });
  }
  const ohneVorschlag = new Set([...befoerderungen].filter(([, b]) => b.ohne).map(([id]) => id));
  const rueckzugDurch = new Map([...gruende].filter(([, g]) => g.durch !== "").map(([id, g]) => [id, g.durch]));
  const ersatzsichtungen = new Set([...sichtungen].filter(([, b]) => b.ohne).map(([id]) => id));
  return { etbNummern: etb, rueckzugsgruende: new Map([...gruende].map(([id, g]) => [id, g.grund])), ohneVorschlag, rueckzugDurch, ersatzsichtungen };
}

/** R2-Si P2-1: die jüngste Sichtung je Nachricht — Ersatzsichtung, wenn ihr Grund es sagt (eine Rücknahme ist keine). */
function merkeSichtung(e: EingehendesEreignis, nummer: number, sichtungen: Map<string, { ohne: boolean; nummer: number }>): void {
  const id = (e.nutzlast as { nachrichtId?: unknown } | undefined)?.nachrichtId;
  if (typeof id !== "string" || (sichtungen.get(id)?.nummer ?? -1) > nummer) return;
  sichtungen.set(id, { ohne: e.undoOf === undefined && istErsatzsichtung(e), nummer });
}

/** Die jüngste Beförderung je Nachricht in HLC-Ordnung (die ETB-Nummer), eine Rücknahme eingeschlossen. */
function merkeBefoerderung(e: EingehendesEreignis, nummer: number, befoerderungen: Map<string, { ohne: boolean; nummer: number }>): void {
  const nutzlast = (e.nutzlast ?? {}) as { nachrichtId?: unknown; ohneVorschlag?: unknown };
  if (typeof nutzlast.nachrichtId !== "string" || (befoerderungen.get(nutzlast.nachrichtId)?.nummer ?? -1) > nummer) return;
  befoerderungen.set(nutzlast.nachrichtId, { ohne: e.undoOf === undefined && nutzlast.ohneVorschlag === true, nummer });
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
    // R2-LdF P2-1: nur, solange die Zeile eine Beförderung trägt.
    const ohne = bezug.ohneVorschlag?.has(zeile.id) === true && (zeile as { befoerderung?: unknown }).befoerderung !== undefined;
    const ersatz = bezug.ersatzsichtungen?.has(zeile.id) === true && (zeile as { sichtung?: unknown }).sichtung !== undefined;
    const durch = bezug.rueckzugDurch?.get(zeile.id);
    const neuMit = mit === undefined ? undefined : { ...mit, ...(grund === undefined || grund === "" ? {} : { grund }), ...(durch === undefined ? {} : { durch }) };
    return {
      ...zeile,
      ...(ohne ? { ohneVorschlag: true } : {}),
      ...(ersatz ? { ersatzsichtung: true } : {}),
      ...(etbNummer === undefined ? {} : { etbNummer }),
      // R2-ETB P3-3: Grund und Stelle auch im Satz für den Kopf der Lese-Ansicht.
      ...(neuMit === undefined ? {} : { zurueckgezogenMit: neuMit, zurueckgezogenText: zurueckgezogenSatz(neuMit) }),
    };
  });
}
