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

/**
 * Was bei gesperrtem Speicher wenigstens für diese Sitzung gemerkt wird
 * (Audit LdF P3-4): Ohne Speicher kam das Band „Verstanden“ bei jedem
 * Blattwechsel wieder. Es wird nur befragt, wenn der Speicher wirft — bei
 * funktionierendem Speicher gilt allein er.
 */
const SITZUNG = new Set<string>();

export function istGemerkt(schluessel: string): boolean {
  try {
    return globalThis.localStorage.getItem(schluessel) === "1";
  } catch {
    return SITZUNG.has(schluessel);
  }
}

export function merke(schluessel: string): void {
  try {
    globalThis.localStorage.setItem(schluessel, "1");
  } catch {
    // Gesperrt oder voll: Nur diese Sitzung merkt es sich; beim nächsten Öffnen erscheint die Zeile wieder.
    SITZUNG.add(schluessel);
  }
}
