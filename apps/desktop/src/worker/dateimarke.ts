/**
 * Die Zeitmarke im Dateinamen einer Ausgabe: `2026-09-10_1430`.
 *
 * In der Anzeigezone Europe/Berlin und ohne Zonenangabe — der Dateiname wird
 * von einem Menschen gelesen, der neben dem Rechner steht, und nicht von
 * einem Programm sortiert. Früher die Ortszeit des Rechners; seit den Audits
 * (SGL P3-16, LdF P2-4) dieselbe Zone wie jede andere Zeitanzeige, damit
 * „Stand“ in der Datei und Name der Datei übereinstimmen. Was geordnet werden
 * muss, steht im Manifest der Einsatzakte (M4.4).
 *
 * Eine eigene Datei, weil die Ausgaben des Aktendienstes und die Einsatzakte
 * (`einsatzabschluss.ts`) dieselbe Marke tragen sollen.
 */

import { anzeigezoneWandzeit } from "@s1/domaene";

export function dateimarke(zeitpunkt: Date): string {
  const zwei = (zahl: number): string => String(zahl).padStart(2, "0");
  const w = anzeigezoneWandzeit(zeitpunkt);
  if (w === undefined) return "ohnezeit";
  return `${String(w.jahr)}-${zwei(w.monat)}-${zwei(w.tag)}_${zwei(w.stunde)}${zwei(w.minute)}`;
}
