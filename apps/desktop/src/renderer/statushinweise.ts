/**
 * Die Klartexte hinter den Warnungen der Statuszeile.
 *
 * Eine Warnung ohne Erklärung („3 Konflikthinweis(e)") lässt den Bediener
 * raten, ob er handeln muss. Jeder Text sagt in zwei, drei Sätzen: Was ist
 * das? Ist etwas verloren? Was tue ich? Er steht hier und nicht in der
 * Komponente, damit er ohne Oberfläche gelesen und geprüft werden kann.
 */

/** „1 Konflikthinweis", „3 Konflikthinweise". */
export function konflikthinweisText(anzahl: number): string {
  return anzahl === 1 ? "1 Konflikthinweis" : `${String(anzahl)} Konflikthinweise`;
}

/** „1 Stelle in Quarantäne", „2 Stellen in Quarantäne". */
export function quarantaeneText(anzahl: number): string {
  return anzahl === 1 ? "1 Stelle in Quarantäne" : `${String(anzahl)} Stellen in Quarantäne`;
}

/** „1 unbekanntes Ereignis", „5 unbekannte Ereignisse". */
export function unbekanntText(anzahl: number): string {
  return anzahl === 1 ? "1 unbekanntes Ereignis" : `${String(anzahl)} unbekannte Ereignisse`;
}

export const ERKLAERUNG_KONFLIKT =
  "Zwei Arbeitsplätze haben dasselbe Feld fast gleichzeitig verschieden geändert. Angezeigt wird der jüngere Wert; " +
  "der andere ist nicht verloren. Betroffene Felder tragen in der Tabelle ein ⚠. " +
  "Auflösen: mit dem Kollegen klären, welcher Wert stimmt, und diesen Wert neu eintragen – dann ist er der jüngste, " +
  "und der Hinweis verschwindet. Handeln ist nur nötig, wenn der angezeigte Wert falsch ist.";

export function erklaerungQuarantaene(stellen: readonly string[]): string {
  const liste = stellen.length === 0 ? "" : ` Betroffen: ${stellen.join(", ")}.`;
  return (
    "Ein Stück einer Ereignisdatei auf dem Share ist unlesbar oder beschädigt und wird nicht mehr ausgewertet. " +
    "Ihre eigenen Eingaben sind davon nicht betroffen." +
    liste +
    " Tun: Lage im Auge behalten, bei fehlenden Einträgen den Arbeitsplatz fragen, der sie eingegeben hat; " +
    "die Administration informieren (Diagnose zeigt Einzelheiten). Nichts löschen."
  );
}

export const ERKLAERUNG_SHARE =
  "Der gemeinsame Speicher (Share) antwortet nicht. Sie können weiterarbeiten: Eingaben werden zuerst auf diesem Gerät " +
  "gesichert und automatisch übertragen, sobald der Share wieder da ist. Andere Arbeitsplätze sehen Ihre Änderungen bis " +
  "dahin nicht – wichtige Meldungen bis dahin per Funk oder Zettel weitergeben.";

export function erklaerungUebertragung(menge: string): string {
  return (
    `${menge} Ihrer Eingaben liegen nur auf diesem Gerät und sind noch nicht auf dem Share. Sie gehen nicht verloren ` +
    "und werden automatisch übertragen, sobald der Share erreichbar ist. Bis dahin das Gerät nicht ausschalten " +
    "und das Fenster nicht schließen."
  );
}

export const ERKLAERUNG_UNBEKANNT =
  "Ein anderer Arbeitsplatz arbeitet mit einer neueren Programmfassung und hat Ereignisse geschrieben, die diese Fassung " +
  "nicht kennt. Sie werden aufbewahrt, aber nicht angezeigt. Tun: Programm aktualisieren (Hinweis in den Einstellungen).";
