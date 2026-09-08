/**
 * Zeilenformat, Prüfung und Hash-Kette — KONZEPT-SPEICHER.md §2.1 bis §2.3,
 * §4.6 („Was ‚gleicher Inhalt' heißt") und §8.1/§8.2.
 *
 * ```
 * <länge> \t <crc32> \t <json> \n
 * ```
 *
 * Das Längenpräfix steht zusätzlich zum Zeilenumbruch da, damit „der Leser ein
 * Teilschreiben von einem echten Defekt unterscheiden kann, ohne zu raten"
 * (§2.1). Der CRC schließt das Längenfeld ein, weil `länge` sonst das einzige
 * ungeschützte Feld wäre — und zugleich dasjenige, von dem die Abgrenzung
 * „unvollständig gegen defekt" vollständig abhängt.
 */

import { kanonischeSerialisierung, type KanonischerWert } from "@s1/domaene";

import {
  KETTE_ANFANG,
  crc32Hex,
  istKette,
  kettenPruefsumme,
} from "./pruefsummen.js";
import { LAENGE_MAX_ZIFFERN, ZEILE_MAX_BYTE } from "./startwerte.js";

const TABULATOR = 0x09;
const ZEILENENDE = 0x0a;
const NULL_ZIFFER = 0x30;
const NEUN_ZIFFER = 0x39;

const kodierer = new TextEncoder();
const dekodierer = new TextDecoder("utf-8", { fatal: true });

/**
 * Der Blick der Speicherschicht auf einen Ereignisrahmen (§2.4).
 *
 * Sie kennt genau diese drei Felder als Pflicht; alles Weitere ist für sie
 * undurchsichtige Nutzlast und wird unverändert durchgereicht (§2.5).
 */
export interface Rahmenblick {
  /** `<clientId>:<laufnummer>` (§3.3). */
  readonly id: string;
  /** Kettenprüfsumme der vorhergehenden Zeile derselben Schreiberkette (§2.3). */
  readonly vorgaenger: string;
  /** Ereignisart; die Speicherschicht kennt davon nur zwei (§2.4, §4.3, §4.6). */
  readonly typ: string;
  readonly [feld: string]: unknown;
}

/** Eine vollständige, geprüfte Zeile. */
export interface GeleseneZeile {
  /** Byte-Offset des Zeilenanfangs in ihrer Datei. */
  readonly offset: number;
  /** Gesamtlänge der Zeile in Byte, einschließlich `\n`. */
  readonly laenge: number;
  /** Die vollständigen Bytes der Zeile, einschließlich `\n`. */
  readonly bytes: Uint8Array;
  /** Der geparste Rahmen. */
  readonly rahmen: Rahmenblick;
  /** Kettenprüfsumme **dieser** Zeile — der `vorgaenger` der nächsten (§2.3). */
  readonly kette: string;
  /**
   * `true`, wenn diese Zeile eine bereits gelesene Identität mit identischem
   * Inhalt wiederholt (§8.2, §4.6). Sie ist kein Defekt, sondern dasselbe
   * Ereignis, und wird übersprungen.
   */
  readonly wiederholung: boolean;
}

/** Warum eine Zeile nach §8.2 defekt ist. Der Grund wird gemeldet, nicht geraten. */
export type Defektgrund =
  /** Regel 1: `länge` ist keine Dezimalzahl ohne führende Null, zu lang oder über 1 MiB. */
  | "laenge"
  /** Regel 3: genug Bytes, aber an der angekündigten Stelle steht kein `\n`. */
  | "keinZeilenende"
  /** Regel 4: `crc32` stimmt nicht. */
  | "crc"
  /** Regel 4: das JSON ist nicht parsebar oder kein brauchbarer Rahmen. */
  | "json"
  /** Regel 4: `vorgaenger` passt nicht zur berechneten Kette. */
  | "kette"
  /** §8.2 letzte Regel: dieselbe Identität mit **anderem** Inhalt. */
  | "identitaetAnders";

/** Was am Ende eines gelesenen Abschnitts steht. */
export type Abschluss =
  /** Der Abschnitt endet sauber an einer Zeilengrenze. */
  | { readonly art: "ende" }
  /** Die Datei endet mitten in einer Zeile (§8.1). Kein Fehler, keine Meldung. */
  | { readonly art: "unvollstaendig" }
  /** Ab `offset` steht ein Defekt (§8.2). Quarantäne ab genau dieser Stelle. */
  | { readonly art: "defekt"; readonly offset: number; readonly grund: Defektgrund };

/** Das Ergebnis von {@link leseAbschnitt}. */
export interface Abschnittsergebnis {
  /** Die geprüften Zeilen in Dateireihenfolge, Wiederholungen eingeschlossen. */
  readonly zeilen: readonly GeleseneZeile[];
  /** Byte-Offset hinter der letzten vollständigen, kettenrichtigen Zeile. */
  readonly endeOffset: number;
  /** Kettenprüfsumme an genau diesem Offset — damit der nächste Abschnitt lückenlos anschließt (§5.3). */
  readonly letzteKette: string;
  readonly abschluss: Abschluss;
}

/**
 * Fragt, welchen Inhalt eine bereits gelesene Identität hatte (§8.2, §4.6).
 *
 * Liefert `undefined`, wenn die Identität unbekannt ist. Die Menge der
 * gesehenen Identitäten wird beim Öffnen aus dem lokalen Spiegel aufgebaut
 * (§5.3), damit die Regel auch nach einem Neustart greift und nicht bloß
 * innerhalb einer Sitzung.
 */
export interface Identitaetenblick {
  inhaltVon(id: string): string | undefined;
}

/**
 * Der Inhaltsschlüssel einer Zeile: der Rahmen **ohne** `vorgaenger` (§4.6).
 *
 * Verbindlich aus §4.6: „Inhalt ist der Ereignisrahmen nach §2.4 ohne das Feld
 * `vorgaenger`. Zwei Zeilen haben gleichen Inhalt, wenn sie sich nur in
 * `vorgaenger` unterscheiden."
 *
 * Ein Byte-Vergleich ist nur dort zulässig, wo beide Zeilen derselben Kette
 * angehören — in §4.5 Schritt 4. Überall sonst (§5.4.3 Ausgang B und C, §8.2,
 * §4.6) wird über diesen Schlüssel verglichen. Wer das verwechselt, setzt beim
 * Reparaturweg nach §4.6 genau die Leser in Quarantäne, die vorher gesund
 * waren: Die wiederholte Zeile eines Ersatzsegments ist byteweise zwangsläufig
 * verschieden, weil ihr `vorgaenger` an einer anderen Vorgängerzeile hängt.
 */
export function inhaltsSchluessel(rahmen: Rahmenblick): string {
  const ohneVorgaenger: Record<string, unknown> = { ...rahmen };
  delete ohneVorgaenger["vorgaenger"];
  return kanonischeSerialisierung(ohneVorgaenger as KanonischerWert);
}

/**
 * Baut die Bytes einer Zeile nach §2.1.
 *
 * Der Rahmen wird **kanonisch** serialisiert (§7.6). Das ist mehr, als §2.1
 * verlangt, und mit Absicht: Nur so sind die Bytes einer Zeile unabhängig von
 * der Einfügereihenfolge der Felder reproduzierbar — was §4.5 Schritt 4
 * (Byte-Vergleich derselben Kette) und §4.6 Schritt 4 (dieselben Ereignisse
 * noch einmal schreiben) beide brauchen.
 */
export function baueZeile(rahmen: Rahmenblick): Uint8Array {
  const json = kodierer.encode(kanonischeSerialisierung(rahmen as KanonischerWert));
  if (json.byteLength > ZEILE_MAX_BYTE) {
    throw new RangeError(
      `Zeile über der Obergrenze von ${ZEILE_MAX_BYTE} Byte (§2.1): ${json.byteLength}`,
    );
  }
  const laenge = kodierer.encode(String(json.byteLength));
  // Der CRC deckt `<länge> \t <json>` ab — das Längenfeld eingeschlossen (§2.1).
  const crcQuelle = new Uint8Array(laenge.byteLength + 1 + json.byteLength);
  crcQuelle.set(laenge, 0);
  crcQuelle[laenge.byteLength] = TABULATOR;
  crcQuelle.set(json, laenge.byteLength + 1);

  const crc = kodierer.encode(crc32Hex(crcQuelle));
  const zeile = new Uint8Array(laenge.byteLength + 1 + crc.byteLength + 1 + json.byteLength + 1);
  let ziel = 0;
  zeile.set(laenge, ziel);
  ziel += laenge.byteLength;
  zeile[ziel] = TABULATOR;
  ziel += 1;
  zeile.set(crc, ziel);
  ziel += crc.byteLength;
  zeile[ziel] = TABULATOR;
  ziel += 1;
  zeile.set(json, ziel);
  ziel += json.byteLength;
  zeile[ziel] = ZEILENENDE;
  return zeile;
}

/** Zwischenbefund des Kopfes einer Zeile: Länge gelesen, noch nichts geprüft. */
type Kopf =
  | { readonly art: "kopf"; readonly laenge: number; readonly ziffern: number }
  | { readonly art: "unvollstaendig" }
  | { readonly art: "defekt"; readonly grund: Defektgrund };

/**
 * Liest das Längenfeld nach §2.1 und wendet Regel 1 aus §8.2 an.
 *
 * Regel 1 zuerst und nicht später: Eine `länge` mit mehr als sieben Ziffern
 * oder über 1 MiB ist defekt, **unabhängig davon, wie viele Bytes tatsächlich
 * vorhanden sind**. Ohne diese Schranke ließe ein verfälschtes Längenfeld
 * einen Leser dauerhaft auf Bytes warten, die es nicht gibt.
 */
function leseKopf(puffer: Uint8Array, ab: number): Kopf {
  let i = ab;
  let ziffern = 0;
  let wert = 0;
  while (i < puffer.length) {
    const byte = puffer[i] as number;
    if (byte === TABULATOR) break;
    if (byte < NULL_ZIFFER || byte > NEUN_ZIFFER) return { art: "defekt", grund: "laenge" };
    if (ziffern === 0 && byte === NULL_ZIFFER) return { art: "defekt", grund: "laenge" };
    ziffern += 1;
    if (ziffern > LAENGE_MAX_ZIFFERN) return { art: "defekt", grund: "laenge" };
    wert = wert * 10 + (byte - NULL_ZIFFER);
    i += 1;
  }
  if (i >= puffer.length) {
    // Der Tabulator ist noch nicht da. Solange die bisher gelesenen Ziffern
    // zulässig sind, ist das ein Teilschreiben (§8.1), kein Defekt.
    return { art: "unvollstaendig" };
  }
  if (ziffern === 0) return { art: "defekt", grund: "laenge" };
  if (wert > ZEILE_MAX_BYTE) return { art: "defekt", grund: "laenge" };
  return { art: "kopf", laenge: wert, ziffern };
}

interface Zeilenbefund {
  readonly zeile?: GeleseneZeile;
  readonly abschluss?: Abschluss;
}

/**
 * Prüft genau eine Zeile ab `ab` gegen die vier Regeln aus §8.2, in der dort
 * festgelegten Reihenfolge. Es wird nicht geraten: Jede Zeile fällt in genau
 * eine Regel.
 */
function pruefeZeile(
  puffer: Uint8Array,
  ab: number,
  absoluterOffset: number,
  erwarteteKette: string,
  identitaeten: Identitaetenblick | undefined,
): Zeilenbefund {
  const kopf = leseKopf(puffer, ab);
  if (kopf.art === "unvollstaendig") return { abschluss: { art: "unvollstaendig" } };
  if (kopf.art === "defekt") {
    return { abschluss: { art: "defekt", offset: absoluterOffset, grund: kopf.grund } };
  }

  // Regel 2: Sind weniger Bytes vorhanden, als `länge` samt Trennzeichen und
  // `\n` verlangt, ist die Zeile unvollständig (§8.1) — bis die Frist dort
  // abläuft. Kein Defekt, keine Meldung.
  const jsonAb = ab + kopf.ziffern + 1 + 8 + 1;
  const gesamt = kopf.ziffern + 1 + 8 + 1 + kopf.laenge + 1;
  if (ab + gesamt > puffer.length) return { abschluss: { art: "unvollstaendig" } };

  // Regel 3: Genug Bytes, aber an der angekündigten Stelle steht kein `\n`.
  if (puffer[ab + gesamt - 1] !== ZEILENENDE) {
    return { abschluss: { art: "defekt", offset: absoluterOffset, grund: "keinZeilenende" } };
  }

  // Regel 4, erster Teil: `crc32`. Der Trennzeichenprüfung bedarf es nicht
  // gesondert — steht dort kein Tabulator, verschiebt sich der JSON-Bereich,
  // und der CRC fällt darauf herein.
  const crcFeld = puffer.subarray(ab + kopf.ziffern + 1, ab + kopf.ziffern + 1 + 8);
  const json = puffer.subarray(jsonAb, jsonAb + kopf.laenge);
  const crcQuelle = puffer.subarray(ab, ab + kopf.ziffern);
  const gepruefteQuelle = new Uint8Array(crcQuelle.byteLength + 1 + json.byteLength);
  gepruefteQuelle.set(crcQuelle, 0);
  gepruefteQuelle[crcQuelle.byteLength] = TABULATOR;
  gepruefteQuelle.set(json, crcQuelle.byteLength + 1);
  let crcText: string;
  try {
    crcText = dekodierer.decode(crcFeld);
  } catch {
    return { abschluss: { art: "defekt", offset: absoluterOffset, grund: "crc" } };
  }
  if (crcText !== crc32Hex(gepruefteQuelle)) {
    return { abschluss: { art: "defekt", offset: absoluterOffset, grund: "crc" } };
  }

  // Regel 4, zweiter Teil: das JSON und der Rahmen.
  const rahmen = leseRahmen(json);
  if (rahmen === undefined) {
    return { abschluss: { art: "defekt", offset: absoluterOffset, grund: "json" } };
  }

  // Regel 4, dritter Teil: die Hash-Kette (§2.3).
  if (rahmen.vorgaenger !== erwarteteKette) {
    return { abschluss: { art: "defekt", offset: absoluterOffset, grund: "kette" } };
  }

  const bytes = puffer.slice(ab, ab + gesamt);
  const kette = kettenPruefsumme(bytes);

  // §8.2, letzte Regel: Dieselbe Identität mit **anderem** Inhalt ist defekt;
  // mit identischem Inhalt ist es dasselbe Ereignis und wird übersprungen.
  let wiederholung = false;
  const bekannt = identitaeten?.inhaltVon(rahmen.id);
  if (bekannt !== undefined) {
    if (bekannt !== inhaltsSchluessel(rahmen)) {
      return { abschluss: { art: "defekt", offset: absoluterOffset, grund: "identitaetAnders" } };
    }
    wiederholung = true;
  }

  return {
    zeile: { offset: absoluterOffset, laenge: gesamt, bytes, rahmen, kette, wiederholung },
  };
}

function leseRahmen(json: Uint8Array): Rahmenblick | undefined {
  let text: string;
  try {
    text = dekodierer.decode(json);
  } catch {
    return undefined;
  }
  let wert: unknown;
  try {
    wert = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof wert !== "object" || wert === null || Array.isArray(wert)) return undefined;
  const objekt = wert as Record<string, unknown>;
  if (typeof objekt["id"] !== "string" || objekt["id"].length === 0) return undefined;
  if (typeof objekt["typ"] !== "string") return undefined;
  if (!istKette(objekt["vorgaenger"])) return undefined;
  return objekt as unknown as Rahmenblick;
}

/**
 * Liest einen Abschnitt Bytes und prüft jede Zeile (§5.5).
 *
 * Die Reihenfolge ist verbindlich: geprüft wird **vor** dem Anhängen an den
 * lokalen Spiegel, nie danach. Deshalb liefert diese Funktion nur, was geprüft
 * ist, und benennt getrennt, was am Ende steht.
 *
 * @param puffer          Die gelesenen Bytes.
 * @param startOffset     Absoluter Byte-Offset, an dem `puffer` in der Datei beginnt.
 * @param erwarteteKette  Kettenprüfsumme an `startOffset`; für die erste Zeile des
 *                        ersten Segments 32 Nullen (§2.3).
 * @param identitaeten    Bereits gesehene Identitäten (§8.2); optional.
 */
export function leseAbschnitt(
  puffer: Uint8Array,
  startOffset: number,
  erwarteteKette: string = KETTE_ANFANG,
  identitaeten?: Identitaetenblick,
): Abschnittsergebnis {
  const zeilen: GeleseneZeile[] = [];
  let ab = 0;
  let kette = erwarteteKette;
  for (;;) {
    if (ab >= puffer.length) {
      return { zeilen, endeOffset: startOffset + ab, letzteKette: kette, abschluss: { art: "ende" } };
    }
    const befund = pruefeZeile(puffer, ab, startOffset + ab, kette, identitaeten);
    if (befund.abschluss !== undefined) {
      return { zeilen, endeOffset: startOffset + ab, letzteKette: kette, abschluss: befund.abschluss };
    }
    const zeile = befund.zeile as GeleseneZeile;
    zeilen.push(zeile);
    kette = zeile.kette;
    ab += zeile.laenge;
  }
}
