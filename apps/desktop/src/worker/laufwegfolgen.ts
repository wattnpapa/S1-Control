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
 */

import { NACHRICHT_STELLEN, projektion, type NachrichtZustand, type Zustand } from "@s1/domaene";
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
}

export const HINWEIS_ERSATZ_LDF_EINGANG = "Kein LdF besetzt: Nachricht direkt an den Sichter weitergegeben.";
export const HINWEIS_ERSATZ_LDF_AUSGANG = "Kein LdF besetzt: Die Beförderung gilt als Übermittlungsvorschlag.";
export const HINWEIS_OHNE_VORSCHLAG = "Befördert, bevor der LdF die Übermittlung vorgeschlagen hat.";

type Werte = Record<string, unknown>;

function objekt(wert: unknown): Werte | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Werte) : undefined;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() !== "" ? wert.trim() : undefined;
}

function ldfStation(zustand: Zustand): boolean {
  return zustand.einsatz?.ldfStation?.wert === true;
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
    entwurf: { typ: "NachrichtWeitergegeben", nutzlast: { nachrichtId }, vorher: null, neu: { zeitpunkt: aufnahme.zeitpunkt, handzeichen: aufnahme.handzeichen } },
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
  const funktion = text(nachricht.funktion?.wert);
  if (funktion !== undefined) {
    const bekannt = NACHRICHT_STELLEN.find((s) => s === funktion.toUpperCase() || projektion.stellenWort(s).toLowerCase() === funktion.toLowerCase());
    if (bekannt !== undefined) return bekannt;
  }
  const frei = text(nachricht.absender.wert)?.replaceAll("/", "-").slice(0, 80);
  return frei === undefined || frei === "" ? undefined : frei;
}

/** „Kopien nach Beförderung: rot S2, grün S4". */
export function kopienvermerk(stelle: string | undefined): string {
  const gruen = stelle === undefined || stelle === "S2" ? "" : `, grün ${projektion.stellenWort(stelle)}`;
  return `Kopien nach Beförderung: rot S2${gruen}`;
}

function planeKopien(zustand: Zustand, nachricht: NachrichtZustand, befoerderung: { zeitpunkt: string; handzeichen: string }, umfeld: Laufwegumfeld): Laufwegfolge | undefined {
  if (zustand.einsatz?.sichtungAuchAusgang?.wert === true || objekt(nachricht.sichtung?.wert) !== undefined) return undefined;
  const stelle = verfasserstelle(nachricht);
  const verteiler = [{ stelle: "S2", kopie: "ROT" }, ...(stelle === undefined || stelle === "S2" ? [] : [{ stelle, kopie: "GRUEN" }])];
  const vermerke = kopienvermerk(stelle);
  const fach = umfeld.s2Besetzt === true ? "" : " S2 ist nicht besetzt; die rote Kopie wartet im Fach.";
  return {
    entwurf: {
      typ: "NachrichtGesichtet",
      nutzlast: { nachrichtId: nachricht.id },
      vorher: null,
      neu: { zeitpunkt: befoerderung.zeitpunkt, handzeichen: befoerderung.handzeichen, verteiler, vermerke },
      // R2-ETB P1-1, R2-SGL P3-4: Das Tagebuch nennt die Zeile „Kopien nach Beförderung“ und die FmZ, nicht einen Sichter.
      grund: projektion.GRUND_KOPIEN,
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
  const folgen: Laufwegfolge[] = [];
  const hinweise: string[] = [];
  if (ldfStation(zustand) && objekt(nachricht.vorschlag?.wert) === undefined) {
    if (umfeld.ldfBesetzt === true) hinweise.push(HINWEIS_OHNE_VORSCHLAG);
    else {
      // Der Fernmelder ist hier zugleich, wer vorschlägt: sein Handzeichen steht für beides.
      const neu = { mittel: befoerderung.mittel, fernmelder: befoerderung.handzeichen, zeitpunkt: befoerderung.zeitpunkt, handzeichen: befoerderung.handzeichen, ...(befoerderung.gegenstelle === undefined ? {} : { gegenstelle: befoerderung.gegenstelle }) };
      folgen.push({
        entwurf: { typ: "NachrichtUebermittlungVorgeschlagen", nutzlast: { nachrichtId: nachricht.id }, vorher: null, neu },
        hinweis: HINWEIS_ERSATZ_LDF_AUSGANG,
      });
    }
  }
  const kopien = planeKopien(zustand, nachricht, befoerderung, umfeld);
  if (kopien !== undefined) folgen.push(kopien);
  return { folgen, hinweise };
}
