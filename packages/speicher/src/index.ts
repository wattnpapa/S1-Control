/**
 * `@s1/speicher` — Ring 3: alles, was das Dateisystem berührt.
 *
 * Stand M0.3: das Ereignisprotokoll auf dem Share nach
 * `docs/v2/konzepte/KONZEPT-SPEICHER.md` — Zeilenformat mit `länge \t crc32 \t
 * json` und `fsync` je Zeile (§2), Hash-Kette (§2.3), Segmente und
 * Schreiberidentität (§4), lokaler Spiegel mit `upload-state.json` und
 * Spiegelung mit der Präfix-Invariante (§5), Poll am Offset und Präsenz (§6),
 * Fehlerbilder und Quarantäne (§8).
 *
 * Alle Paragraphenverweise in diesem Paket zeigen auf dieses Dokument, wie
 * 05-UMSETZUNGSPLAN.md §3 es verlangt.
 *
 * Verbindliche Grenze (02-ZIELBILD.md, „Vier Ringe"): `node:` und
 * `@s1/domaene` sind erlaubt, Electron, React, `@s1/ausgaben` und `@s1/cli`
 * nicht. Die Regel ist in `eslint.config.mjs` erzwungen, nicht bloß notiert.
 *
 * Zwei Nähte sind hier ausdrücklich gebaut, nicht nachzurüsten:
 *  * `Dateisystem` (§5.4.2, §6.2) — M0.4 hängt daran seine feindliche Schicht.
 *    Der Port bietet **keine** Größen- oder Metadatenabfrage an.
 *  * `Zeitquelle` (§8, Vorbemerkung) — keine Komponente ruft eine Uhr
 *    unmittelbar auf; sonst wären die Fristen aus §5.4.4, §6.2, §6.4 und §8.1
 *    nicht in Unit-Tests prüfbar.
 */

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

// Verwaltungsereignisse §2.4, §4.3, §4.6 — mehr Ereignisarten kennt diese Schicht nicht.
export {
  TYP_SEGMENT_ABGESCHLOSSEN,
  TYP_SEGMENT_ERSETZT,
  VERWALTUNGSTYPEN,
  istVerwaltungsereignis,
  nachfolgerAus,
  type AbschlussNutzlast,
  type ErsatzNutzlast,
} from "./verwaltungsereignisse.js";

// Geprueftes Lesen einer Segmentdatei §5.5; das Dateiende wird gelesen, nie erfragt (§5.4.2).
export { angekuendigterNachfolger, liesSegment, type Segmentbefund } from "./segmentlese.js";

// Die gesehenen Identitaeten aus dem lokalen Spiegel §5.3.
export { Identitaetenbuch } from "./identitaeten.js";

// Der Schreiber §5.2, §4.2, §4.3, §4.5, §4.6, §8.8.
export {
  Schreiber,
  oeffneSchreiber,
  type Ereignisentwurf,
  type GeschriebeneZeile,
  type Schreibergebnis,
  type SchreiberOptionen,
} from "./schreiber.js";
export {
  LokalerKettenbruch,
  bereiteSchreiberVor,
  type Schreiberbestand,
  type StartOptionen,
} from "./schreiberStart.js";

// Spiegelung §5.4 mit der Praefix-Invariante §5.4.1 und den drei Ausgaengen §5.4.3.
export {
  MELDUNG_BESCHAEDIGT,
  MELDUNG_KEIN_SCHREIBRECHT,
  MELDUNG_NICHT_ERREICHBAR,
  MELDUNG_ORDNER_FORT,
  MELDUNG_PROFIL_KOPIERT,
  Spiegelung,
  type Spiegelergebnis,
  type SpiegelungOptionen,
} from "./spiegelung.js";
export { vergleicheSpiegel, type VergleichEingabe, type Vergleichsausgang } from "./spiegelvergleich.js";

// Der Tail-Leser §5.5 mit Quarantaene §8.1/§8.2 und den zwei Takten §6.2.
export {
  Leser,
  type LeserOptionen,
  type Pollergebnis,
  type Quarantaenemeldung,
  type Takt,
} from "./leser.js";
export { leseZeilengrenzen } from "./zeile.js";
export { ersatzAus } from "./verwaltungsereignisse.js";

// Pruefung beim Oeffnen: Fremdschreiber §4.5 Fall 2 und Vollpruefung §4.6.1.
export {
  pruefeBeimOeffnen,
  type Oeffnungsbefund,
  type OeffnungspruefungOptionen,
} from "./oeffnungspruefung.js";

// Praesenz §6.4 und der Quarantaenehinweis als Beschleuniger §4.6.1.
export {
  PRAESENZ_ORDNER,
  deutePraesenz,
  hinweiseAufEigeneDateien,
  istVeraltet,
  liesFremdePraesenz,
  schreibePraesenz,
  type FremdePraesenz,
  type Praesenz,
  type PraesenzOptionen,
  type Quarantaenehinweis,
} from "./praesenz.js";

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
