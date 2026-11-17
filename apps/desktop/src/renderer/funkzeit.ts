/**
 * Die Funkzeit, wie sie über Funk durchgegeben wird: „0630“, „06:30“ oder
 * „280630“ (Tag, Stunde, Minute).
 *
 * `zeitpunktAusEingabe` (Kontrakt) kennt „14:30“, „30.10. 14:30“ und die
 * Langform. Wer eine Meldung nach Funkart erfasst, tippt aber die
 * vierstellige Funkzeit ohne Doppelpunkt – und bekam „keine lesbare Zeitangabe“.
 * Dieser Leser nimmt die Funkformen dazu und reicht alles andere an
 * `zeitpunktAusEingabe` weiter.
 *
 *  * `hhmm` und `hh:mm`: heute zu dieser Uhrzeit.
 *  * `ddhhmm`: der Tag des laufenden Monats zu dieser Uhrzeit.
 *
 * „Heute“ und alle Uhrzeiten in der Anzeigezone Europe/Berlin.
 */

import { funkzeitInAnzeigezone } from "../kontrakt/bedienschritte.js";

/** Ob eine Eingabe die Gestalt `hhmm` oder `ddhhmm` hat. */
export function istFunkzeitForm(eingabe: string): boolean {
  return /^\d{4}$/.test(eingabe.trim()) || /^\d{6}$/.test(eingabe.trim());
}

/**
 * Der ISO-Zeitpunkt zur Eingabe – oder `undefined`, wenn sie nicht lesbar ist.
 *
 * Gelesen in der Anzeigezone Europe/Berlin (`funkzeitInAnzeigezone` im
 * Kontrakt), nicht mehr in der Ortszeit des Browsers: Die Funkzeit ist
 * fachlich dieselbe Zone wie die Datum-Zeit-Gruppe des Vordrucks, sonst stand
 * auf einem Rechner mit UTC „1145“ auf dem Papier, wo „1045“ getippt war
 * (Audit Fernmelder P2-1).
 */
export function funkzeitAusEingabe(eingabe: string, jetzt: Date = new Date()): string | undefined {
  return funkzeitInAnzeigezone(eingabe, jetzt);
}

/** Der Hinweis unter einem Zeitfeld, das die Eingabe nicht lesen kann. */
export const TEXT_ZEITFORMAT =
  "Zeit als „06:30“, „0630“, „280630“ (Tag+Uhrzeit), „30.10. 14:30“ oder „30.10.2026 14:30“";
