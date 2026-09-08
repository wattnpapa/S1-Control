/**
 * `@s1/speicher` — Ring 3: alles, was das Dateisystem beruehrt.
 *
 * Ab M0.3 entstehen hier Append mit `länge\tcrc32\tjson`, fsync, Hash-Kette,
 * Tail-Leser mit Quarantaene, Segmentwechsel, lokaler Spiegel und Praesenz.
 * Dieser Stand ist ein Geruest mit genau so viel Inhalt, dass die
 * Ringgrenze belegt ist: `node:` ist erlaubt, `@s1/domaene` ist erlaubt,
 * DOM/React/Electron nicht.
 */

import { createHash } from "node:crypto";
import path from "node:path";

import { einsatzKennung } from "@s1/domaene";

/** Unterordner eines Einsatzes auf dem Share (02-ZIELBILD.md, Dateilayout). */
export const EINSATZ_UNTERORDNER = [
  "ereignisse",
  "schnappschuesse",
  "praesenz",
  "anhaenge",
  "ausgaben",
] as const;

/**
 * Liefert den absoluten Pfad des Einsatzordners unterhalb der Share-Wurzel.
 *
 * Der Ordnername kommt aus `@s1/domaene`; dieses Paket steuert nur das
 * Zusammensetzen von Pfaden bei — die Regel, wie ein Einsatz heisst, gehoert
 * in den Fachkern.
 */
export function einsatzOrdner(shareWurzel: string, datum: string, name: string): string {
  return path.join(shareWurzel, "einsaetze", einsatzKennung(datum, name).ordner);
}

/**
 * Pfad einer Ereignisdatei. Jeder Client schreibt ausschliesslich eigene
 * Dateien — daher `clientId` im Dateinamen und ein Segmentzaehler statt einer
 * gemeinsamen Datei (tragende Festlegung 1 in 02-ZIELBILD.md).
 */
export function ereignisDatei(einsatzOrdnerPfad: string, clientId: string, segment: number): string {
  const nummer = String(segment).padStart(4, "0");
  return path.join(einsatzOrdnerPfad, "ereignisse", `${clientId}.${nummer}.jsonl`);
}

/**
 * Inhalts-Hash einer Datei- oder Segmentnutzlast (SHA-256, hexadezimal).
 *
 * Platzhalter fuer die spaetere Hash-Kette je Zeile; hier genuegt der
 * Nachweis, dass `node:crypto` in diesem Ring erlaubt ist.
 */
export function nutzlastHash(inhalt: string): string {
  return createHash("sha256").update(inhalt, "utf8").digest("hex");
}
