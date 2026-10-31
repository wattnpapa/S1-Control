/**
 * Fehlertexte für die Oberfläche: Programmfehler als Klartext.
 *
 * Ein `TypeError` wie „Cannot read properties of undefined (reading 'wert')“
 * sagt dem Helfer nichts und gehört nicht in den Hinweise-Kasten. Gewollte
 * Meldungen des Dienstes (Abweisungen, Sperren) sind normale `Error`s und
 * bleiben unverändert; nur die Fehlerklassen der Laufzeit und ihre typischen
 * Wortlaute werden ersetzt. Die technische Meldung geht ins Protokoll des
 * Workers, nicht auf den Bildschirm.
 */

export const KLARTEXT_PROGRAMMFEHLER =
  "Ein Eintrag im Einsatz ließ sich nicht darstellen. Die Daten sind unverändert gespeichert; bitte die Ansicht neu laden. Bleibt das Problem, die Diagnose öffnen.";

const LAUFZEITKLASSEN = new Set(["TypeError", "ReferenceError", "RangeError", "SyntaxError"]);

const LAUFZEITWORTLAUT =
  /cannot read propert|is not a function|is not iterable|is not defined|of undefined|of null|undefined is not|null is not/i;

/** Ob die Meldung ein Programmfehler der Laufzeit ist und kein Text für Menschen. */
export function istProgrammfehler(fehler: unknown): boolean {
  if (fehler instanceof Error && LAUFZEITKLASSEN.has(fehler.name)) return true;
  const text = fehler instanceof Error ? fehler.message : String(fehler);
  return LAUFZEITWORTLAUT.test(text);
}

/** Der Text, den die Oberfläche zeigt. */
export function klartextFehler(fehler: unknown, vorsatz = ""): string {
  if (istProgrammfehler(fehler)) {
    console.error(`Programmfehler${vorsatz === "" ? "" : ` (${vorsatz})`}:`, fehler);
    return KLARTEXT_PROGRAMMFEHLER;
  }
  const text = fehler instanceof Error ? fehler.message : String(fehler);
  return vorsatz === "" ? text : `${vorsatz}: ${text}`;
}
