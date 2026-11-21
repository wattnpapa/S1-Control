/**
 * Was die Einstiegszeile des Blatts „Nachrichten“ zum Satz aus Ring 2 dazu
 * sagt (Audit zweite Runde, R2-SGL P1-1, R2-FaBe P1-2, P2-2).
 *
 * Der Satz aus `ANSICHTEN` sagt, was das Blatt ist („nach Vordruck 1103.1“),
 * nicht, was der Arbeitsplatz tun soll. Zwei Sätze kommen hier hinzu:
 *
 * - immer der Hinweis auf die Sicht „Offen“ für die Übergabe an die
 *   Ablösung (Übungsdrehbuch Minute 100 setzt sie voraus);
 * - für eine Sitzung mit einer Stelle außerhalb der Stationen FMZ, LDF und
 *   SICHTER (Fachberater, S-Stellen, Leiter, freie Namen) ein Satz, was
 *   Posteingang, Kopie und „erledigt“ bedeuten. Der Fachberater der zweiten
 *   Runde fand seine Post erst, nachdem er alle Reiter angeklickt hatte.
 *
 * Reine Funktion; der Satz aus Ring 2 bleibt unverändert davor.
 *
 * Nachzug (R2-FaBe P2-1): Der Reiter „Eingang“ heißt jetzt „Eingangskorb“;
 * seine Einstiegszeile sagt, dass Nachrichten nach Vordruck nicht hier,
 * sondern im Blatt „Nachrichten“ unter „Posteingang“ ankommen.
 */

import { FERNMELDERSTELLEN } from "@s1/domaene";
import type { Blattort } from "./unterblaetter.js";

/** Die Stationen des Fernmeldebetriebs: Sie haben ihre eigene erste Sicht und brauchen den Satz zum Posteingang nicht. */
const STATIONEN: readonly string[] = ["FMZ", "LDF", "SICHTER", ...FERNMELDERSTELLEN];

export const SATZ_OFFEN = "Zur Übergabe an die Ablösung zeigt die Sicht „Offen“, was für Ihre Stellen noch zu tun ist.";

export const SATZ_POSTEINGANG =
  "Was für Sie ankommt, steht im Posteingang; die Kopie sagt, was zu tun ist (grün: bearbeiten, blau: zur Kenntnis, rot: S2 für Lage und Tagebuch), und „erledigt“ ist Ihr eigener Vermerk – er meldet dem Absender nichts, antworten Sie, wenn er etwas wissen muss.";

export const SATZ_EINGANGSKORB = "Hier kommen Erfassungsbögen und Anforderungen an; Nachrichten nach Vordruck stehen im Blatt „Nachrichten“ unter „Posteingang“.";

/** Die Sätze nach dem Satz aus Ring 2; leer für alle Blätter außer „Nachrichten“ und dem Eingangskorb. */
export function einstiegszusatz(ort: Blattort, stellen: readonly string[]): readonly string[] {
  if (ort === "eingang.eingangskorb" || ort === "eingang.anforderungen") return [SATZ_EINGANGSKORB];
  if (ort !== "nachrichten") return [];
  const fachstelle = stellen.some((s) => !STATIONEN.includes(s));
  return fachstelle ? [SATZ_POSTEINGANG, SATZ_OFFEN] : [SATZ_OFFEN];
}
