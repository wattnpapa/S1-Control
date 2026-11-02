/**
 * Die Werte der Maske „Funk und Erreichbarkeit" (KONZEPT-FUNKPLAN.md §6,
 * Option 5d) — ohne DOM, damit die Regel ohne Maske prüfbar ist.
 *
 * Die Maske hält, was sie beim Öffnen sah (den Teilnehmer aus dem Funkplan),
 * und schreibt beim Übernehmen je geändertem Feld einen Bedienschritt mit
 * diesem Vorher-Wert. Die Schritte selbst stehen in `funkschritte.ts`; hier
 * steht nur, welches Feld sich geändert hat.
 *
 * **Überschreiben einer Ableitung.** Funkrufname (K31) und Erreichbarkeit
 * (K9) sind Ableitungen mit Override. „Überschreiben …" füllt das Feld mit
 * dem abgeleiteten Wert vor, damit man ihn nur anpasst. Bleibt er unverändert
 * und war nichts überschrieben, wird nichts geschrieben: Ein Override, der
 * der Ableitung gleicht, würde sie nur still einfrieren. Ein leeres Feld
 * heißt „wieder Ableitung".
 */

import type { Funkteilnehmer } from "@s1/domaene";

import {
  erreichbarkeitUeberschreiben,
  funkhinweisDerEinheit,
  funkrufnameUeberschreiben,
  rufgruppenwahl,
  weitereRufgruppenDerEinheit,
} from "../kontrakt/funkschritte.js";
import type { Entwurf } from "../kontrakt/index.js";

export interface Funkeingabe {
  /** Die Hauptrufgruppe; `""` heißt „keine". */
  readonly rufgruppeId: string;
  readonly weitere: readonly string[];
  /** Der Override des Funkrufnamens; `""` heißt Ableitung aus dem Fahrzeug. */
  readonly funkrufname: string;
  /** Der Override der Erreichbarkeit; `""` heißt Ableitung aus Führungskraft und Kontakten. */
  readonly erreichbarkeit: string;
  readonly funkhinweis: string;
}

/** Was die Maske beim Öffnen zeigt. */
export function funkeingabeAus(t: Funkteilnehmer): Funkeingabe {
  return {
    rufgruppeId: t.rufgruppeId ?? "",
    weitere: t.weitereRufgruppen.map((w) => w.rufgruppeId),
    funkrufname: t.funkrufnameOverride ?? "",
    erreichbarkeit: t.erreichbarkeitOverride ?? "",
    funkhinweis: t.funkhinweis,
  };
}

/** Der Override, der zu schreiben ist: die vorbelegte, unveränderte Ableitung zählt als keiner. */
function overrideZiel(eingabe: string, bisher: string | undefined, abgeleitet: string): string {
  return bisher === undefined && eingabe.trim() === abgeleitet ? "" : eingabe;
}

/** Die Schritte für alle geänderten Felder, in der Reihenfolge der Maske. */
export function funkentwuerfe(t: Funkteilnehmer, eingabe: Funkeingabe): readonly Entwurf[] {
  const id = t.einheitId;
  const schritte = [
    rufgruppenwahl(id, t.rufgruppeId, eingabe.rufgruppeId),
    weitereRufgruppenDerEinheit(id, funkeingabeAus(t).weitere, eingabe.weitere),
    funkrufnameUeberschreiben(id, t.funkrufnameOverride, overrideZiel(eingabe.funkrufname, t.funkrufnameOverride, t.funkrufname)),
    erreichbarkeitUeberschreiben(id, t.erreichbarkeitOverride, overrideZiel(eingabe.erreichbarkeit, t.erreichbarkeitOverride, t.erreichbarkeit)),
    funkhinweisDerEinheit(id, t.funkhinweis === "" ? undefined : t.funkhinweis, eingabe.funkhinweis),
  ];
  return schritte.filter((schritt): schritt is Entwurf => schritt !== undefined);
}
