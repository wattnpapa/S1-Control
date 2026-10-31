/**
 * Die Geschlechtsspalten (Männl./Weibl./Div.) der Status- und Logistikblätter.
 *
 * Eigene Datei, weil zwei Blätter dieselbe Regel brauchen: Wo weder weiblich
 * noch divers erfasst ist, steht „—“ und nicht „Männl. 13“.
 */

/** Die Zellen stehen im Quelltext untereinander, wie die übrigen Zahlenzellen. */
const ZEILENUMBRUCH = "\n        ";

function zelle(wert: number): string {
  return `<td class="zahl">${String(wert)}</td>`;
}

/**
 * Die Spalten Männl./Weibl./Div. einer Zeile. Ist weder weiblich noch divers
 * erfasst, steht „—“: Das Geschlecht ist dann nicht erfasst, und „Männl. 13“
 * wäre eine Angabe, die niemand gemacht hat.
 */
export function geschlechtszellen(zeile: { maennlich: number; weiblich: number; divers: number }): string {
  if (zeile.weiblich === 0 && zeile.divers === 0) {
    return Array.from({ length: 3 }, () => '<td class="zahl nicht-erfasst" title="nicht erfasst">—</td>').join(ZEILENUMBRUCH);
  }
  return [zeile.maennlich, zeile.weiblich, zeile.divers].map(zelle).join(ZEILENUMBRUCH);
}

/** Die Fußnote zu „—“ in den Geschlechtsspalten. */
export const GESCHLECHT_FUSSNOTE =
  "„—“ in Männl./Weibl./Div.: nicht erfasst (weder weiblich noch divers angegeben). Männlich wird als Gesamt − weiblich − divers abgeleitet.";
