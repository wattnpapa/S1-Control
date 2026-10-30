/**
 * Die Zeitmarke im Dateinamen einer Ausgabe: `2026-09-10_1430`.
 *
 * Ortszeit und keine Zone — der Dateiname wird von einem Menschen gelesen,
 * der neben dem Rechner steht, und nicht von einem Programm sortiert. Was
 * geordnet werden muss, steht im Manifest der Einsatzakte (M4.4).
 *
 * Eine eigene Datei, weil die Ausgaben des Aktendienstes und die Einsatzakte
 * (`einsatzabschluss.ts`) dieselbe Marke tragen sollen.
 */
export function dateimarke(zeitpunkt: Date): string {
  const zwei = (zahl: number): string => String(zahl).padStart(2, "0");
  return [
    zeitpunkt.getFullYear(),
    "-",
    zwei(zeitpunkt.getMonth() + 1),
    "-",
    zwei(zeitpunkt.getDate()),
    "_",
    zwei(zeitpunkt.getHours()),
    zwei(zeitpunkt.getMinutes()),
  ].join("");
}
