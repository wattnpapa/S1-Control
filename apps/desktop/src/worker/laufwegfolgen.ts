/**
 * Folgeschritte am Laufweg nach LdF und Beförderung (bestätigt am
 * 2026-11-17, KONZEPT-NACHRICHTEN.md §5) — ein Teil von
 * `planeNachrichtenfolgen` in `nachrichtenfolgen.ts`.
 *
 * - **Ersatzregel LdF beim Eingang**: Führt der Einsatz den LdF als Station
 *   (`ldfStation`) und steht in der Präsenz keiner, entfällt die Weitergabe:
 *   Auf das Aufnehmen folgt `NachrichtWeitergegeben` mit Zeit und
 *   Handzeichen der Aufnahme, und die Nachricht läuft direkt zum Sichter.
 *   Verteilt die FmZ im selben Zug (Ersatzsichter), braucht es keine
 *   Weitergabe — die Sichtung schlägt sie im Laufzustand.
 * - **Ersatzregel LdF beim Ausgang**: Befördert der Fernmelder ohne
 *   Übermittlungsvorschlag und ohne LdF in der Präsenz, gilt sein Vermerk
 *   als Vorschlag (`NachrichtUebermittlungVorgeschlagen` mit Mittel,
 *   Gegenstelle und seinem Handzeichen als Fernmelder und Zeichen). Ist ein
 *   LdF da, wird nichts nachgetragen, aber der Hinweis sagt es.
 * - **Kopien nach der Beförderung** (Folie 30): Die rote Kopie geht an S2,
 *   die grüne an die Stelle des Verfassers. Auf `NachrichtBefoerdert` eines
 *   Ausgangs ohne Sichtung folgt `NachrichtGesichtet` mit diesem Verteiler,
 *   damit der Ausgang im Posteingang beider Stellen steht und als VERTEILT
 *   bis zur Erledigung läuft. S2 wird auch eingetragen, wenn niemand die
 *   Stelle besetzt — die Kopie wartet im Fach. Mit `sichtungAuchAusgang`
 *   entfällt der Schritt: Dann verteilt der Sichter.
 * - **Mit LdF als Station** (geändert 2026-11-21, FOLD_VERSION 16): Der
 *   beförderte Ausgang geht zurück zum LdF, der die Nachweisung einträgt und
 *   an den Sichter weitergibt; der Sichter verteilt S2 rot und den Verfasser
 *   grün. Die Kopien schreibt der Worker dann nicht mehr. Ist kein LdF
 *   besetzt, folgt auf die Beförderung die Weitergabe (Ersatzregel); ist
 *   auch kein Sichter besetzt, folgen die Kopien als Ersatzsichtung — nach
 *   der Weitergabe des LdF ebenso ({@link planeKopienNachWeitergabe}).
 */

import { eigeneFernmelder, ldfStationAn, projektion, type NachrichtZustand, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

/** Ein geplanter Folgeschritt mit dem Satz für den Bediener. */
export interface Laufwegfolge {
  readonly entwurf: Ereignisentwurf;
  readonly hinweis: string;
}

export interface Laufwegplan {
  readonly folgen: readonly Laufwegfolge[];
  readonly hinweise: readonly string[];
}

/** Was der Worker über die Präsenz weiß; fehlt eine Angabe, gilt „nicht besetzt". */
export interface Laufwegumfeld {
  readonly ldfBesetzt?: boolean;
  readonly s2Besetzt?: boolean;
  /** Additiv (2026-11-21): Ist ein Sichter besetzt? Fehlt = nein. */
  readonly sichterBesetzt?: boolean;
  /** Additiv (2026-11-21): die Stellen der Sitzung — der Ersatzvorschlag nennt den eigenen Fernmelder („Fm2“). */
  readonly stellen?: readonly string[];
}

export const HINWEIS_ERSATZ_LDF_EINGANG = "Kein LdF besetzt: Nachricht direkt an den Sichter weitergegeben.";
export const HINWEIS_ERSATZ_LDF_AUSGANG = "Kein LdF besetzt: Die Beförderung gilt als Übermittlungsvorschlag.";
export const HINWEIS_OHNE_VORSCHLAG = "Befördert, bevor der LdF einen Fernmelder zugeteilt hat.";
export const HINWEIS_ZURUECK_ZUM_LDF = "Befördert: Die Nachricht liegt jetzt beim LdF zur Nachweisung und Weitergabe an den Sichter.";
export const HINWEIS_ERSATZ_LDF_NACH_BEFOERDERUNG = "Kein LdF besetzt: Nachricht nach der Beförderung direkt an den Sichter weitergegeben.";
export const HINWEIS_LDF_VERTEILT_AUSGANG = "Kein Sichter besetzt: Der LdF hat S2 rot und den Verfasser grün verteilt.";

type Werte = Record<string, unknown>;

function objekt(wert: unknown): Werte | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Werte) : undefined;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() !== "" ? wert.trim() : undefined;
}

function ldfStation(zustand: Zustand): boolean {
  return ldfStationAn(zustand);
}

/** Mittel, Zeit und Handzeichen aus einem Vermerk — oder nichts, wenn er unvollständig ist. */
function vermerkAus(wert: unknown): { mittel: string; zeitpunkt: string; handzeichen: string; gegenstelle?: string } | undefined {
  const o = objekt(wert);
  const zeitpunkt = text(o?.["zeitpunkt"]);
  if (o === undefined || zeitpunkt === undefined) return undefined;
  const gegenstelle = text(o["gegenstelle"]);
  return {
    mittel: text(o["mittel"]) ?? "",
    zeitpunkt,
    handzeichen: typeof o["handzeichen"] === "string" ? o["handzeichen"].trim() : "",
    ...(gegenstelle === undefined ? {} : { gegenstelle }),
  };
}

/** Eingang über die FmZ, LdF als Station, aber keiner besetzt, und niemand verteilt im selben Zug. */
export function planeWeitergabeErsatz(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Laufwegumfeld, verteiltSofort: boolean): Laufwegfolge | undefined {
  const n = objekt(entwurf.nutzlast) ?? {};
  const aufnahme = vermerkAus(n["aufnahme"]);
  const nachrichtId = n["nachrichtId"];
  if (typeof nachrichtId !== "string" || aufnahme === undefined || verteiltSofort) return undefined;
  if (n["richtung"] !== "EINGANG" || n["gespraechsnotiz"] === true || !ldfStation(zustand) || umfeld.ldfBesetzt === true) return undefined;
  return {
    entwurf: { typ: "NachrichtWeitergegeben", nutzlast: { nachrichtId }, vorher: null, neu: { zeitpunkt: aufnahme.zeitpunkt, handzeichen: aufnahme.handzeichen }, grund: projektion.GRUND_ERSATZ_LDF },
    hinweis: HINWEIS_ERSATZ_LDF_EINGANG,
  };
}

/**
 * Die Stelle des Verfassers für die grüne Kopie: die Funktion der Anlage,
 * wenn sie eine bekannte Stelle ist (als Kennung oder als Wort, „Leiter"),
 * sonst der Absender als freier Name. Ein Schrägstrich würde den Feldpfad
 * `kenntnis/<stelle>` zerlegen und wird deshalb ersetzt.
 */
export function verfasserstelle(nachricht: Pick<NachrichtZustand, "funktion" | "absender">): string | undefined {
  // Die Regel steht seit R2-FaBe P1-4 in Ring 2: Auch die Projektion braucht sie (eigene Kopie gilt als gelesen).
  return projektion.verfasserstelleAus(nachricht.funktion?.wert, nachricht.absender.wert);
}

/** „Kopien nach Beförderung: rot S2, grün S4". */
export function kopienvermerk(stelle: string | undefined): string {
  const gruen = stelle === undefined || stelle === "S2" ? "" : `, grün ${projektion.stellenWort(stelle)}`;
  return `Kopien nach Beförderung: rot S2${gruen}`;
}

function planeKopien(zustand: Zustand, nachricht: NachrichtZustand, befoerderung: { zeitpunkt: string; handzeichen: string }, umfeld: Laufwegumfeld): Laufwegfolge | undefined {
  if (zustand.einsatz?.sichtungAuchAusgang?.wert === true || objekt(nachricht.sichtung?.wert) !== undefined) return undefined;
  return kopienfolge(nachricht, befoerderung, umfeld);
}

/** Ein beförderter, ungesichteter Ausgang, der beim LdF oder vor dem Sichter auf seine Kopien wartet. */
function wartetAufKopien(n: NachrichtZustand): boolean {
  if (n.entfernt?.wert === true || n.richtung.wert !== "AUSGANG" || n.gespraechsnotiz?.wert === true) return false;
  return objekt(n.befoerderung?.wert) !== undefined && objekt(n.sichtung?.wert) === undefined;
}

/**
 * „LdF als Station“ wird abgeschaltet (Review 2026-11-21, P1): Ausgänge, die
 * beim LdF oder vor dem Sichter auf ihre Kopien warten, gingen sonst still
 * auf ERLEDIGT, und S2 und der Verfasser bekämen nichts. Ihre Kopien folgen
 * dem Abschalten, mit Zeit und Handzeichen der Beförderung — außer mit
 * `sichtungAuchAusgang`, dann verteilt weiter der Sichter.
 */
export function planeKopienBeimAbschalten(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Laufwegumfeld): Laufwegplan {
  const feld = objekt(entwurf.nutzlast)?.["feld"];
  if (entwurf.typ !== "NachrichtenParameterGesetzt" || entwurf.neu !== false) return { folgen: [], hinweise: [] };
  const sichtungAuch = zustand.einsatz?.sichtungAuchAusgang?.wert === true;
  // LdF als Station aus: Was beim LdF oder vor dem Sichter wartet, ginge auf ERLEDIGT — außer mit „Ausgänge zum Sichter“.
  const ldfAus = feld === "ldfStation" && ldfStation(zustand) && !sichtungAuch;
  // Review Runde 2: „Ausgänge zum Sichter“ aus ohne LdF: Was vor dem Sichter wartet, ginge ebenso auf ERLEDIGT.
  const sichterAus = feld === "sichtungAuchAusgang" && sichtungAuch && !ldfStation(zustand);
  if (!ldfAus && !sichterAus) return { folgen: [], hinweise: [] };
  const folgen = Object.values(zustand.nachrichten ?? {})
    .filter(wartetAufKopien)
    .flatMap((n) => {
      // Review Runde 2: Zeit und Handzeichen der Weitergabe, sonst der Beförderung — die Kopien folgen dem letzten Schritt.
      const vermerk = vermerkAus(n.weitergabe?.wert) ?? vermerkAus(n.befoerderung?.wert);
      return vermerk === undefined ? [] : [kopienfolge(n, vermerk, umfeld)];
    });
  const was = ldfAus ? "LdF als Station" : "„Ausgänge zum Sichter“";
  return { folgen, hinweise: folgen.length === 0 ? [] : [`${was} abgeschaltet: Kopien für ${String(folgen.length)} beförderte Ausgänge an S2 und den Verfasser verteilt.`] };
}

/**
 * Die Kopien nach der Weitergabe des LdF, wenn kein Sichter besetzt ist
 * (2026-11-21): Der LdF ist Ersatzsichter und verteilt S2 rot und den
 * Verfasser grün; mit Sichter verteilt der Sichter selbst.
 */
export function planeKopienNachWeitergabe(zustand: Zustand, nachrichtId: string, weitergabe: unknown, umfeld: Laufwegumfeld): Laufwegfolge | undefined {
  const nachricht = zustand.nachrichten?.[nachrichtId];
  const vermerk = vermerkAus(weitergabe);
  if (nachricht === undefined || vermerk === undefined || umfeld.sichterBesetzt === true) return undefined;
  if (nachricht.richtung.wert !== "AUSGANG" || nachricht.gespraechsnotiz?.wert === true || objekt(nachricht.sichtung?.wert) !== undefined) return undefined;
  // Review 2026-11-21: Der LdF verteilt hier als Ersatzsichter — so steht es im Tagebuch, nicht als „Kopien nach Beförderung“.
  const folge = kopienfolge(nachricht, vermerk, umfeld, projektion.GRUND_ERSATZSICHTER);
  return { ...folge, hinweis: `${HINWEIS_LDF_VERTEILT_AUSGANG}${fachhinweis(umfeld)}` };
}

function fachhinweis(umfeld: Laufwegumfeld): string {
  return umfeld.s2Besetzt === true ? "" : " S2 ist nicht besetzt; die rote Kopie wartet im Fach.";
}

function kopienfolge(nachricht: NachrichtZustand, befoerderung: { zeitpunkt: string; handzeichen: string }, umfeld: Laufwegumfeld, grund: string = projektion.GRUND_KOPIEN): Laufwegfolge {
  const stelle = verfasserstelle(nachricht);
  const verteiler = [{ stelle: "S2", kopie: "ROT" }, ...(stelle === undefined || stelle === "S2" ? [] : [{ stelle, kopie: "GRUEN" }])];
  const vermerke = kopienvermerk(stelle);
  const fach = fachhinweis(umfeld);
  return {
    entwurf: {
      typ: "NachrichtGesichtet",
      nutzlast: { nachrichtId: nachricht.id },
      vorher: null,
      neu: { zeitpunkt: befoerderung.zeitpunkt, handzeichen: befoerderung.handzeichen, verteiler, vermerke },
      // R2-ETB P1-1, R2-SGL P3-4: Das Tagebuch nennt die Zeile „Kopien nach Beförderung“ und die FmZ, nicht einen Sichter.
      grund,
    },
    hinweis: `${vermerke}.${fach}`,
  };
}

/** Die Folgen einer Beförderung: Ersatzvorschlag ohne LdF und die Kopien an S2 und den Verfasser. */
export function planeBefoerderungsfolgen(zustand: Zustand, entwurf: Ereignisentwurf, umfeld: Laufwegumfeld): Laufwegplan {
  const nachrichtId = objekt(entwurf.nutzlast)?.["nachrichtId"];
  const befoerderung = vermerkAus(entwurf.neu);
  const nachricht = typeof nachrichtId === "string" ? zustand.nachrichten?.[nachrichtId] : undefined;
  const leer: Laufwegplan = { folgen: [], hinweise: [] };
  if (nachricht === undefined || befoerderung === undefined || nachricht.entfernt?.wert === true) return leer;
  if (nachricht.richtung.wert !== "AUSGANG" || nachricht.gespraechsnotiz?.wert === true) return leer;
  // Review 2026-11-21: Eine Berichtigung der Beförderung (mit Vorher-Wert) zieht keine zweite Weitergabe und keine Kopien nach sich.
  if (entwurf.vorher !== undefined && entwurf.vorher !== null) return leer;
  const folgen: Laufwegfolge[] = [];
  const hinweise: string[] = [];
  if (ldfStation(zustand) && objekt(nachricht.vorschlag?.wert) === undefined) {
    if (umfeld.ldfBesetzt === true) hinweise.push(HINWEIS_OHNE_VORSCHLAG);
    else {
      // Der Fernmelder ist hier zugleich, wer vorschlägt: sein Name („Fm2“), sonst sein Handzeichen.
      const neu = { mittel: befoerderung.mittel, fernmelder: eigeneFernmelder(umfeld.stellen)[0] ?? befoerderung.handzeichen, zeitpunkt: befoerderung.zeitpunkt, handzeichen: befoerderung.handzeichen, ...(befoerderung.gegenstelle === undefined ? {} : { gegenstelle: befoerderung.gegenstelle }) };
      folgen.push({
        entwurf: { typ: "NachrichtUebermittlungVorgeschlagen", nutzlast: { nachrichtId: nachricht.id }, vorher: null, neu, grund: projektion.GRUND_ERSATZ_LDF },
        hinweis: HINWEIS_ERSATZ_LDF_AUSGANG,
      });
    }
  }
  if (ldfStation(zustand) && zustand.einsatz?.sichtungAuchAusgang?.wert !== true) {
    folgen.push(...weitergabeNachBefoerderung(nachricht, befoerderung, umfeld));
    if (umfeld.ldfBesetzt === true) hinweise.push(HINWEIS_ZURUECK_ZUM_LDF);
    return { folgen, hinweise };
  }
  const kopien = planeKopien(zustand, nachricht, befoerderung, umfeld);
  if (kopien !== undefined) folgen.push(kopien);
  return { folgen, hinweise };
}

/** Ohne LdF in der Präsenz: die Weitergabe mit Zeit und Handzeichen der Beförderung, ohne Sichter dazu die Kopien. */
function weitergabeNachBefoerderung(nachricht: NachrichtZustand, befoerderung: { zeitpunkt: string; handzeichen: string }, umfeld: Laufwegumfeld): readonly Laufwegfolge[] {
  if (umfeld.ldfBesetzt === true || objekt(nachricht.sichtung?.wert) !== undefined) return [];
  const weitergabe: Laufwegfolge = {
    entwurf: { typ: "NachrichtWeitergegeben", nutzlast: { nachrichtId: nachricht.id }, vorher: null, neu: { zeitpunkt: befoerderung.zeitpunkt, handzeichen: befoerderung.handzeichen }, grund: projektion.GRUND_ERSATZ_LDF },
    hinweis: HINWEIS_ERSATZ_LDF_NACH_BEFOERDERUNG,
  };
  return umfeld.sichterBesetzt === true ? [weitergabe] : [weitergabe, kopienfolge(nachricht, befoerderung, umfeld)];
}
