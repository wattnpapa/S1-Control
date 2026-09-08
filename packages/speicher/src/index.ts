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

// ---------------------------------------------------------------------------
// M0.3 — Ereignisprotokoll auf dem Share (KONZEPT-SPEICHER.md)
// ---------------------------------------------------------------------------

// Startwerte nach §10, an einer Stelle. M0.5 aendert Zahlen, nicht Code.
export * from "./startwerte.js";

// Die Naht fuer M0.4: Dateisystem-Port ohne Groessenabfrage (§5.4.2, §6.2)
// und die injizierte Zeitquelle (§8 Vorbemerkung).
export { DateisystemFehler, type Dateisystem, type Dauerhaftigkeit, type Fehlercode } from "./dateisystem.js";
export { knotenDateisystem } from "./knotenDateisystem.js";
export { Frist, systemZeit, wanduhrText, type Zeitquelle } from "./zeit.js";

// Fehlerklassen §8.8 und §8.9.
export {
  lokalDauerhafterHinweis,
  lokaleSchreibstoerungMeldung,
  lokalWiederholbar,
  shareklasse,
  type Shareklasse,
} from "./fehler.js";

// Pruefsummen §2.1 und §2.3; `sha256Hex` ist die Naht zu `zustandsHash` (§7.6).
export {
  KETTE_ANFANG,
  KETTE_ZEICHEN,
  crc32Hex,
  istKette,
  kettenPruefsumme,
  sha256Hex,
  sha256HexBytes,
} from "./pruefsummen.js";

// Zeilenformat, Pruefung und Hash-Kette §2.1 bis §2.3, §8.1, §8.2, §4.6.
export {
  baueZeile,
  inhaltsSchluessel,
  leseAbschnitt,
  type Abschluss,
  type Abschnittsergebnis,
  type Defektgrund,
  type GeleseneZeile,
  type Identitaetenblick,
  type Rahmenblick,
} from "./zeile.js";

// Dateilayout und Benennung §1.4 und §4.1.
export {
  CLIENT_PRAEFIX_STELLEN,
  DATEI_ARCHIV_MARKER,
  DATEI_EINSATZ,
  DATEI_SCHREIBER,
  DATEI_UPLOAD_ZUSTAND,
  ERSTES_SEGMENT,
  Einsatzablage,
  ORDNER_ANHAENGE,
  ORDNER_AUSGABEN,
  ORDNER_EREIGNISSE,
  ORDNER_PRAESENZ,
  ORDNER_SCHNAPPSCHUESSE,
  SEGMENT_STELLEN,
  clientPraefix,
  ereignisDateiname,
  segmentText,
  zerlegeEreignisDateiname,
  type Dateikennung,
} from "./pfade.js";

// `schreiber.json` §4.4 — Beschleuniger, kein Wahrheitstraeger.
export {
  deuteSchreiberzustand,
  liesSchreiberzustand,
  neuerSchreiberzustand,
  schreibeSchreiberzustand,
  type Schreiberzustand,
} from "./schreiberzustand.js";

// `upload-state.json` §5.3.
export {
  deuteUploadZustand,
  leererUploadZustand,
  liesUploadZustand,
  neuerEigenerOffset,
  neuerFremderOffset,
  schreibeUploadZustand,
  type EigenerOffset,
  type FremderOffset,
  type Stuetzstelle,
  type UploadZustand,
} from "./uploadZustand.js";

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
