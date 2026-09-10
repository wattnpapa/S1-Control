/**
 * Kennungen für neu angelegte Entitäten.
 *
 * **Der Client vergibt sie, nicht der Server** — es gibt keinen. Zwei
 * Arbeitsplätze legen nebenläufig an, ohne voneinander zu wissen; eine
 * fortlaufende Zahl wäre nach dem ersten Mal doppelt, und §3.11 machte daraus
 * eine verworfene Anlage mit Hinweis. Eine zufällige Kennung kollidiert
 * praktisch nie.
 *
 * **Mit Präfix, und das ist kein Schmuck.** Ein Konflikthinweis nennt seinen
 * Feldpfad (`abschnitt/EA-3f2c…`, §3.8a), und ein Protokolleintrag nennt eine
 * Id. Wer sie liest, soll ohne Nachschlagen wissen, wovon die Rede ist.
 *
 * Die Länge bleibt weit unter `ID_MAX_LAENGE` (200, Startwert S7): Die Id
 * steht in jeder Nutzlast, die sie erwähnt, und jedes Byte davon liegt am
 * Ende in jedem Segment auf dem Share.
 */

/**
 * Zwölf Stellen aus der Zufallsquelle des Fensters.
 *
 * Bei 16^12 Möglichkeiten liegt die Wahrscheinlichkeit einer Kollision auch
 * bei 5.000 Entitäten (Entscheidung 10) unter 10^-7 — und selbst dann wäre
 * die Folge kein Datenverlust, sondern eine verworfene Zweitanlage mit
 * Hinweis (§3.11).
 */
const STELLEN = 12;

export function neueId(praefix: string): string {
  return `${praefix}-${globalThis.crypto.randomUUID().replaceAll("-", "").slice(0, STELLEN)}`;
}
