/**
 * Der Schlüssel, dem diese Fassung beim Update vertraut (M7.2).
 *
 * **Ein Vertrauensanker gehört in den Quelltext und nicht in eine Datei
 * daneben.** Läge er auf dem Share, könnte ihn austauschen, wer auch das
 * Paket austauschen kann — und die ganze Prüfung wäre eine Schleife, die sich
 * selbst bestätigt. Er wird deshalb mit dem Programm ausgeliefert und ändert
 * sich nur mit einer neuen Fassung.
 *
 * **Er ist noch nicht vergeben.** Das Schlüsselpaar erzeugt die Stelle, die
 * Pakete veröffentlicht; der private Teil gehört dorthin und in keinen Baum.
 * Solange hier nichts steht, bietet die Anwendung **kein** Update an und sagt
 * warum — und das ist die richtige Vorbelegung. Ein Platzhalter, der
 * stillschweigend alles annähme, wäre die gefährlichste von allen möglichen
 * Zeilen: Er sähe aus wie eine Prüfung und wäre keine.
 *
 * So wird er erzeugt (einmalig, auf dem Rechner, der veröffentlicht):
 *
 * ```
 * node -e "import('@bos/eeb-format').then(async (k) => {
 *   const p = await k.schluesselpaarErzeugen();
 *   console.log('privat:      ', k.zuHex(p.privat));
 *   console.log('oeffentlich: ', k.zuHex(p.oeffentlich));
 * })"
 * ```
 *
 * Der öffentliche Teil kommt hierher, der private in den Tresor der
 * Führungsstelle. Wer ihn verliert, kann keine Pakete mehr veröffentlichen —
 * wer ihn findet, kann es.
 */

/**
 * Der öffentliche Schlüssel als Hex, oder leer, solange keiner vergeben ist.
 *
 * 64 Hexzeichen, wenn er dasteht.
 */
export const VERTRAUTER_SCHLUESSEL = "";

/** Die Meldung, die an die Stelle eines Angebots tritt, solange nichts vergeben ist. */
export const OHNE_SCHLUESSEL =
  "Für diese Fassung ist kein Verteilschlüssel hinterlegt; ein Update über den Share wird deshalb nicht angeboten.";
