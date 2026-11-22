/**
 * Die Sätze der Nachrichten im Einsatztagebuch (KONZEPT-NACHRICHTEN.md §9).
 *
 * Jede Zeile nennt die Nachricht so, wie die Nachweisung sie führt, und dazu
 * Absender, Anschrift und Betreff: „Nachricht E 26 aufgenommen: OV
 * Wildeshausen an FüSt, ‚Pumpen eingetroffen‘". Damit braucht Feld 20 des
 * Vordrucks („Vermerke z. B. ETB-Nummer") niemand mehr von Hand zu füllen.
 * Die Sichtung nennt den Verteiler, die Kenntnisnahme Stelle und Handzeichen.
 *
 * Richtung und Absender kommen aus dem Zustand **heute** (dieselbe Regel wie
 * im übrigen Tagebuch); die Anlage nennt ihre eigenen Angaben, eine
 * Nachweisung die Nummer, die sie vergibt. Die **Nummer** einer Zeile ist,
 * wo der Aufrufer den Verlauf kennt (`Zeitstand`, gebaut in
 * `tagebuch-nachrichtenbezug.ts`), die zum Zeitpunkt des Ereignisses, mit
 * „jetzt E 3", wenn sie sich seither geändert hat (ETB P0-2: Wer nur das
 * Tagebuch las, sah zwei Nachrichten „E 2" und eine „E 3" ohne Zusammenhang).
 * Berichtigungen heißen als solche: „Nachweisnummer berichtigt (E 2 → E 3)",
 * „zurückgezogen, Grund: …", „nachgesichtet (zweite Sichtung)".
 */

import type { EingehendesEreignis } from "../fold.js";
import { datumZeitGruppe } from "../zeit/datumZeitGruppe.js";
import type { NachrichtZustand } from "../zustand-nachricht.js";
import { parametersatz } from "./tagebuch-nachrichtenparameter.js";
import type { Zustand } from "../zustand.js";

const STELLE_WORT: Readonly<Record<string, string>> = {
  LEITER: "Leiter",
  FACHBERATER: "Fachberater",
  VERBINDUNGSSTELLE: "Verbindungsstelle",
  SICHTER: "Sichter",
  FMZ: "FmZ",
  LDF: "LdF",
  FM1: "Fm1",
  FM2: "Fm2",
  FM3: "Fm3",
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
  /** Additiv (R2-ETB P2-5): der Vorrang, damit ein Blitz in der Zeile auffällt. */
  readonly vorrang?: unknown;
  readonly richtung?: unknown;
  readonly gespraechsnotiz?: unknown;
  readonly nummer?: unknown;
  readonly absender?: unknown;
  readonly anschrift?: unknown;
  readonly betreff?: unknown;
}

/**
 * Was eine Zeile über den Verlauf ihrer Nachricht bis zu ihrem Ereignis
 * weiß (ETB P0-2) — nur, wenn der Aufrufer die Ereignisse in HLC-Ordnung
 * durchgegangen ist. Ohne ihn gilt der Zustand heute.
 */
export interface Zeitstand {
  /** Die Nummer der Nachweisung, die zur Zeit des Ereignisses galt; fehlt = keine. */
  readonly nummer?: number;
  /** Hatte die Nachricht vor diesem Ereignis schon eine Sichtung? */
  readonly sichtungVorher: boolean;
}

/** „E 26" oder „A" — Richtung und, wenn vergeben, Nummer. */
export function nummernkurz(richtung: unknown, nummer: unknown): string {
  const kurz = richtung === "AUSGANG" ? "A" : "E";
  return typeof nummer === "number" ? `${kurz} ${String(nummer)}` : kurz;
}

/** „Nachricht E 26" oder „Gesprächsnotiz A" — ohne Nummer, solange keine vergeben ist. */
function kennung(kopf: Kopf): string {
  const wort = kopf.gespraechsnotiz === true ? "Gesprächsnotiz" : "Nachricht";
  // R2-ETB P2-5: „Blitz-Nachricht E 8“ — ein Blitz stand im Tagebuch wie jede andere Zeile.
  const vorrang = kopf.vorrang === "BLITZ" ? "Blitz-" : kopf.vorrang === "SOFORT" ? "Sofort-" : "";
  return `${vorrang}${wort} ${nummernkurz(kopf.richtung, kopf.nummer)}`;
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
    vorrang: anlage?.["vorrang"] ?? nachricht?.vorrang?.wert,
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
  const aufnahme = objekt(n["aufnahme"]);
  if (aufnahme === undefined) return "erfasst";
  // R2-ETB P2-5: Mittel und Gegenstelle schon bei der Aufnahme, nicht erst beim Befördern.
  const mittel = text(aufnahme["mittel"]);
  const gegen = text(n["gegenstelle"]);
  return `aufgenommen${klammer([mittel === undefined ? "" : mittelWort(mittel), gegen === undefined ? "" : `von ${gegen}`])}`;
}

/** R2-ETB P2-5: der Vermerk des Sichters im Satz; die Kopien nach Beförderung tragen ihn schon im Wort. */
function sichtervermerk(e: EingehendesEreignis): string {
  const vermerk = text(objekt(e.neu)?.["vermerke"])?.trim();
  return vermerk === undefined || vermerk === "" || istKopienNachBefoerderung(e) ? "" : `, Vermerk „${vermerk}“`;
}

/** R2-LdF P2-1, P2-2: die Wegmarken, die der Worker beim Befördern in die Nutzlast schreibt. */
function wegmarke(e: EingehendesEreignis): string {
  const n = nutzlast(e);
  const abweichung = text(n["abweichungVomVorschlag"]);
  if (abweichung !== undefined) return `, abweichend vom Vorschlag (${abweichung})`;
  return n["ohneVorschlag"] === true ? ", ohne Vorschlag des LdF" : "";
}

/** FM P2-7: „Aufnahme berichtigt (Funk 1705 → Telefon 1750, Hz. Fm)“. */
function aufnahmeberichtigung(e: EingehendesEreignis): string {
  const teil = (wert: unknown): string => {
    const o = objekt(wert);
    const mittel = text(o?.["mittel"]);
    const zeit = text(o?.["zeitpunkt"]);
    return [mittel === undefined ? "" : mittelWort(mittel), zeit === undefined ? "" : datumZeitGruppe(zeit).slice(2, 6)].filter((t) => t !== "").join(" ");
  };
  if (e.neu === null || e.neu === undefined) return "Aufnahmevermerk gelöscht";
  const vorher = "vorher" in e ? teil(e.vorher) : "";
  const wechsel = vorher === "" ? teil(e.neu) : `${vorher} → ${teil(e.neu)}`;
  return `Aufnahme berichtigt${klammer([wechsel, handzeichenteil(e.neu)])}`;
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
  const mittel = text(objekt(neu)?.["mittel"]);
  const gegen = text(objekt(neu)?.["gegenstelle"]);
  return klammer([mittel === undefined ? "" : mittelWort(mittel), gegen === undefined ? "" : `an ${gegen}`, handzeichenteil(neu)]);
}

/**
 * „an Fm2 zugeteilt (Funk, an OV …, Hz. Lf)“ (2026-11-21): Der Vorschlag des
 * LdF ist die Zuteilung an einen Fernmelder. Vorher stand „Übermittlung
 * vorgeschlagen (durch Fm2 …)“, das las sich, als habe Fm2 vorgeschlagen.
 */
function zuteilungssatz(neu: unknown): string {
  const fm = text(objekt(neu)?.["fernmelder"]);
  return `${fm === undefined ? "Übermittlung vorgeschlagen" : `an ${fm} zugeteilt`}${vorschlagsteil(neu)}`;
}

/**
 * Der Grund an den Schritten, die der Worker nach der Ersatzregel für einen
 * fehlenden LdF schreibt (2026-11-21): Zuteilung und Weitergabe, die kein
 * LdF getan hat. Ohne ihn lasen sie sich wie Schritte eines LdF.
 */
export const GRUND_ERSATZ_LDF = "Kein LdF besetzt: Ersatzregel";

function ersatzLdfTeil(e: EingehendesEreignis): string {
  return e.grund === GRUND_ERSATZ_LDF ? ", Ersatzregel: kein LdF besetzt" : "";
}

/**
 * Der Grund, den der Worker an die Sichtung des Ersatzsichters schreibt
 * (§5 „Ersatzsichter"): Ohne ihn sähe das Tagebuch eine Sichtung der FmZ
 * wie die eines Sichters, und wer nachliest, wüsste nicht, dass kein Sichter
 * besetzt war. Ein Rahmenfeld und kein Feld der Nutzlast, damit das Schema
 * der Sichtung und ältere Fassungen unberührt bleiben.
 */
export const GRUND_ERSATZSICHTER = "Kein Sichter besetzt: Ersatzsichter";

/**
 * Additiv (R2-FM P2-5, R2-Si P2-2): Der Sichter war besetzt, die Nachricht lag
 * aber länger als die Schwelle ihres Vorrangs vor ihm; die FmZ oder der LdF
 * hat selbst gesichtet. Das Tagebuch nennt die Sichtung wie die des Ersatzsichters.
 */
export const GRUND_SICHTER_SAEUMIG = "Sichter besetzt, Schwelle überschritten: Ersatzsichter";

/** Eine Sichtung nach der Ersatzregel — ohne Sichter oder an einem säumigen vorbei. */
export function istErsatzsichtung(e: Pick<EingehendesEreignis, "grund">): boolean {
  return e.grund === GRUND_ERSATZSICHTER || e.grund === GRUND_SICHTER_SAEUMIG;
}

function ersatz(e: EingehendesEreignis): boolean {
  return istErsatzsichtung(e);
}

/**
 * Der Grund an der Sichtung, die der Worker nach der Beförderung eines
 * Ausgangs schreibt (Folie 30; R2-ETB P1-1, R2-SGL P3-4): Sie ist keine
 * Sichtung eines Sichters, sondern die rote und grüne Kopie, die die FmZ
 * verteilt. Ohne ihn stand im Tagebuch „gesichtet … Akteur Sichter · Fm“.
 */
export const GRUND_KOPIEN = "Kopien nach Beförderung";

/** Kopien nach der Beförderung — am Grund, bei älteren Ereignissen am Vermerk, den der Worker schrieb. */
export function istKopienNachBefoerderung(e: EingehendesEreignis): boolean {
  if (e.typ !== "NachrichtGesichtet") return false;
  if (e.grund === GRUND_KOPIEN) return true;
  return e.grund === undefined && text(objekt(e.neu)?.["vermerke"])?.startsWith(GRUND_KOPIEN) === true;
}

/**
 * Der Grund an Ereignissen eines Papier-Nachtrags (R2-SGL P1-2, R2-ETB
 * P1-1): Sie tragen Zeiten und Handzeichen vom Blatt; wer sie eingegeben hat,
 * nennt die Stelle der Sitzung in der Nutzlast. Klein geschrieben, damit der
 * Satz ihn wörtlich enthält und der Druck ihn nicht zweimal nennt.
 */
export const GRUND_NACHTRAG = "vom Papier nachgetragen";

/** „, vom Papier nachgetragen durch S3“ — leer, wenn das Ereignis kein Nachtrag ist. */
function nachtragsteil(e: EingehendesEreignis): string {
  if (e.grund?.startsWith(GRUND_NACHTRAG) !== true) return "";
  const stelle = text(nutzlast(e)["stelle"]);
  return `, ${GRUND_NACHTRAG}${stelle === undefined ? "" : ` durch ${stellenWort(stelle)}`}`;
}

function sichtungswort(e: EingehendesEreignis): string {
  if (istKopienNachBefoerderung(e)) return "Kopien nach Beförderung";
  return ersatz(e) ? "als Ersatzsichter gesichtet" : "gesichtet";
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
  NachrichtUebermittlungVorgeschlagen: (e) => vermerk((neu) => `${zuteilungssatz(neu)}${ersatzLdfTeil(e)}`, "Zuteilung gelöscht")(e),
  NachrichtBefoerdert: (e) => vermerk((neu) => `befördert${befoerderungsteil(neu)}${wegmarke(e)}`, "Beförderungsvermerk gelöscht")(e),
  NachrichtAufnahmeBerichtigt: aufnahmeberichtigung,
  NachrichtNachgewiesen: vermerk((neu) => `nachgewiesen${klammer([handzeichenteil(neu)])}`, "Nachweis gelöscht"),
  NachrichtWeitergegeben: (e) => vermerk((neu) => `an den Sichter weitergegeben${klammer([handzeichenteil(neu)])}${ersatzLdfTeil(e)}`, "Weitergabe gelöscht")(e),
  NachrichtGesichtet: (e) =>
    vermerk(
      (neu) => `${sichtungswort(e)}${klammer([handzeichenteil(neu)])}, ${verteilerteil(neu)}${sichtervermerk(e)}`,
      "Sichtung gelöscht",
    )(e),
  NachrichtVermerkt: (e) => (text(e.neu) === undefined ? "Vermerk gelöscht" : `Vermerk „${String(e.neu)}“`),
  NachrichtKenntnisGenommen: (e) => `von ${stelleAus(e)} zur Kenntnis genommen${klammer([handzeichenteil(e.neu)])}`,
  // ETB P1-7: das Handzeichen der Sitzung aus der Nutzlast, wo der Worker es schreibt.
  NachrichtErledigt: (e) => `für ${stelleAus(e)} erledigt${klammer([handzeichenteil(nutzlast(e))])}`,
  ErledigungDerNachrichtZurueckgenommen: (e) => `Erledigung für ${stelleAus(e)} zurückgenommen${klammer([handzeichenteil(nutzlast(e))])}`,
  NachrichtZurueckgezogen: () => "zurückgezogen",
};

/** Die Arten dieses Moduls — `klartextsatz` reicht nur sie weiter. */
export const NACHRICHTENARTEN: ReadonlySet<string> = new Set(Object.keys(VORGANG));

function vorgangDes(ereignis: EingehendesEreignis): string {
  return VORGANG[ereignis.typ]?.(ereignis) ?? ereignis.typ;
}

/**
 * Der Satz für die Arten der Nachrichten; `undefined` für jede andere Art.
 *
 * @param betreff „Name: Vorgang“, wie `tagebuchsatz` ihn bildet — gebraucht
 *   nur vom Parameter des Einsatzes; die Nachricht nennt sich selbst.
 */
export function nachrichtensatz(
  zustand: Zustand,
  ereignis: EingehendesEreignis,
  betreff: string,
  zeitstand?: Zeitstand,
): string | undefined {
  if (ereignis.typ === "NachrichtenParameterGesetzt") return parametersatz(ereignis, betreff);
  if (!NACHRICHTENARTEN.has(ereignis.typ)) return undefined;
  const heute = kopfAus(zustand, ereignis);
  // Die Nummer zur Zeit des Ereignisses, wo der Verlauf bekannt ist (ETB P0-2).
  const kopf = zeitstand === undefined ? heute : { ...heute, nummer: zeitstand.nummer };
  const jetzt = zeitstand !== undefined && typeof heute.nummer === "number" && heute.nummer !== zeitstand.nummer ? ` (jetzt ${nummernkurz(heute.richtung, heute.nummer)})` : "";
  if (ereignis.typ === "NachrichtNachgewiesen") {
    const nummer = objekt(ereignis.neu)?.["nummer"];
    if (typeof nummer === "number") return `${kennung({ ...kopf, nummer })}${jetzt} ${nachweisvorgang(ereignis, heute.richtung)}${nachtragsteil(ereignis)}: ${inhaltsteil(kopf)}`;
  }
  return `${kennung(kopf)}${jetzt} ${besondererVorgang(zustand, ereignis, zeitstand) ?? vorgangDes(ereignis)}${nachtragsteil(ereignis)}: ${inhaltsteil(kopf)}`;
}

/** „nachgewiesen (Hz. FM)" oder „Nachweisnummer berichtigt (E 2 → E 3, Hz. FM)" aus `vorher`/`neu`. */
function nachweisvorgang(ereignis: EingehendesEreignis, richtung: unknown): string {
  const alt = objekt("vorher" in ereignis ? ereignis.vorher : undefined)?.["nummer"];
  const neu = objekt(ereignis.neu)?.["nummer"];
  if (ereignis.undoOf !== undefined || typeof alt !== "number" || alt === neu) return vorgangDes(ereignis);
  const wechsel = `${nummernkurz(richtung, alt)} → ${nummernkurz(richtung, neu)}`;
  return `Nachweisnummer berichtigt${klammer([wechsel, handzeichenteil(ereignis.neu)])}`;
}

/**
 * Die Vorgänge, die eine Berichtigung oder Rücknahme sind (ETB P0-2):
 * Zurückziehen mit Grund und den Angaben der zurückgezogenen Nachricht
 * (ETB P0-1: welche von zwei gleichlautenden), die zweite Sichtung.
 */
function besondererVorgang(zustand: Zustand, ereignis: EingehendesEreignis, zeitstand: Zeitstand | undefined): string | undefined {
  if (ereignis.typ === "NachrichtZurueckgezogen") return zurueckziehvorgang(zustand, ereignis);
  if (ereignis.typ !== "NachrichtGesichtet" || ereignis.undoOf !== undefined || ereignis.neu === null || ereignis.neu === undefined) return undefined;
  const nachsichtung = objekt("vorher" in ereignis ? ereignis.vorher : undefined) !== undefined;
  if (!nachsichtung && zeitstand?.sichtungVorher !== true) return undefined;
  const wort = nachsichtung ? "nachgesichtet" : "ein zweites Mal gesichtet";
  return `${wort}${klammer(["zweite Sichtung", handzeichenteil(ereignis.neu)])}, ${verteilerteil(ereignis.neu)}${sichtervermerk(ereignis)}`;
}

function zurueckziehvorgang(zustand: Zustand, ereignis: EingehendesEreignis): string {
  const nachricht = zustand.nachrichten?.[text(nutzlast(ereignis)["nachrichtId"]) ?? ""];
  const abfassung = text(nachricht?.abfassungszeit?.wert);
  const zeichen = text(nachricht?.zeichen?.wert);
  const angaben = klammer([abfassung === undefined ? "" : `abgefasst ${datumZeitGruppe(abfassung)}`, zeichen === undefined ? "" : `Zeichen ${zeichen}`]);
  const grund = text(ereignis.grund);
  // ETB P1-7: wer zurückgezogen hat — Handzeichen der Sitzung aus der Nutzlast.
  const hz = handzeichenteil(nutzlast(ereignis));
  return `zurückgezogen${hz === "" ? "" : ` (${hz})`}${grund === undefined ? "" : `, Grund: „${grund}“`}${angaben}`;
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
