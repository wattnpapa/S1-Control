/**
 * Öffnet beim Start den Einsatz wieder, an dem dieses Fenster zuletzt stand.
 *
 * Aufgerufen, nachdem `starte()` die Einsatzliste geladen hat. Drei Ausgänge:
 *
 * - Der Einsatz steht in der Liste und lässt sich öffnen: fertig, das Blatt
 *   holt der Arbeitsplatz aus demselben Merker.
 * - Der Einsatz gibt es nicht mehr: Merker weg, Einsatzliste mit Hinweis.
 * - Der Dienst antwortet nicht oder die Akte lässt sich nicht öffnen: der
 *   Merker **bleibt** (der nächste Reload darf es noch einmal versuchen), die
 *   Einsatzliste erscheint mit dem Grund — nie ein stilles Scheitern.
 */

import { useLaden } from "./laden.js";
import { ladeMerker, loescheMerker } from "./sitzung.js";

export const TEXT_NICHT_WIEDER_GEOEFFNET = "Einsatz konnte nicht wieder geöffnet werden";

function melde(grund: string): void {
  useLaden.getState().melde("warnung", `${TEXT_NICHT_WIEDER_GEOEFFNET}: ${grund}`);
}

/** Versucht das Wiederöffnen; liefert `true`, wenn der Einsatz offen ist. */
export async function wiederoeffneZuletzt(): Promise<boolean> {
  const merker = ladeMerker();
  if (merker === undefined) return false;
  const laden = useLaden.getState();
  if (laden.akteId !== undefined) return true;
  if (laden.umgebung === undefined) {
    // `starte()` ist am Dienst gescheitert; das Fehlerbild nennt den Grund.
    melde(laden.fehler ?? "Der Dienst ist nicht erreichbar.");
    return false;
  }
  if (!laden.einsaetze.some((einsatz) => einsatz.ordner === merker.ordner)) {
    loescheMerker();
    melde("Der Einsatz existiert nicht mehr oder liegt nicht mehr unter dem Share-Pfad.");
    return false;
  }
  await laden.oeffneEinsatz(merker.ordner);
  const danach = useLaden.getState();
  if (danach.akteId !== undefined) return true;
  const grund = danach.fehler ?? "Die Akte ließ sich nicht öffnen.";
  danach.loescheFehler();
  melde(grund);
  return false;
}
