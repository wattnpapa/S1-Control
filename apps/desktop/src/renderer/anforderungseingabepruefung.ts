/**
 * Die Pflichtangaben einer neuen Anforderung — ohne DOM prüfbar.
 *
 * Ein leer abgeschickter Dialog „Ablösung anfordern“ schrieb früher eine
 * Anforderung ohne jede Angabe; die Einheit stand darin nur, weil sie
 * vorbelegt war. Hier steht, was der Bediener gesagt haben muss, bevor
 * „Anfordern“ etwas schreibt, und der Satz, der es ihm sagt.
 */

import type { Anforderungseingabe } from "./Anforderungsformular.js";

function belegt(wert: string): boolean {
  return wert.trim() !== "";
}

/**
 * Die Meldung, solange die Eingabe nicht reicht — sonst `undefined`.
 *
 * Eine Ablösung nennt schon die abzulösende Einheit; verlangt wird deshalb,
 * *wer oder was* kommen soll: vorgesehene Einheit, Auftrag oder Kennung.
 */
export function anforderungEingabeFehler(
  eingabe: Anforderungseingabe,
  alsAbloesung: boolean,
): string | undefined {
  const nennt = [eingabe.kennung, eingabe.vorgeseheneEinheitText, eingabe.vorgesehenerAuftrag].some(belegt);
  if (nennt) return undefined;
  if (alsAbloesung) {
    return "Bitte angeben, was angefordert wird: Vorgesehene Einheit, Vorgesehener Auftrag oder Kennung.";
  }
  return belegt(eingabe.abzuloesendeEinheitId)
    ? undefined
    : "Bitte angeben, was angefordert wird: Einheit, Kennung oder Auftrag.";
}
