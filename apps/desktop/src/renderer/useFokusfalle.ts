/**
 * Die Fokusfalle jeder Maske (Audit Fernmelder P2-8, Nachrichten 2026-11-17).
 *
 * Zwei Dinge fehlten, und beide kosten den Fernmelder unter Last die Hand
 * an der Maus:
 *
 * - **Tab bleibt in der Maske.** Hinter der Abdunkelung liegt die ganze
 *   Ansicht; ein Tab nach dem letzten Knopf sprang dorthin, und der nächste
 *   Tastendruck traf eine Zeile, die niemand sah. Jetzt springt Tab vom
 *   letzten bedienbaren Element zum ersten, Umschalt+Tab vom ersten zum
 *   letzten. Die eigene Tabulatorfolge der Aufnahme (`springeTabfolge` in
 *   `Maske.tsx`) geht vor; die Falle greift nur an den Rändern.
 * - **Der Fokus kehrt zurück.** Wer „Befördern“ in der Warteschlange drückt,
 *   die Maske bestätigt und weiterarbeiten will, stand vorher am Anfang der
 *   Seite. Das Element, das beim Öffnen den Fokus hatte (der auslösende
 *   Knopf), wird beim Öffnen gemerkt und beim Schließen wieder fokussiert —
 *   sofern es dann noch im Dokument steht.
 */

import { useEffect, useState } from "react";

/** Was mit Tab erreichbar ist: Felder, Knöpfe, Verweise — ohne gesperrte und ohne `tabindex="-1"`. */
const BEDIENBAR = "a[href], button, input, select, textarea, summary, [tabindex]";

/** Die bedienbaren Elemente der Maske in Dokumentfolge. */
export function bedienbareElemente(wurzel: HTMLElement): readonly HTMLElement[] {
  return [...wurzel.querySelectorAll<HTMLElement>(BEDIENBAR)].filter((e) => {
    if ((e as HTMLInputElement).disabled) return false;
    if (e.getAttribute("tabindex") === "-1") return false;
    if (e instanceof HTMLInputElement && e.type === "hidden") return false;
    return true;
  });
}

/**
 * Hält Tab am Rand der Maske: vom letzten zum ersten, rückwärts vom ersten
 * zum letzten. Liefert `true`, wenn der Sprung hier geschah — dann muss der
 * Aufrufer den Standard des Browsers unterbinden.
 */
export function haltTab(ziel: EventTarget, rueckwaerts: boolean, wurzel: HTMLElement | null): boolean {
  if (wurzel === null) return false;
  const elemente = bedienbareElemente(wurzel);
  const erstes = elemente[0];
  const letztes = elemente[elemente.length - 1];
  if (erstes === undefined || letztes === undefined) return false;
  const innen = ziel instanceof Node && wurzel.contains(ziel);
  if (rueckwaerts && (ziel === erstes || !innen)) {
    letztes.focus();
    return true;
  }
  if (!rueckwaerts && (ziel === letztes || !innen)) {
    erstes.focus();
    return true;
  }
  return false;
}

/**
 * Merkt das auslösende Element beim ersten Zeichnen — vor dem Effekt, der den
 * Fokus ins erste Feld setzt — und gibt ihm den Fokus beim Schließen zurück.
 */
export function useFokusRueckgabe(): void {
  // Im Initialisierer, nicht im Effekt: Dort hätte die Maske den Fokus schon.
  const [ausloeser] = useState<Element | null>(() => (typeof document === "undefined" ? null : document.activeElement));
  useEffect(
    () => () => {
      if (!(ausloeser instanceof HTMLElement) || ausloeser === document.body || !ausloeser.isConnected) return;
      ausloeser.focus();
    },
    [ausloeser],
  );
}
