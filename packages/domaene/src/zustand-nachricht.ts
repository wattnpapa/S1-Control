/**
 * Die Nachricht im Zustand (KONZEPT-NACHRICHTEN.md §9) — eigene Datei, damit
 * `zustand.ts` nicht weiter wächst; `zustand.ts` führt die Sammlung.
 *
 * Felder nach der Tabelle in §9, Rahmenfelder nach §3.2 des Ereigniskonzepts.
 * Jeder Vermerk des Vordrucks ist **ein** Strukturwert, weil seine Teile auf
 * dem Papier ein Feld sind und getrennt keinen Sinn ergäben.
 */

import type { Id, Zeitpunkt } from "./werte.js";
import type { Anlage, Feld, VerworfeneAnlage } from "./zustand.js";

/** Aufnahme- und Beförderungsvermerk (Feld 1, 2, 4). */
/** Der Vorschlag des LdF: Weg, Gegenstelle und der Fernmelder, der übertragen soll. */
export interface Uebermittlungsvorschlag extends Zeitvermerk {
  readonly mittel: string;
  readonly fernmelder: string;
  readonly gegenstelle?: string;
}

export interface Mittelvermerk {
  readonly mittel: string;
  readonly zeitpunkt: Zeitpunkt;
  readonly handzeichen: string;
}

/** Annahmevermerk (Feld 3) und Kenntnisnahme je Stelle. */
export interface Zeitvermerk {
  readonly zeitpunkt: Zeitpunkt;
  readonly handzeichen: string;
}

/** Die Nachweisung (Feld 5) — gemeinsam für Eingang und Ausgang (Entscheidung 1). */
export interface Nachweisvermerk {
  readonly nummer: number;
  readonly zeitpunkt: Zeitpunkt;
  readonly handzeichen: string;
}

/** Ein Eintrag des Verteilers mit Kopiefarbe (ROT, GRUEN, BLAU, offen). */
export interface Verteilereintrag {
  readonly stelle: string;
  readonly kopie: string;
}

/** Die Sichtung (Feld 18 bis 20). */
export interface Sichtungsvermerk {
  readonly zeitpunkt: Zeitpunkt;
  readonly handzeichen: string;
  readonly verteiler: readonly Verteilereintrag[];
  readonly vermerke?: string;
}

/** Bezug von Anschrift oder Absender auf eine Entität des Einsatzes. */
export interface Nachrichtenbezug {
  readonly entitaet: string;
  readonly id: Id;
}

/**
 * Wo eine Nachricht auf ihrem Weg steht (§9), abgeleitet:
 *
 * ```
 * VOR_FMZ         Ausgang ohne Beförderung (keine Gesprächsnotiz)
 * VOR_LDF         nur mit Parameter `ldfStation`: Ausgang ohne
 *                 Übermittlungsvorschlag, nicht befördert (Zuteilung);
 *                 Ausgang befördert, nicht weitergegeben, nicht gesichtet
 *                 (Nachweisung und Weitergabe); Eingang aufgenommen,
 *                 nicht weitergegeben, nicht gesichtet
 * VOR_SICHTER     Eingang oder Gesprächsnotiz ohne Sichtung; Ausgang nach
 *                 der Beförderung, wenn `sichtungAuchAusgang` gesetzt ist
 *                 oder der LdF ihn weitergegeben hat
 * VERTEILT        gesichtet, mindestens eine Stelle ohne Erledigung
 * ERLEDIGT        alle Stellen erledigt, Verteiler leer, oder Ausgang
 *                 befördert ohne Sichtung für Ausgänge
 * ZURUECKGEZOGEN  Fehlanlage, mit Grund zurückgezogen
 * ```
 */
export const LAUFZUSTAENDE = ["VOR_FMZ", "VOR_SICHTER", "VERTEILT", "ERLEDIGT", "ZURUECKGEZOGEN", "VOR_LDF"] as const;
export type Laufzustand = (typeof LAUFZUSTAENDE)[number];

export interface NachrichtZustand extends Anlage {
  readonly id: Id;
  /** EINGANG oder AUSGANG — geschlossen. */
  readonly richtung: Feld<string>;
  readonly art?: Feld<string>;
  /** Fehlt = einfach. SOFORT, BLITZ, offen. */
  readonly vorrang?: Feld<string>;
  readonly gespraechsnotiz?: Feld<boolean>;
  readonly uebermittlungswunsch?: Feld<string>;
  readonly anschrift: Feld<string>;
  readonly rufnummer?: Feld<string>;
  readonly betreff: Feld<string>;
  readonly inhalt: Feld<string>;
  readonly absender: Feld<string>;
  readonly anschriftBezug?: Feld<Nachrichtenbezug>;
  readonly absenderBezug?: Feld<Nachrichtenbezug>;
  readonly abfassungszeit?: Feld<Zeitpunkt>;
  readonly zeichen?: Feld<string>;
  readonly funktion?: Feld<string>;
  /** Additiv (R2-ETB P1-1): die Stelle der Sitzung, die angelegt oder aufgenommen hat. */
  readonly stelle?: Feld<string>;
  /** Aus der Anlage (Eingang) oder aus `NachrichtBefoerdert` (Ausgang). */
  readonly gegenstelle?: Feld<string>;
  readonly aufnahme?: Feld<Mittelvermerk>;
  readonly annahme?: Feld<Zeitvermerk>;
  /** Der Übermittlungsvorschlag des LdF (`NachrichtUebermittlungVorgeschlagen`). */
  readonly vorschlag?: Feld<Uebermittlungsvorschlag>;
  /** Der Wert trägt bei Bedarf die Gegenstelle mit (`gegenstelle`). */
  readonly befoerderung?: Feld<Mittelvermerk & { readonly gegenstelle?: string }>;
  readonly nachweis?: Feld<Nachweisvermerk>;
  /** Additiv: die Weitergabe des Eingangs vom LdF an den Sichter (`NachrichtWeitergegeben`). */
  readonly weitergabe?: Feld<Zeitvermerk>;
  readonly sichtung?: Feld<Sichtungsvermerk>;
  /** Vermerke nach der Sichtung ohne Neusichtung (`NachrichtVermerkt`). */
  readonly vermerke?: Feld<string>;
  /** Je Stelle des Verteilers: wer wann Kenntnis genommen hat. */
  readonly kenntnis?: { readonly [stelle: string]: Feld<Zeitvermerk> };
  /** Je Stelle: erledigt (`true`) oder zurückgenommen (`false`). */
  readonly erledigt?: { readonly [stelle: string]: Feld<boolean> };
  readonly antwortAuf?: Feld<Id>;
  readonly weitergeleitetVon?: Feld<Id>;
  /** Fehlt = nie zurückgezogen. */
  readonly entfernt?: Feld<boolean>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
  // abgeleitet:
  readonly laufzustand: Laufzustand;
}
