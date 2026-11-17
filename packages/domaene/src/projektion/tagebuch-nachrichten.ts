/**
 * Die Sätze der Nachrichten im Einsatztagebuch (KONZEPT-NACHRICHTEN.md §9).
 *
 * Jede Zeile nennt die Nachricht so, wie die Nachweisung sie führt, und dazu
 * Absender, Anschrift und Betreff: „Nachricht E 26 aufgenommen: OV
 * Wildeshausen an FüSt, ‚Pumpen eingetroffen‘". Damit braucht Feld 20 des
 * Vordrucks („Vermerke z. B. ETB-Nummer") niemand mehr von Hand zu füllen.
 * Die Sichtung nennt den Verteiler, die Kenntnisnahme Stelle und Handzeichen.
 *
 * Nummer, Richtung und Absender kommen aus dem Zustand **heute** (dieselbe
 * Regel wie im übrigen Tagebuch); die Anlage nennt ihre eigenen Angaben,
 * eine Nachweisung die Nummer, die sie vergibt.
 */

import type { EingehendesEreignis } from "../fold.js";
import { FMZ_SCHWELLE_VORBELEGUNG } from "../werte.js";
import type { NachrichtZustand } from "../zustand-nachricht.js";
import type { Zustand } from "../zustand.js";

const STELLE_WORT: Readonly<Record<string, string>> = {
  LEITER: "Leiter",
  FACHBERATER: "Fachberater",
  VERBINDUNGSSTELLE: "Verbindungsstelle",
  SICHTER: "Sichter",
  FMZ: "FmZ",
  LDF: "LdF",
};
const KOPIE_WORT: Readonly<Record<string, string>> = { ROT: "rot", GRUEN: "grün", BLAU: "blau" };
const MITTEL_WORT: Readonly<Record<string, string>> = {
  FUNK: "Funk",
  TELEFON: "Telefon",
  TELEFAX: "Telefax",
  DFUE: "DFÜ",
  KURIER: "Kurier/Melder",
};

/** Das Wort einer Stelle; S1 bis S6 und freie Namen stehen, wie sie kamen. */
export function stellenWort(stelle: string): string {
  return STELLE_WORT[stelle] ?? stelle;
}

/** Das Wort einer Kopiefarbe; ein unbekannter Wert steht, wie er kam (§3.7). */
export function kopieWort(kopie: string): string {
  return KOPIE_WORT[kopie] ?? kopie;
}

/** Das Wort eines Fernmeldemittels. */
export function mittelWort(mittel: string): string {
  return MITTEL_WORT[mittel] ?? mittel;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null ? (wert as Record<string, unknown>) : undefined;
}

function nutzlast(ereignis: EingehendesEreignis): Record<string, unknown> {
  return objekt(ereignis.nutzlast) ?? {};
}


interface Kopf {
  readonly richtung?: unknown;
  readonly gespraechsnotiz?: unknown;
  readonly nummer?: unknown;
  readonly absender?: unknown;
  readonly anschrift?: unknown;
  readonly betreff?: unknown;
}

/** „Nachricht E 26" oder „Gesprächsnotiz A" — ohne Nummer, solange keine vergeben ist. */
function kennung(kopf: Kopf): string {
  const wort = kopf.gespraechsnotiz === true ? "Gesprächsnotiz" : "Nachricht";
  const richtung = kopf.richtung === "AUSGANG" ? "A" : "E";
  return typeof kopf.nummer === "number" ? `${wort} ${richtung} ${String(kopf.nummer)}` : `${wort} ${richtung}`;
}

/** „OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘". */
function inhaltsteil(kopf: Kopf): string {
  const von = text(kopf.absender) ?? "?";
  const an = text(kopf.anschrift) ?? "?";
  const betreff = text(kopf.betreff);
  return betreff === undefined ? `${von} an ${an}` : `${von} an ${an}, ‚${betreff}‘`;
}

/** Was die Zeile über die Nachricht weiß: Zustand heute, sonst die eigene Nutzlast. */
function kopfAus(zustand: Zustand, ereignis: EingehendesEreignis): Kopf {
  const n = nutzlast(ereignis);
  const id = text(n["nachrichtId"]);
  const nachricht: NachrichtZustand | undefined = id === undefined ? undefined : zustand.nachrichten?.[id];
  const anlage = ereignis.typ === "NachrichtVerfasst" ? n : undefined;
  return {
    richtung: anlage?.["richtung"] ?? nachricht?.richtung.wert,
    gespraechsnotiz: anlage?.["gespraechsnotiz"] ?? nachricht?.gespraechsnotiz?.wert,
    nummer: objekt(nachricht?.nachweis?.wert)?.["nummer"],
    absender: anlage?.["absender"] ?? nachricht?.absender.wert,
    anschrift: anlage?.["anschrift"] ?? nachricht?.anschrift.wert,
    betreff: anlage?.["betreff"] ?? nachricht?.betreff.wert,
  };
}

function handzeichenteil(wert: unknown): string {
  const hz = text(objekt(wert)?.["handzeichen"]);
  return hz === undefined ? "" : `Hz. ${hz}`;
}

function klammer(teile: readonly string[]): string {
  const voll = teile.filter((t) => t !== "");
  return voll.length === 0 ? "" : ` (${voll.join(", ")})`;
}

function verfasstVerb(n: Record<string, unknown>): string {
  if (n["gespraechsnotiz"] === true) return "festgehalten";
  if (n["richtung"] === "AUSGANG") return "aufgegeben";
  return objekt(n["aufnahme"]) === undefined ? "erfasst" : "aufgenommen";
}

function verteilerteil(wert: unknown): string {
  const verteiler = objekt(wert)?.["verteiler"];
  const namen = (Array.isArray(verteiler) ? verteiler : [])
    .map(objekt)
    .filter((e): e is Record<string, unknown> => e !== undefined && typeof e["stelle"] === "string")
    .map((e) => `${stellenWort(e["stelle"] as string)}${typeof e["kopie"] === "string" ? ` (${kopieWort(e["kopie"])})` : ""}`);
  return namen.length === 0 ? "ohne Verteiler" : `verteilt an ${namen.join(", ")}`;
}

function befoerderungsteil(neu: unknown): string {
  const mittel = text(objekt(neu)?.["mittel"]);
  const gegen = text(objekt(neu)?.["gegenstelle"]);
  return klammer([mittel === undefined ? "" : mittelWort(mittel), gegen === undefined ? "" : `an ${gegen}`, handzeichenteil(neu)]);
}

function vorschlagsteil(neu: unknown): string {
  const fm = text(objekt(neu)?.["fernmelder"]);
  const mittel = text(objekt(neu)?.["mittel"]);
  const gegen = text(objekt(neu)?.["gegenstelle"]);
  return klammer([fm === undefined ? "" : `durch ${fm}`, mittel === undefined ? "" : mittelWort(mittel), gegen === undefined ? "" : `an ${gegen}`, handzeichenteil(neu)]);
}

/**
 * Der Grund, den der Worker an die Sichtung des Ersatzsichters schreibt
 * (§5 „Ersatzsichter"): Ohne ihn sähe das Tagebuch eine Sichtung der FmZ
 * wie die eines Sichters, und wer nachliest, wüsste nicht, dass kein Sichter
 * besetzt war. Ein Rahmenfeld und kein Feld der Nutzlast, damit das Schema
 * der Sichtung und ältere Fassungen unberührt bleiben.
 */
export const GRUND_ERSATZSICHTER = "Kein Sichter besetzt: Ersatzsichter";

function ersatz(e: EingehendesEreignis): boolean {
  return e.grund === GRUND_ERSATZSICHTER;
}

/** Ein Vermerk der FmZ oder des Sichters; `null` als Wert ist die Rücknahme auf „leer“. */
function vermerk(gesetzt: (neu: unknown) => string, geloescht: string): (e: EingehendesEreignis) => string {
  return (e) => (e.neu === null || e.neu === undefined ? geloescht : gesetzt(e.neu));
}

function stelleAus(e: EingehendesEreignis): string {
  return stellenWort(text(nutzlast(e)["stelle"]) ?? "?");
}

/** Das Verb mit seinen Angaben je Art — eine Tabelle statt einer Fallunterscheidung. */
const VORGANG: Readonly<Record<string, (e: EingehendesEreignis) => string>> = {
  NachrichtVerfasst: (e) => verfasstVerb(nutzlast(e)),
  NachrichtAngenommen: vermerk((neu) => `angenommen${klammer([handzeichenteil(neu)])}`, "Annahmevermerk gelöscht"),
  NachrichtUebermittlungVorgeschlagen: vermerk((neu) => `Übermittlung vorgeschlagen${vorschlagsteil(neu)}`, "Übermittlungsvorschlag gelöscht"),
  NachrichtBefoerdert: vermerk((neu) => `befördert${befoerderungsteil(neu)}`, "Beförderungsvermerk gelöscht"),
  NachrichtNachgewiesen: vermerk((neu) => `nachgewiesen${klammer([handzeichenteil(neu)])}`, "Nachweis gelöscht"),
  NachrichtWeitergegeben: vermerk((neu) => `an den Sichter weitergegeben${klammer([handzeichenteil(neu)])}`, "Weitergabe gelöscht"),
  NachrichtGesichtet: (e) =>
    vermerk(
      (neu) => `${ersatz(e) ? "als Ersatzsichter gesichtet" : "gesichtet"}${klammer([handzeichenteil(neu)])}, ${verteilerteil(neu)}`,
      "Sichtung gelöscht",
    )(e),
  NachrichtVermerkt: (e) => (text(e.neu) === undefined ? "Vermerk gelöscht" : `Vermerk „${String(e.neu)}“`),
  NachrichtKenntnisGenommen: (e) => `von ${stelleAus(e)} zur Kenntnis genommen${klammer([handzeichenteil(e.neu)])}`,
  NachrichtErledigt: (e) => `für ${stelleAus(e)} erledigt`,
  ErledigungDerNachrichtZurueckgenommen: (e) => `Erledigung für ${stelleAus(e)} zurückgenommen`,
  NachrichtZurueckgezogen: () => "zurückgezogen",
};

/** Die Arten dieses Moduls — `klartextsatz` reicht nur sie weiter. */
export const NACHRICHTENARTEN: ReadonlySet<string> = new Set(Object.keys(VORGANG));

/** „Nachrichtenparameter gesetzt (Schwelle FmZ): 20 → 30 min". */
function parametersatz(ereignis: EingehendesEreignis, betreff: string): string {
  const feld = nutzlast(ereignis)["feld"];
  const vorher = "vorher" in ereignis ? ereignis.vorher : undefined;
  if (feld === "fmzSchwelleMinuten") {
    const alt = typeof vorher === "number" ? vorher : FMZ_SCHWELLE_VORBELEGUNG;
    const neu = typeof ereignis.neu === "number" ? ereignis.neu : FMZ_SCHWELLE_VORBELEGUNG;
    return `${betreff} (Schwelle FmZ): ${String(alt)} → ${String(neu)} min`;
  }
  const wort = (wert: unknown): string => (wert === true ? "ja" : "nein");
  const name = feld === "ldfStation" ? "LdF als Station" : "Sichtung auch für Ausgänge";
  return `${betreff} (${name}): ${wort(vorher)} → ${wort(ereignis.neu)}`;
}

function vorgangDes(ereignis: EingehendesEreignis): string {
  return VORGANG[ereignis.typ]?.(ereignis) ?? ereignis.typ;
}

/**
 * Der Satz für die Arten der Nachrichten; `undefined` für jede andere Art.
 *
 * @param betreff „Name: Vorgang“, wie `tagebuchsatz` ihn bildet — gebraucht
 *   nur vom Parameter des Einsatzes; die Nachricht nennt sich selbst.
 */
export function nachrichtensatz(zustand: Zustand, ereignis: EingehendesEreignis, betreff: string): string | undefined {
  if (ereignis.typ === "NachrichtenParameterGesetzt") return parametersatz(ereignis, betreff);
  if (!NACHRICHTENARTEN.has(ereignis.typ)) return undefined;
  const kopf = kopfAus(zustand, ereignis);
  if (ereignis.typ === "NachrichtNachgewiesen") {
    const nummer = objekt(ereignis.neu)?.["nummer"];
    if (typeof nummer === "number") return `${kennung({ ...kopf, nummer })} ${vorgangDes(ereignis)}: ${inhaltsteil(kopf)}`;
  }
  return `${kennung(kopf)} ${vorgangDes(ereignis)}: ${inhaltsteil(kopf)}`;
}

/** „Nachricht E 26" — der Gegenstand, den die Rücknahme vor dem Ausführen nennt. */
export function nachrichtenname(zustand: Zustand, id: string): string {
  const nachricht = zustand.nachrichten?.[id];
  if (nachricht === undefined) return id;
  return kennung({
    richtung: nachricht.richtung.wert,
    gespraechsnotiz: nachricht.gespraechsnotiz?.wert,
    nummer: objekt(nachricht.nachweis?.wert)?.["nummer"],
  });
}

/**
 * Die fachliche Zeit einer Nachrichtenzeile (§2.5): die Zeit des Vermerks,
 * bei der Anlage die Aufnahme, sonst die Abfassungszeit. Eine Rücknahme steht
 * zur Zeit ihres Schreibens.
 */
export function nachrichtenzeit(ereignis: EingehendesEreignis): string | undefined {
  if (ereignis.typ === "NachrichtVerfasst") {
    const n = nutzlast(ereignis);
    return text(objekt(n["aufnahme"])?.["zeitpunkt"]) ?? text(n["abfassungszeit"]);
  }
  if (!NACHRICHTENARTEN.has(ereignis.typ) || ereignis.undoOf !== undefined) return undefined;
  return text(objekt(ereignis.neu)?.["zeitpunkt"]);
}
