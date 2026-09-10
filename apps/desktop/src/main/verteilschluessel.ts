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
 * s1 paket schluessel
 * ```
 *
 * Das Kommando legt den **privaten** Teil in eine Datei mit Rechten für den
 * Eigentümer allein und schreibt auf den Bildschirm nur den öffentlichen —
 * als genau die Zeile, die unten steht. Ein früherer Stand dieser Anleitung
 * war ein `node -e`-Einzeiler, der beide Teile ausgab; er schrieb damit den
 * privaten Schlüssel in den Sitzungsverlauf, in die Zwischenablage und
 * womöglich in ein Protokoll (M9.2).
 *
 * Ein Paket wird danach so signiert:
 *
 * ```
 * s1 paket signiere <paketdatei> --schluessel <datei> --version 2.1.0
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
