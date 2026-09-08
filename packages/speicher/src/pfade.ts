/**
 * Dateilayout und Benennung — KONZEPT-SPEICHER.md §1.4 und §4.1.
 *
 * ```
 * <share>\S1-Control\
 *   einsaetze\<datum>_<slug>_<kurzid>\
 *     einsatz.json                             unveränderlich, §5.6
 *     ereignisse\<clientId8>.<segment>.jsonl   ein Schreiber je Datei, §2, §4
 *     schnappschuesse\<hlc>.json               §7
 *     praesenz\<clientId>.json                 §6.4
 *     archiv.marker                            abgeleiteter Anzeiger, §5.7
 * ```
 *
 * Lokal je Client dieselbe Struktur als Spiegel, zusätzlich
 * `upload-state.json` (§5.3) und `schreiber.json` (§4.4).
 *
 * Kurze Namen sind kein Selbstzweck (§4.1): Verzeichnisauflistungen über SMB
 * sind eine der teuren Operationen, und lange Namen verlängern die Antwort.
 * Deshalb steht im Namen der Ereignisdatei nur `clientId8`; die vollständige
 * Kennung steht in jedem Ereignisrahmen und in der Präsenzdatei.
 */

import path from "node:path";

/** Unterordner eines Einsatzes (§1.4). */
export const ORDNER_EREIGNISSE = "ereignisse";
export const ORDNER_SCHNAPPSCHUESSE = "schnappschuesse";
export const ORDNER_PRAESENZ = "praesenz";
export const ORDNER_ANHAENGE = "anhaenge";
export const ORDNER_AUSGABEN = "ausgaben";

/** Dateien eines Einsatzes (§1.4, §5.6, §5.7). */
export const DATEI_EINSATZ = "einsatz.json";
export const DATEI_ARCHIV_MARKER = "archiv.marker";
/** Nur lokal, nie auf dem Share (§4.4, §5.3). */
export const DATEI_SCHREIBER = "schreiber.json";
export const DATEI_UPLOAD_ZUSTAND = "upload-state.json";

/** Stellenzahl der Segmentnummer im Dateinamen (§4.1). */
export const SEGMENT_STELLEN = 4;
/** Stellenzahl des Kennungspräfixes im Dateinamen (§4.1, Annahme A3). */
export const CLIENT_PRAEFIX_STELLEN = 8;

/** Erstes Segment eines Clients in einem Einsatz (§4.1). */
export const ERSTES_SEGMENT = 0;

/**
 * Die ersten 8 Hexziffern der `clientId` (§4.1).
 *
 * Annahme A3: Bei bis zu 5 gleichzeitigen Clients ist eine Kollision praktisch
 * ausgeschlossen. Sie wird trotzdem geprüft — §4.5 behandelt sie als
 * Sonderfall, nicht als eigenen Mechanismus.
 */
export function clientPraefix(clientId: string): string {
  const hex = clientId.replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (hex.length < CLIENT_PRAEFIX_STELLEN) {
    // Kurze oder nicht-hexadezimale Kennungen kommen in Tests vor; das Präfix
    // bleibt dann eben kürzer. Eindeutig ist ohnehin erst die vollständige
    // Kennung im Rahmen.
    return hex.length > 0 ? hex : clientId.slice(0, CLIENT_PRAEFIX_STELLEN);
  }
  return hex.slice(0, CLIENT_PRAEFIX_STELLEN);
}

/** Vierstellige, links mit Nullen gefüllte Segmentnummer (§4.1). */
export function segmentText(segment: number): string {
  if (!Number.isInteger(segment) || segment < 0) {
    throw new RangeError(`Segmentnummer muss eine nicht-negative ganze Zahl sein: ${segment}`);
  }
  return String(segment).padStart(SEGMENT_STELLEN, "0");
}

/** Dateiname einer Ereignisdatei: `<clientId8>.<segment>.jsonl` (§4.1). */
export function ereignisDateiname(clientId: string, segment: number): string {
  return `${clientPraefix(clientId)}.${segmentText(segment)}.jsonl`;
}

/** Ein zerlegter Ereignisdateiname. */
export interface Dateikennung {
  readonly praefix: string;
  readonly segment: number;
  readonly name: string;
}

/**
 * Zerlegt einen Dateinamen aus `ereignisse\` (§4.1).
 *
 * Liefert `undefined` für alles, was nicht dem Muster entspricht — ein fremdes
 * Werkzeug darf dort eine Datei ablegen, ohne dass der Poll darüber stolpert.
 */
export function zerlegeEreignisDateiname(name: string): Dateikennung | undefined {
  const treffer = new RegExp(`^([0-9a-f]{1,${CLIENT_PRAEFIX_STELLEN}})\\.(\\d{${SEGMENT_STELLEN}})\\.jsonl$`).exec(
    name,
  );
  if (treffer === null) return undefined;
  return { praefix: treffer[1] as string, segment: Number(treffer[2]), name };
}

/** Die Pfade eines geöffneten Einsatzes — auf dem Share und im lokalen Spiegel. */
export class Einsatzablage {
  /** Einsatzordner auf dem Share. */
  readonly share: string;
  /** Einsatzordner im lokalen Spiegel (§5.1). */
  readonly lokal: string;

  constructor(shareEinsatzOrdner: string, lokalerEinsatzOrdner: string) {
    this.share = shareEinsatzOrdner;
    this.lokal = lokalerEinsatzOrdner;
  }

  /** Ereignisordner auf dem Share. */
  get shareEreignisse(): string {
    return path.join(this.share, ORDNER_EREIGNISSE);
  }

  /** Ereignisordner im lokalen Spiegel. */
  get lokalEreignisse(): string {
    return path.join(this.lokal, ORDNER_EREIGNISSE);
  }

  /** Präsenzordner auf dem Share (§6.4). */
  get sharePraesenz(): string {
    return path.join(this.share, ORDNER_PRAESENZ);
  }

  /** `einsatz.json` auf dem Share (§5.6) — der Anker der Pfadprüfung aus §5.7. */
  get shareEinsatzDatei(): string {
    return path.join(this.share, DATEI_EINSATZ);
  }

  /** `schreiber.json`, ausschließlich lokal (§4.4). */
  get schreiberDatei(): string {
    return path.join(this.lokal, DATEI_SCHREIBER);
  }

  /** `upload-state.json`, ausschließlich lokal (§5.3). */
  get uploadZustandDatei(): string {
    return path.join(this.lokal, DATEI_UPLOAD_ZUSTAND);
  }

  /** Ereignisdatei eines Segments auf dem Share. */
  shareSegment(clientId: string, segment: number): string {
    return path.join(this.shareEreignisse, ereignisDateiname(clientId, segment));
  }

  /** Ereignisdatei eines Segments im lokalen Spiegel. */
  lokalSegment(clientId: string, segment: number): string {
    return path.join(this.lokalEreignisse, ereignisDateiname(clientId, segment));
  }

  /** Ereignisdatei nach ihrem Dateinamen — für fremde Dateien, deren Kennung nur als Präfix vorliegt. */
  shareDatei(name: string): string {
    return path.join(this.shareEreignisse, name);
  }

  /** Spiegelkopie einer fremden Datei (§5.1). */
  lokalDatei(name: string): string {
    return path.join(this.lokalEreignisse, name);
  }

  /** Präsenzdatei eines Clients; im Namen steht die **vollständige** Kennung (§6.4). */
  praesenzDatei(clientId: string): string {
    return path.join(this.sharePraesenz, `${clientId}.json`);
  }
}
