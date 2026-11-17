/**
 * Die Bedienschritte des Leiters des Fernmeldebetriebes (LdF), bestätigt am
 * 2026-11-17 (KONZEPT-NACHRICHTEN.md §5, §9) — Entwürfe für den Ruf
 * `bedienen`, neben `fmzschritte.ts`.
 *
 * Nach der Lehrunterlage (Folie 22) legt der LdF in der Fernmeldezentrale
 * das Übertragungsmittel eines Ausgangs fest — das ist der
 * Übermittlungsvorschlag (`nachrichtVorschlagen` in `fmzschritte.ts`); nach
 * der Stabsdienstordnung der Führungsstelle prüft er beim Eingang Aufnahme
 * und Nachweisung und gibt an den Sichter weiter (hier). Die Weitergabe ist
 * ein Strukturfeld der Nachricht (Form a) und schickt den Wert, den die
 * Maske beim Öffnen sah, mit Vorwert-Prüfung — wie Annahme und Beförderung.
 *
 * Hier steht auch die Regel, ob ein LdF besetzt ist; Maske und Worker lesen
 * dieselbe, wie bei `sichterBesetzt`.
 */

import type { Sichtungsvermerk, Zeitvermerk } from "@s1/domaene";

import type { Entwurf } from "./index.js";
import { nachrichtSichten } from "./nachrichtenschritte.js";

/** Die bekannte Stelle des LdF (NACHRICHT_STELLEN). */
export const STELLE_LDF = "LDF";

/**
 * „An den Sichter weitergeben" (Eingang): Zeit und Handzeichen des LdF.
 *
 * Additiv (R2-LdF P1-3): Ist kein Sichter besetzt, sichtet der LdF als
 * Ersatzsichter — `sichtung` ist sein Laufzettel; der Worker schreibt danach
 * im selben Zug `NachrichtGesichtet` mit `GRUND_ERSATZSICHTER`.
 */
export function nachrichtWeitergeben(nachrichtId: string, vorher: Zeitvermerk | null, vermerk: Zeitvermerk, sichtung?: Sichtungsvermerk): Entwurf {
  return {
    typ: "NachrichtWeitergegeben",
    nutzlast: { nachrichtId },
    vorher,
    neu: { zeitpunkt: vermerk.zeitpunkt, handzeichen: vermerk.handzeichen.trim() },
    vorwertPruefen: true,
    ...(sichtung === undefined ? {} : { nachrichtenfolge: { sichtung: nachrichtSichten(nachrichtId, null, sichtung).neu } }),
  };
}

/** Was die Regel von einem Peer der Präsenz braucht. */
export type Praesenzstellen = readonly { readonly veraltet: boolean; readonly stellen?: readonly string[] | undefined }[];

/**
 * Ob eine Stelle besetzt ist: die eigene Sitzung oder ein lebender
 * Arbeitsplatz der Präsenz mit dieser Stelle. Eine veraltete Präsenz zählt
 * nicht — dann gilt „nicht da" (§5 „Ersatzsichter").
 */
export function stelleBesetzt(stelle: string, eigene: readonly string[] | undefined, peers: Praesenzstellen): boolean {
  if (eigene?.includes(stelle) === true) return true;
  return peers.some((p) => !p.veraltet && p.stellen?.includes(stelle) === true);
}

/**
 * Ob ein LdF besetzt ist. Ist keiner da, übernimmt der Fernmelder den
 * Schritt (Ersatzregel wie beim Sichter).
 */
export function ldfBesetzt(eigene: readonly string[] | undefined, peers: Praesenzstellen): boolean {
  return stelleBesetzt(STELLE_LDF, eigene, peers);
}
