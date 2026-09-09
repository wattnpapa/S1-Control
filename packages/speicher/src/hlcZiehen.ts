/**
 * Das Ziehen einer HLC für ein eigenes Ereignis — KONZEPT-SPEICHER.md §3.2.
 *
 * Die Fortschreibungsregel selbst steht in `@s1/domaene` (`HlcUhr.erzeugen`).
 * Hier steht allein die Behandlung des Zählerüberlaufs, weil sie eine
 * Entscheidung des Schreibers ist:
 *
 * > „Erreicht der Zähler 999.999, wartet der Schreiber, bis die Wanduhr die
 * > nächste Millisekunde erreicht, und beginnt dort mit Zähler 0. Das ist eine
 * > Wartezeit von höchstens einer Millisekunde und niemals ein Fehler; der
 * > Leitsatz ‚kein Stillstand' gilt auch hier. Ein Zähler, der trotz Wartens
 * > nicht zurückgesetzt werden kann, weil die Uhr steht, wird als Uhrfehler
 * > nach §8.5 gemeldet."
 *
 * Der Fall ist praktisch unerreichbar — eine Million Ereignisse in einer
 * Millisekunde —, aber „praktisch unerreichbar" ist kein definiertes Verhalten.
 */

import type { Hlc, HlcUhr, Uhrmeldung } from "@s1/domaene";

import type { Zeitquelle } from "./zeit.js";

/** Wie oft auf die nächste Millisekunde gewartet wird, bevor „die Uhr steht" gilt (§3.2). */
const WARTEVERSUCHE = 8;

/** Das Ergebnis von {@link zieheHlc}. */
export type Hlcziehung =
  | { readonly art: "hlc"; readonly hlc: Hlc; readonly meldung?: Uhrmeldung }
  /** §3.2: Der Zähler ist voll, aber die Wanduhr kommt nicht weiter. */
  | { readonly art: "uhrSteht"; readonly meldung: Uhrmeldung };

/** Zieht eine HLC und behandelt den Zählerüberlauf aus §3.2. */
export function zieheHlc(uhr: HlcUhr, zeit: Zeitquelle): Hlcziehung {
  let letzte: Uhrmeldung | undefined;
  for (let versuch = 0; versuch < WARTEVERSUCHE; versuch += 1) {
    const erzeugt = uhr.erzeugen();
    if (erzeugt.art === "erzeugt") {
      return erzeugt.meldung === undefined
        ? { art: "hlc", hlc: erzeugt.hlc }
        : { art: "hlc", hlc: erzeugt.hlc, meldung: erzeugt.meldung };
    }
    letzte = erzeugt.meldung ?? letzte;
  }
  return { art: "uhrSteht", meldung: letzte ?? { art: "uhrSteht", millisekunden: zeit() } };
}
