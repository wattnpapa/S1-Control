/**
 * Ereignisrahmen und die fuenf Ereignisarten des Minimalfolds (M0.2).
 *
 * Rahmenfelder nach KONZEPT-SPEICHER.md §2.4, Identitaet und Laufnummer nach
 * §3.3 (Auflage 8), `vorher`/`neu` nach §2.5 (Auflage 6). Die fachlichen
 * Nutzlasten und die Konfliktregel je Typ stehen im Ereigniskatalog
 * `docs/v2-arbeitsstand/entwurf/zieldatenmodell-feldabgleich.md` §4.2.
 *
 * Bewusst nur fuenf Arten: der vollstaendige Katalog samt zod-Schemata,
 * Upcaster-Kette und Undo-Semantik ist M1.2 (`KONZEPT-EREIGNISSE.md`) und
 * M1.3. Hier steht genau so viel, dass die Eigenschaften P1 bis P6
 * aussagekraeftig werden.
 */

import type { Hlc } from "./hlc.js";

// ---------------------------------------------------------------------------
// Identitaet und Laufnummer (§3.3, Auflage 8)
// ---------------------------------------------------------------------------

/** `<clientId>:<laufnummer>` — global eindeutig ohne Koordination (§3.3). */
export type EreignisId = string;

/** Die Laufnummer beginnt je Client und Einsatz bei 1 (§3.3). */
export const ERSTE_LAUFNUMMER = 1;

/** Bildet die Ereignis-Identitaet aus Client und Laufnummer (§3.3). */
export function ereignisId(clientId: string, laufnummer: number): EreignisId {
  if (clientId.length === 0 || clientId.includes(":")) {
    throw new RangeError(`Unzulaessige clientId fuer eine Ereignis-Id: ${JSON.stringify(clientId)}`);
  }
  if (!Number.isInteger(laufnummer) || laufnummer < ERSTE_LAUFNUMMER) {
    throw new RangeError(`Laufnummer muss eine ganze Zahl ab ${ERSTE_LAUFNUMMER} sein: ${laufnummer}`);
  }
  return `${clientId}:${laufnummer}`;
}

/** Zerlegt eine Ereignis-Identitaet wieder in ihre beiden Bestandteile (§3.3). */
export function zerlegeEreignisId(id: EreignisId): { clientId: string; laufnummer: number } {
  const trenner = id.lastIndexOf(":");
  if (trenner <= 0) throw new SyntaxError(`Keine Ereignis-Id nach §3.3: ${JSON.stringify(id)}`);
  const clientId = id.slice(0, trenner);
  const laufnummer = Number(id.slice(trenner + 1));
  if (!Number.isInteger(laufnummer) || laufnummer < ERSTE_LAUFNUMMER) {
    throw new SyntaxError(`Keine Ereignis-Id nach §3.3: ${JSON.stringify(id)}`);
  }
  return { clientId, laufnummer };
}

/**
 * Die naechste Laufnummer eines Clients (§3.3).
 *
 * Streng monoton wachsend. Eine Luecke ist erlaubt — sie entsteht, wenn ein
 * Client zwischen dem dauerhaften Erhoehen und dem Schreiben der Zeile
 * abstuerzt. Ein Rueckschritt oder eine Doppelvergabe ist ein Fehler; das
 * Dauerhaftmachen leistet `schreiber.json` in `@s1/speicher` (§4.4).
 */
export function naechsteLaufnummer(letzte: number | undefined): number {
  if (letzte === undefined) return ERSTE_LAUFNUMMER;
  if (!Number.isInteger(letzte) || letzte < ERSTE_LAUFNUMMER) {
    throw new RangeError(`Unzulaessige letzte Laufnummer: ${letzte}`);
  }
  return letzte + 1;
}

/** Anzeigename und Rechnername des Bedieners; kein Rollen- und Rechtemodell (§2.4, Entscheidung 9). */
export interface Akteur {
  readonly benutzer: string;
  readonly host: string;
  readonly clientId: string;
}

// ---------------------------------------------------------------------------
// Rahmen (§2.4)
// ---------------------------------------------------------------------------

/**
 * Die Rahmenfelder, die die Speicherschicht kennt (§2.4).
 *
 * `vorher` und `neu` gehoeren nach §2.5 zum Rahmen, nicht zur Fachlogik: Die
 * Speicherschicht schreibt sie unveraendert mit und gibt sie unveraendert
 * heraus; ausgewertet werden sie allein hier im Fold. Der Ereigniskatalog
 * (§4.2) benennt dieselben beiden Werte bei `EinheitVerschoben` fachlich
 * `vonAbschnittId` und `nachAbschnittId` — gemeint ist derselbe gesehene
 * Vorher-Wert und derselbe neue Wert; welches Feld sie betreffen, entscheidet
 * der Fold je Ereignisart.
 */
export interface Rahmen<TVorher = never, TNeu = never> {
  readonly id: EreignisId;
  readonly hlc: Hlc;
  /** Kettenpruefsumme nach §2.3; fuer den Fold undurchsichtig, hier nur durchgereicht. */
  readonly vorgaenger?: string;
  /** Version des Ereignisrahmens; Upcaster-Kette in `KONZEPT-EREIGNISSE.md` (M1.2). */
  readonly schemaVersion: number;
  readonly typ: string;
  readonly akteur: Akteur;
  /** ISO-8601 mit Zeitzone. Nur Anzeige und Plausibilisierung, nie Ordnung (§3.1). */
  readonly wanduhr: string;
  /** Gesehener Vorher-Wert bei setzenden Ereignissen (§2.5, Auflage 6). */
  readonly vorher?: TVorher;
  /** Neuer Wert bei setzenden Ereignissen (§2.5). */
  readonly neu?: TNeu;
  /** Undo ist ein gewoehnliches Ereignis ohne Sonderpfad (§2.4, Auflage 11). */
  readonly undoOf?: EreignisId;
  /** Berichtigung eines fachlich falschen Eintrags; wie `undoOf` reines Rahmenfeld (§2.4). */
  readonly korrekturVon?: EreignisId;
  /** Freitext, geht ins Einsatztagebuch (Ereigniskatalog §4.1). */
  readonly grund?: string;
}

/** Der Rahmenanteil, der jedem Ereignis gemeinsam ist — ohne Typ und Nutzlast. */
export type RahmenAngaben = Omit<Rahmen, "typ" | "vorher" | "neu">;

/** Die aktuelle Version des Ereignisrahmens. */
export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// Fachliche Wertebereiche (Zieldatenmodell §2 und §3.2), auf M0.2 verkuerzt
// ---------------------------------------------------------------------------

/** Zieldatenmodell §2.4. `VORLAGEN` ist bewusst kein Abschnitt, sondern ein Katalog. */
export const ABSCHNITTSTYPEN = [
  "FUEHRUNGSSTELLE",
  "MELDEKOPF",
  "SONSTIGE_FUEHRUNG",
  "LOGISTIK",
  "ANGEFORDERT",
  "BEREITSTELLUNGSRAUM",
  "EINSATZORT",
  "ARCHIV",
] as const;
export type Abschnittstyp = (typeof ABSCHNITTSTYPEN)[number];

/** Zieldatenmodell §2.2 — die neun Statuswerte der Excel. */
export const EINHEIT_STATUS = [
  "RUFBEREITSCHAFT",
  "EINSATZVORBEHALT",
  "ANGEFORDERT",
  "ANMARSCH",
  "EINSATZBEREIT",
  "IM_EINSATZ",
  "RUHE",
  "NICHT_EINSATZBEREIT",
  "RUECKMARSCH",
] as const;
export type EinheitStatus = (typeof EINHEIT_STATUS)[number];

/** Zieldatenmodell §2.3. */
export const SCHICHTEN = ["TAG", "NACHT", "FRUEH", "SPAET"] as const;
export type Schicht = (typeof SCHICHTEN)[number];

/** Zieldatenmodell §2.8. */
export const TAKTISCHE_EBENEN = [
  "GROSSVERBAND",
  "ABTEILUNG",
  "BEREITSCHAFT",
  "ZUG",
  "ZUGTRUPP",
  "GRUPPE",
  "STAFFEL",
  "TRUPP",
  "PERSON",
  "UNBESTIMMT",
] as const;
export type TaktischeEbene = (typeof TAKTISCHE_EBENEN)[number];

/** Zieldatenmodell §2.1 — 16 Schluessel; `organisationName` bleibt ueberall erlaubt. */
export const ORGANISATIONEN = [
  "THW",
  "FEUERWEHR",
  "POLIZEI",
  "BUNDESPOLIZEI",
  "DRK",
  "JUH",
  "MHD",
  "ASB",
  "DLRG",
  "BUNDESWEHR",
  "RETTUNGSDIENST",
  "BERGWACHT",
  "WASSERWIRTSCHAFT",
  "REGIE",
  "ZIVIL",
  "SONSTIGE",
] as const;
export type Organisation = (typeof ORGANISATIONEN)[number];

export const EINSATZ_ARTEN = ["EINSATZ", "UEBUNG", "VERANSTALTUNG"] as const;
export type EinsatzArt = (typeof EINSATZ_ARTEN)[number];

export const SCHICHTMODELLE = ["ZWEI_SCHICHT", "DREI_SCHICHT"] as const;
export type Schichtmodell = (typeof SCHICHTMODELLE)[number];

export const PERSONAL_ERFASSUNGEN = ["VOLLSTAENDIG", "NUR_STAERKE"] as const;
export type PersonalErfassung = (typeof PERSONAL_ERFASSUNGEN)[number];

/**
 * Staerke als Meldestand F/UF/M (Zieldatenmodell §3.2).
 *
 * Ein Tripel, keine drei unabhaengigen Felder — deshalb gilt bei
 * `StaerkeGeaendert` Last-Writer-Wins ueber das ganze Tripel (§4.2).
 */
export interface Staerke {
  readonly fuehrer: number;
  readonly unterfuehrer: number;
  readonly mannschaft: number;
}

// ---------------------------------------------------------------------------
// Die fuenf Ereignisarten des Minimalfolds (Ereigniskatalog §4.2)
// ---------------------------------------------------------------------------

/** Erstes Ereignis der Akte; ein zweites wird verworfen (§4.2). */
export interface EinsatzAngelegt extends Rahmen {
  readonly typ: "EinsatzAngelegt";
  readonly nutzlast: {
    readonly einsatzId: string;
    readonly name: string;
    readonly art: EinsatzArt;
    readonly fuestName: string;
    readonly uebergeordneteFuestName?: string;
    readonly beginn: string;
    readonly schichtmodell: Schichtmodell;
  };
}

/** Additiv ueber die eindeutige Id (§4.2). */
export interface AbschnittAngelegt extends Rahmen {
  readonly typ: "AbschnittAngelegt";
  readonly nutzlast: {
    readonly abschnittId: string;
    readonly name: string;
    readonly abschnittstyp: Abschnittstyp;
    readonly parentId?: string;
    readonly reihenfolge: number;
  };
}

/** Anlage einer Einheit; additiv ueber die eindeutige Id (§4.2). */
export interface EinheitGemeldet extends Rahmen {
  readonly typ: "EinheitGemeldet";
  readonly nutzlast: {
    readonly einheitId: string;
    readonly abschnittId: string;
    readonly bezeichnung: string;
    readonly organisation: Organisation;
    readonly organisationName?: string;
    readonly ebene: TaktischeEbene;
    readonly staerke: Staerke;
    readonly personalErfassung: PersonalErfassung;
    readonly status: EinheitStatus;
    readonly schicht?: Schicht;
  };
}

/**
 * Last-Writer-Wins auf `abschnittId` (§4.2).
 *
 * `vorher` ist das `vonAbschnittId` des Katalogs, `neu` das `nachAbschnittId`
 * — dieselben beiden Werte, nur unter den Rahmennamen aus §2.4.
 */
export interface EinheitVerschoben extends Rahmen<string, string> {
  readonly typ: "EinheitVerschoben";
  readonly vorher: string;
  readonly neu: string;
  readonly nutzlast: {
    readonly einheitId: string;
    readonly kommentar?: string;
  };
}

/**
 * Last-Writer-Wins ueber das ganze Tripel, nicht je Rolle (§4.2).
 *
 * Begruendung des Katalogs: die drei Zahlen sind eine Meldung („0/3/17"),
 * keine unabhaengigen Felder; ein Merge aus zwei Meldungen ergaebe eine
 * Staerke, die nie jemand gemeldet hat.
 */
export interface StaerkeGeaendert extends Rahmen<Staerke, Staerke> {
  readonly typ: "StaerkeGeaendert";
  readonly vorher: Staerke;
  readonly neu: Staerke;
  readonly nutzlast: {
    readonly einheitId: string;
  };
}

/** Die fuenf Ereignisarten, die M0.2 faltet. */
export type Ereignis =
  | EinsatzAngelegt
  | AbschnittAngelegt
  | EinheitGemeldet
  | EinheitVerschoben
  | StaerkeGeaendert;

/**
 * Ein Ereignis, dessen Art dieser Client nicht kennt.
 *
 * Ereigniskatalog §4.1 Regel 4: unbekannte Typen werden **durchgereicht, nicht
 * verworfen**. Der Fold faltet sie nicht, fuehrt sie aber im Zustand mit,
 * damit das Einsatztagebuch „unbekanntes Ereignis (Typ X, Version Y) von
 * <Akteur>" zeigen kann.
 */
export interface FremdesEreignis extends Rahmen<unknown, unknown> {
  readonly typ: string;
  readonly nutzlast?: unknown;
}

/** Alles, was der Fold entgegennimmt: bekannte Arten und unbekannte Typen. */
export type EingehendesEreignis = Ereignis | FremdesEreignis;

const BEKANNTE_TYPEN: ReadonlySet<string> = new Set<Ereignis["typ"]>([
  "EinsatzAngelegt",
  "AbschnittAngelegt",
  "EinheitGemeldet",
  "EinheitVerschoben",
  "StaerkeGeaendert",
]);

/** `true`, wenn der Minimalfold diese Ereignisart kennt (§4.1 Regel 4). */
export function istBekannteArt(ereignis: EingehendesEreignis): ereignis is Ereignis {
  return BEKANNTE_TYPEN.has(ereignis.typ);
}

/** Summe der drei Rollen eines Staerke-Tripels. */
export function staerkeSumme(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

/** Wertgleichheit zweier Staerke-Tripel. */
export function staerkeGleich(a: Staerke, b: Staerke): boolean {
  return (
    a.fuehrer === b.fuehrer && a.unterfuehrer === b.unterfuehrer && a.mannschaft === b.mannschaft
  );
}
