/**
 * Die Stelle des Verfassers eines Ausgangs und seine eigene Kopie
 * (Audits Nachrichten Runde 2, R2-FaBe P1-4).
 *
 * Nach der Beförderung verteilt die FmZ die rote Kopie an S2 und die grüne an
 * die Stelle des Verfassers (Folie 30; `laufwegfolgen.ts` im Worker). Diese
 * grüne Kopie kam als „neu, grün: bearbeiten“ in den Posteingang der Stelle,
 * die die Nachricht selbst geschrieben hatte — der Zähler „neu“ wurde zum
 * Fehlalarm, und ein Blitz meldete sich dem eigenen Verfasser.
 *
 * **Warum die Projektion und kein Ereignis.** Erwogen war ein Folgeschritt
 * `NachrichtKenntnisGenommen` für die Verfasserstelle mit dem Handzeichen der
 * Anlage. Geschrieben würde er aber vom Arbeitsplatz der FmZ, der befördert —
 * im Tagebuch stünde dann eine Kenntnisnahme „S4 · Ru“, die Ru nie gegeben
 * hat, mit der Uhrzeit der Beförderung. Das ist ein Handzeichen, das niemand
 * gesetzt hat. Ehrlicher ist die Ableitung: Wer die Nachricht verfasst hat,
 * kennt ihren Inhalt; seine Kopie gilt als gelesen, ohne dass das Tagebuch
 * eine Handlung behauptet. Die Zeile trägt dafür die Marke `eigenerAusgang`,
 * die Kenntnis (`kenntnis`) bleibt leer, und erledigt wird wie bisher.
 */

import { NACHRICHT_STELLEN } from "../ereignis.js";
import { stellenWort } from "./tagebuch-nachrichten.js";

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.trim() !== "" ? wert.trim() : undefined;
}

/**
 * Die Stelle des Verfassers für die grüne Kopie: die Funktion der Anlage,
 * wenn sie eine bekannte Stelle ist (als Kennung oder als Wort, „Leiter"),
 * sonst der Absender als freier Name. Ein Schrägstrich würde den Feldpfad
 * `kenntnis/<stelle>` zerlegen und wird deshalb ersetzt.
 */
export function verfasserstelleAus(funktion: unknown, absender: unknown): string | undefined {
  const f = text(funktion);
  if (f !== undefined) {
    const bekannt = NACHRICHT_STELLEN.find((s) => s === f.toUpperCase() || stellenWort(s).toLowerCase() === f.toLowerCase());
    if (bekannt !== undefined) return bekannt;
  }
  const frei = text(absender)?.replaceAll("/", "-").slice(0, 80);
  return frei === undefined || frei === "" ? undefined : frei;
}

/**
 * Ist `stelle` im Verteiler eines Ausgangs die Stelle seines Verfassers?
 * Nur ein Ausgang über die FmZ (keine Gesprächsnotiz): Die Gesprächsnotiz
 * verteilt ihr Verfasser selbst, und ein Eingang hat keinen Verfasser im Stab.
 */
export function istEigeneKopie(
  angaben: { readonly richtung: unknown; readonly gespraechsnotiz: unknown; readonly funktion: unknown; readonly absender: unknown },
  stelle: string,
): boolean {
  if (angaben.richtung !== "AUSGANG" || angaben.gespraechsnotiz === true) return false;
  return verfasserstelleAus(angaben.funktion, angaben.absender) === stelle;
}
