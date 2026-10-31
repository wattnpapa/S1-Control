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
 * *wer oder was* kommen soll: vorgesehene Einheit oder Auftrag (bei der
 * Ablösung auch die Kennung; im Blatt genügt die Kennung allein nicht).
 */
export function anforderungEingabeFehler(
  eingabe: Anforderungseingabe,
  alsAbloesung: boolean,
): string | undefined {
  if (alsAbloesung) {
    const nennt = [eingabe.kennung, eingabe.vorgeseheneEinheitText, eingabe.vorgesehenerAuftrag].some(belegt);
    return nennt
      ? undefined
      : "Bitte angeben, was angefordert wird: Vorgesehene Einheit, Vorgesehener Auftrag oder Kennung.";
  }
  // Im Blatt reicht die Kennung allein nicht: Sie sagt nicht, was kommen soll.
  const nennt = [eingabe.abzuloesendeEinheitId, eingabe.vorgeseheneEinheitText, eingabe.vorgesehenerAuftrag].some(belegt);
  return nennt
    ? undefined
    : "Bitte angeben, was angefordert wird: Ablösung für, vorgesehene Einheit oder Auftrag – die Kennung allein genügt nicht.";
}
