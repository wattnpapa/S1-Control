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
 */

import { zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";

/** Ob eine Eingabe die Gestalt `hhmm` oder `ddhhmm` hat. */
export function istFunkzeitForm(eingabe: string): boolean {
  return /^\d{4}$/.test(eingabe.trim()) || /^\d{6}$/.test(eingabe.trim());
}

/** Der ISO-Zeitpunkt zur Eingabe – oder `undefined`, wenn sie nicht lesbar ist. */
export function funkzeitAusEingabe(eingabe: string, jetzt: Date = new Date()): string | undefined {
  const text = eingabe.trim();
  if (!istFunkzeitForm(text)) return zeitpunktAusEingabe(text, jetzt);
  const tag = text.length === 6 ? Number.parseInt(text.slice(0, 2), 10) : jetzt.getDate();
  const stunde = Number.parseInt(text.slice(-4, -2), 10);
  const minute = Number.parseInt(text.slice(-2), 10);
  if (stunde > 23 || minute > 59 || tag < 1 || tag > 31) return undefined;
  const zeit = new Date(jetzt.getFullYear(), jetzt.getMonth(), tag, stunde, minute);
  // „31“ im Monat mit 30 Tagen springt in den nächsten Monat: das ist keine Zeit.
  if (zeit.getDate() !== tag) return undefined;
  return zeit.toISOString();
}

/** Der Hinweis unter einem Zeitfeld, das die Eingabe nicht lesen kann. */
export const TEXT_ZEITFORMAT =
  "Zeit als „06:30“, „0630“, „280630“ (Tag+Uhrzeit), „30.10. 14:30“ oder „30.10.2026 14:30“";
