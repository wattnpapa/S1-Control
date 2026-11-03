/**
 * Merker je Gerät — was dieser Bediener an diesem Rechner schon gesehen hat.
 *
 * Die Einstiegszeile je Blatt und der Hinweis „Doppelklick bearbeitet die
 * Zelle" stehen, bis der Bediener sie nicht mehr braucht (Entwurf
 * „Entlastung", 3.5 und 3.6). Das betrifft keinen Einsatz und keinen
 * anderen Arbeitsplatz; es gehört deshalb in den Speicher des Browsers und
 * nicht in die Akte oder die Einstellungen.
 *
 * **Fehlender Speicher ist kein Fehler.** Ein privates Fenster, gesperrte
 * Websitedaten oder ein voller Speicher werfen; dann steht die Zeile eben
 * jedes Mal da. Das stört weniger als eine Meldung.
 */

export function istGemerkt(schluessel: string): boolean {
  try {
    return globalThis.localStorage.getItem(schluessel) === "1";
  } catch {
    return false;
  }
}

export function merke(schluessel: string): void {
  try {
    globalThis.localStorage.setItem(schluessel, "1");
  } catch {
    // Gesperrt oder voll: Die Zeile erscheint beim nächsten Mal wieder.
  }
}
