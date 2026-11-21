/**
 * Die Bedienschritte der Fernmeldezentrale und der Einsatzparameter des
 * Nachrichtenwegs (KONZEPT-NACHRICHTEN.md §5, §9, Schnitt N2) — Entwürfe für
 * den Ruf `bedienen`, neben `nachrichtenschritte.ts`, damit jene Datei die
 * Schritte des Verfassers und des Sichters behält.
 *
 * Annahme, Beförderung und Nachweis sind je ein Strukturfeld der Nachricht
 * (Form a). Sie schicken den Wert, den die Maske beim Öffnen sah, und
 * verlangen die Vorwert-Prüfung: Zwei Fernmelder an derselben Nachricht
 * sollen nicht still übereinander schreiben (§6 „Bearbeitungssperre"; die
 * weiche Sperre fängt das Meiste, die Prüfung den Rest). Wer bewusst
 * berichtigt — etwa eine doppelte Nummer —, tut es mit dem geltenden Wert.
 *
 * Zeiten und Handzeichen sind Eingaben, nicht die Wanduhr: Beim Nacherfassen
 * vom Papier gilt, was auf dem Blatt steht (§6 „Papier-Rückfall").
 */

import type { Mittelvermerk, Nachweisvermerk, Sichtungsvermerk, Zeitvermerk } from "@s1/domaene";

import type { Entwurf } from "./index.js";
import { nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "./nachrichtenschritte.js";

/** „Annehmen" (Feld 3): Zeit und Handzeichen des Fernmelders. */
export function nachrichtAnnehmen(nachrichtId: string, vorher: Zeitvermerk | null, vermerk: Zeitvermerk): Entwurf {
  return {
    typ: "NachrichtAngenommen",
    nutzlast: { nachrichtId },
    vorher,
    neu: { zeitpunkt: vermerk.zeitpunkt, handzeichen: vermerk.handzeichen.trim() },
    vorwertPruefen: true,
  };
}

/** Der Übermittlungsvorschlag des LdF (zwischen Feld 3 und 4): Weg, Gegenstelle, Fernmelder. */
export interface Vorschlag extends Mittelvermerk {
  readonly fernmelder: string;
  readonly gegenstelle?: string;
}

/**
 * „Übermittlung vorschlagen": Der LdF sieht die Nachricht und bestimmt, welcher
 * Fernmelder auf welchem Weg an welche Gegenstelle übertragen soll. Der
 * Fernmelder findet den Vorschlag in der Warteschlange und in der Maske
 * „Befördern" vorbelegt; befördert wird erst mit dessen eigenem Vermerk.
 */
export function nachrichtVorschlagen(nachrichtId: string, vorher: Vorschlag | null, vorschlag: Vorschlag): Entwurf {
  const gegenstelle = vorschlag.gegenstelle?.trim() ?? "";
  return {
    typ: "NachrichtUebermittlungVorgeschlagen",
    nutzlast: { nachrichtId },
    vorher,
    neu: {
      mittel: vorschlag.mittel,
      fernmelder: vorschlag.fernmelder.trim(),
      zeitpunkt: vorschlag.zeitpunkt,
      handzeichen: vorschlag.handzeichen.trim(),
      ...(gegenstelle === "" ? {} : { gegenstelle }),
    },
    vorwertPruefen: true,
  };
}

/** Der Kontakt im Funkplan: die Einheit der Gegenstelle und die Rufgruppe, über die gesprochen wurde. */
export interface Funkkontakt {
  readonly einheitId: string;
  readonly rufgruppeId?: string | undefined;
}

/** Die Schlüssel des Kontakts in `nachrichtenfolge`; ohne Einheit keine. */
function kontaktfolge(kontakt: Funkkontakt | undefined): { kontaktEinheitId?: string; kontaktRufgruppeId?: string } {
  if (kontakt === undefined) return {};
  const rufgruppe = kontakt.rufgruppeId?.trim() ?? "";
  return { kontaktEinheitId: kontakt.einheitId, ...(rufgruppe === "" ? {} : { kontaktRufgruppeId: rufgruppe }) };
}

/** Der Beförderungsvermerk (Feld 4) samt Gegenstelle — sie steht auf Papier im selben Kasten. */
export interface Befoerderung extends Mittelvermerk {
  readonly gegenstelle?: string;
}

/**
 * Was beim Befördern in einem Zug mitgeschrieben wird (additiv, Audit LdF
 * P0-1): der Kontakt im Funkplan, die fehlende Annahme mit Uhrzeit und
 * Handzeichen der Beförderung und die Nummer der Nachweisung.
 */
export interface Befoerderungsfolge {
  readonly kontaktEinheitId?: string | undefined;
  /** Additiv: die Rufgruppe des Kontakts; die Einheit ohne Rufgruppe wird ihr zugeordnet. */
  readonly kontaktRufgruppeId?: string | undefined;
  readonly annahme?: Zeitvermerk | undefined;
  readonly nachweis?: Nachweisvermerk | undefined;
}

/**
 * „Befördern": Mittel, Zeit, Handzeichen und die Gegenstelle, an die übermittelt
 * wurde. Ist die Gegenstelle eine Einheit der Lage, folgt im selben Zug ein
 * Kontakt im Funkplan (`kontaktEinheitId`).
 *
 * Additiv (LdF P0-1): Statt der Einheit allein darf `folge` auch die Annahme
 * tragen — dann trägt der Worker sie mit (Befördern verlangt die Annahme) —
 * und die Nummer, die die Beförderungsmaske gleich mit abfragt.
 */
export function nachrichtBefoerdern(nachrichtId: string, vorher: Befoerderung | null, befoerderung: Befoerderung, folge?: string | Befoerderungsfolge): Entwurf {
  const gegenstelle = befoerderung.gegenstelle?.trim() ?? "";
  const f: Befoerderungsfolge = typeof folge === "string" ? { kontaktEinheitId: folge } : (folge ?? {});
  const nachrichtenfolge = {
    ...kontaktfolge(f.kontaktEinheitId === undefined ? undefined : { einheitId: f.kontaktEinheitId, rufgruppeId: f.kontaktRufgruppeId }),
    ...(f.annahme === undefined ? {} : { annahme: nachrichtAnnehmen(nachrichtId, null, f.annahme).neu }),
    ...(f.nachweis === undefined ? {} : { nachweis: nachrichtNachweisen(nachrichtId, null, f.nachweis).neu }),
  };
  return {
    typ: "NachrichtBefoerdert",
    nutzlast: { nachrichtId },
    vorher,
    neu: {
      mittel: befoerderung.mittel,
      zeitpunkt: befoerderung.zeitpunkt,
      handzeichen: befoerderung.handzeichen.trim(),
      ...(gegenstelle === "" ? {} : { gegenstelle }),
    },
    vorwertPruefen: true,
    ...(Object.keys(nachrichtenfolge).length === 0 ? {} : { nachrichtenfolge }),
  };
}

/**
 * „Nachweisen" (Feld 5): die Nummer der Nachweisung. Eine schon vergebene
 * Nummer sperrt nicht — die Maske warnt vorher, der Fold meldet
 * `nachweisnummerDoppelt`, und die Nachweisung zeigt beide Zeilen mit Marke (§9).
 */
export function nachrichtNachweisen(nachrichtId: string, vorher: Nachweisvermerk | null, nachweis: Nachweisvermerk): Entwurf {
  return {
    typ: "NachrichtNachgewiesen",
    nutzlast: { nachrichtId },
    vorher,
    neu: { nummer: nachweis.nummer, zeitpunkt: nachweis.zeitpunkt, handzeichen: nachweis.handzeichen.trim() },
    vorwertPruefen: true,
  };
}

/**
 * „Aufnahme berichtigen“ (FM P2-7, Runde 1): Mittel, Zeit und Handzeichen der
 * Aufnahme eines Eingangs (Feld 1, 2, 6) neu — nach einem Zahlendreher in der
 * Aufnahmezeit oder dem falschen Mittel. `vorher` ist der Aufnahmevermerk, den
 * die Maske beim Öffnen sah (Vorwert-Prüfung wie Annehmen und Befördern);
 * `grund` ist Pflicht, weil der Vermerk auf Papier schon stehen kann.
 */
export function aufnahmeBerichtigen(nachrichtId: string, vorher: Mittelvermerk | null, aufnahme: Mittelvermerk, grund: string): Entwurf {
  return {
    typ: "NachrichtAufnahmeBerichtigt",
    nutzlast: { nachrichtId },
    vorher,
    neu: { mittel: aufnahme.mittel, zeitpunkt: aufnahme.zeitpunkt, handzeichen: aufnahme.handzeichen.trim() },
    grund: grund.trim(),
    vorwertPruefen: true,
  };
}

/** Was beim Aufnehmen oder Aufgeben in einem Zug mitgeschrieben wird. */
export interface Nachrichtenfolge {
  readonly nachweis?: Nachweisvermerk;
  readonly sichtung?: Sichtungsvermerk;
  /** Additiv (Fernmelder P2-9): Annahme und Beförderung eines Ausgangs vom Papier, im selben Zug. */
  readonly annahme?: Zeitvermerk;
  readonly befoerderung?: Befoerderung;
  /**
   * Additiv (R2-SGL P1-2, R2-ETB P1-1): Die Anlage kommt vom Papier. Der
   * Worker schreibt sie und ihre Folgen mit dem `grund` „vom Papier
   * nachgetragen“, das Tagebuch nennt die Stelle der Sitzung.
   */
  readonly nachtrag?: boolean;
  /** Additiv: Ein über Funk aufgenommener Eingang einer Einheit ist ein Kontakt im Funkplan. */
  readonly kontakt?: Funkkontakt | undefined;
}

/**
 * Die Anlage mit ihren Folgeschritten (§5 „Eingang von außen", „Ersatzsichter",
 * „Gesprächsnotiz"): `NachrichtVerfasst`, und — wenn angegeben — danach
 * `NachrichtNachgewiesen` und `NachrichtGesichtet`. Geschrieben werden die
 * Folgen im Worker (`schreibfolgen.ts`), in derselben Warteschlange; die
 * Werte stehen schon hier in der Form, die die Einzelschritte schreiben.
 */
export function nachrichtAufnehmen(anlage: Nachrichtenanlage, folge: Nachrichtenfolge): Entwurf {
  const basis = nachrichtVerfassen(anlage);
  const nachweis = folge.nachweis === undefined ? undefined : nachrichtNachweisen(anlage.nachrichtId, null, folge.nachweis).neu;
  const sichtung = folge.sichtung === undefined ? undefined : nachrichtSichten(anlage.nachrichtId, null, folge.sichtung).neu;
  const annahme = folge.annahme === undefined ? undefined : nachrichtAnnehmen(anlage.nachrichtId, null, folge.annahme).neu;
  const befoerderung = folge.befoerderung === undefined ? undefined : nachrichtBefoerdern(anlage.nachrichtId, null, folge.befoerderung).neu;
  const nachrichtenfolge = {
    ...(nachweis === undefined ? {} : { nachweis }),
    ...(sichtung === undefined ? {} : { sichtung }),
    ...(annahme === undefined ? {} : { annahme }),
    ...(befoerderung === undefined ? {} : { befoerderung }),
    ...(folge.nachtrag === true ? { nachtrag: true } : {}),
    ...kontaktfolge(folge.kontakt),
  };
  return Object.keys(nachrichtenfolge).length === 0 ? basis : { ...basis, nachrichtenfolge };
}

/**
 * Die Parameter des Nachrichtenwegs je Einsatz (Entscheidung 8, §5 „Zwanzig
 * Minuten"); `ldfStation` additiv (2026-11-17): der LdF als eigene Station;
 * additiv (R2-FM P2-5, R2-Si P2-2): die Schwellen vor dem Sichter bei Blitz
 * und Sofort (Vorbelegung 5 und 10 Minuten).
 */
export type Nachrichtenparameter = "sichtungAuchAusgang" | "fmzSchwelleMinuten" | "ldfStation" | "sichterSchwelleBlitzMinuten" | "sichterSchwelleSofortMinuten";

/**
 * Setzt einen Parameter; `vorher` ist der Wert im Zustand (`null`, solange
 * die Vorbelegung gilt). Derselbe Wert schreibt nichts. Ohne Vorwert-Prüfung
 * wie die Funkschwelle: Der Einsatz hat einen Wert, der zuletzt gesetzte gilt.
 */
export function nachrichtenParameterSetzen(
  einsatzId: string,
  feld: Nachrichtenparameter,
  vorher: boolean | number | null,
  neu: boolean | number,
): Entwurf | undefined {
  if (neu === vorher) return undefined;
  return { typ: "NachrichtenParameterGesetzt", nutzlast: { einsatzId, feld }, vorher, neu };
}

/**
 * Ob ein Sichter besetzt ist (§5 „Ersatzsichter"): die eigene Sitzung oder
 * ein lebender Arbeitsplatz der Präsenz mit der Stelle SICHTER. Eine
 * veraltete Präsenz zählt nicht — dann gilt „kein Sichter da", und wer
 * aufnimmt, verteilt selbst. Hier im Kontrakt, weil Maske und Worker
 * dieselbe Regel lesen.
 */
export function sichterBesetzt(
  eigene: readonly string[] | undefined,
  peers: readonly { readonly veraltet: boolean; readonly stellen?: readonly string[] | undefined }[],
): boolean {
  if (eigene?.includes("SICHTER") === true) return true;
  return peers.some((p) => !p.veraltet && p.stellen?.includes("SICHTER") === true);
}
