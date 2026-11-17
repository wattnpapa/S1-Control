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

/** Der Beförderungsvermerk (Feld 4) samt Gegenstelle — sie steht auf Papier im selben Kasten. */
export interface Befoerderung extends Mittelvermerk {
  readonly gegenstelle?: string;
}

/**
 * „Befördern": Mittel, Zeit, Handzeichen und die Gegenstelle, an die übermittelt
 * wurde. Ist die Gegenstelle eine Einheit der Lage, folgt im selben Zug ein
 * Kontakt im Funkplan (`kontaktEinheitId`).
 */
export function nachrichtBefoerdern(nachrichtId: string, vorher: Befoerderung | null, befoerderung: Befoerderung, kontaktEinheitId?: string): Entwurf {
  const gegenstelle = befoerderung.gegenstelle?.trim() ?? "";
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
    ...(kontaktEinheitId === undefined ? {} : { nachrichtenfolge: { kontaktEinheitId } }),
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

/** Was beim Aufnehmen oder Aufgeben in einem Zug mitgeschrieben wird. */
export interface Nachrichtenfolge {
  readonly nachweis?: Nachweisvermerk;
  readonly sichtung?: Sichtungsvermerk;
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
  if (nachweis === undefined && sichtung === undefined) return basis;
  return {
    ...basis,
    nachrichtenfolge: {
      ...(nachweis === undefined ? {} : { nachweis }),
      ...(sichtung === undefined ? {} : { sichtung }),
    },
  };
}

/** Die beiden Parameter des Nachrichtenwegs je Einsatz (Entscheidung 8, §5 „Zwanzig Minuten"). */
export type Nachrichtenparameter = "sichtungAuchAusgang" | "fmzSchwelleMinuten";

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
