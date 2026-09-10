/**
 * Ein ZIP-Schreiber ohne Abhängigkeit (M4.0).
 *
 * Zwei Ausgaben von M4 sind ZIP-Dateien: die Auswertung als XLSX (M4.2 — eine
 * XLSX-Datei **ist** ein ZIP mit XML darin) und die Einsatzakte (M4.4). Der
 * Schreiber steht deshalb hier und nicht zweimal in den beiden Paketen, die
 * ihn brauchen.
 *
 * **Warum selbst geschrieben und keine Bibliothek.** Was hier gebraucht wird,
 * ist der kleinste Ausschnitt des Formats: Einträge ohne Verzeichnisse, ohne
 * Verschlüsselung, ohne Zip64, **ohne Kompression**. Das sind zwei Köpfe und
 * ein Zentralverzeichnis, und sie stehen unten vollständig. Eine Bibliothek
 * dafür wäre eine Abhängigkeit mehr in einem Produkt, das auf
 * Führungsstellen-Rechnern ohne Admin-Rechte läuft (05-UMSETZUNGSPLAN.md,
 * Feldversuch M-1) — und die Prüfsumme, die das Format verlangt, liegt
 * ohnehin bereits im Baum (§2.1).
 *
 * **Ohne Kompression** ist eine bewusste Wahl und keine Faulheit. Die
 * Speichermethode (`method: 0`) ist im Format regulär vorgesehen und wird von
 * jedem Leser unterstützt; sie erspart diesem Ring `node:zlib` — das er nach
 * 02-ZIELBILD.md nicht sehen darf — und die `CompressionStream` des Browsers,
 * die asynchron ist. Der Preis ist Dateigröße: Eine Einsatzakte mit 50.000
 * Ereignissen ist unkomprimiert einige Megabyte statt einiger hundert
 * Kilobyte. Sie wird auf einen Stick gelegt und nicht über eine Leitung
 * geschickt (BETRIEB.md, „USB-Übergabe"); die Größe ist dort der billigere
 * Preis.
 */

import { crc32 } from "@s1/domaene";

/** Ein Eintrag im Archiv. */
export interface Zipeintrag {
  /**
   * Der Pfad im Archiv, mit `/` als Trenner.
   *
   * **Immer `/`, auch auf Windows.** Das Format schreibt es vor (APPNOTE
   * 4.4.17.1), und ein Archiv mit Rückstrichen wird von fremden Lesern als
   * ein einziger Dateiname mit Sonderzeichen gelesen.
   */
  readonly pfad: string;
  readonly bytes: Uint8Array;
}

const KODIERER = new TextEncoder();

/** Die vier Signaturen, die das Format vorschreibt. */
const SIG_LOKAL = 0x04_03_4b_50;
const SIG_ZENTRAL = 0x02_01_4b_50;
const SIG_ENDE = 0x06_05_4b_50;

/**
 * Version und Merkmale, die jeder Eintrag trägt.
 *
 * `2.0` als benötigte Fassung ist die kleinste, die Verzeichnisnamen kennt.
 * Das Merkmalsbit 11 sagt: Der Dateiname ist UTF-8. Ohne dieses Bit deutet
 * ein Leser den Namen als Codepage 437, und aus „Stärke.html" wird
 * „StΣrke.html" — bei einem deutschsprachigen Produkt kein Randfall.
 */
const VERSION = 20;
const MERKMAL_UTF8 = 0x08_00;

/** Speichern statt komprimieren (APPNOTE 4.4.5, Methode 0). */
const METHODE_GESPEICHERT = 0;

class Puffer {
  #bytes: number[] = [];

  get laenge(): number {
    return this.#bytes.length;
  }

  u16(wert: number): void {
    this.#bytes.push(wert & 0xff, (wert >>> 8) & 0xff);
  }

  u32(wert: number): void {
    this.u16(wert & 0xff_ff);
    this.u16((wert >>> 16) & 0xff_ff);
  }

  roh(bytes: Uint8Array): void {
    for (const byte of bytes) this.#bytes.push(byte);
  }

  fertig(): Uint8Array {
    return Uint8Array.from(this.#bytes);
  }
}

/**
 * Wandelt einen Zeitpunkt in die MS-DOS-Form, die das Format verlangt.
 *
 * Zwei 16-Bit-Wörter mit Zwei-Sekunden-Auflösung, Jahr ab 1980 (APPNOTE
 * 4.4.6). Ein Zeitpunkt vor 1980 ist darin nicht darstellbar und wird auf den
 * 1. Januar 1980 geklemmt — er kommt im Betrieb nicht vor, aber ein Test mit
 * `new Date(0)` erzeugte sonst ein Archiv mit negativem Jahr, das kein Leser
 * öffnet.
 *
 * **Die Zeit ist Ortszeit ohne Zonenangabe** — das Format kennt keine. Sie
 * ist damit Anzeige und keine Ordnung, wie die Wanduhr in §2.6: Was zählt,
 * steht im Manifest der Einsatzakte, nicht im Dateidatum.
 */
export function dosZeit(zeitpunkt: Date): { readonly zeit: number; readonly datum: number } {
  const jahr = zeitpunkt.getFullYear();
  if (jahr < 1980) return { zeit: 0, datum: (1 << 5) | 1 };
  return {
    zeit:
      ((zeitpunkt.getHours() & 0x1f) << 11) |
      ((zeitpunkt.getMinutes() & 0x3f) << 5) |
      ((zeitpunkt.getSeconds() >> 1) & 0x1f),
    datum: (((jahr - 1980) & 0x7f) << 9) | (((zeitpunkt.getMonth() + 1) & 0x0f) << 5) | (zeitpunkt.getDate() & 0x1f),
  };
}

export interface Zipoptionen {
  /** Das Änderungsdatum aller Einträge; ohne Angabe der 1. Januar 1980. */
  readonly zeitpunkt?: Date;
}

/**
 * Schreibt ein Archiv.
 *
 * Der Aufbau ist der des Formats und in dieser Reihenfolge zwingend: je
 * Eintrag ein lokaler Kopf mit den Daten dahinter, danach das
 * Zentralverzeichnis mit einem Eintrag je Datei, zuletzt der Abschlusssatz,
 * der auf das Verzeichnis zeigt. Ein Leser liest **rückwärts**: Er sucht den
 * Abschlusssatz am Ende, findet darüber das Verzeichnis und springt von dort
 * an die Offsets. Deshalb ist die Reihenfolge keine Konvention, sondern die
 * Bedingung dafür, dass die Datei überhaupt lesbar ist.
 */
export function schreibeZip(
  eintraege: readonly Zipeintrag[],
  optionen: Zipoptionen = {},
): Uint8Array {
  const zeitpunkt = optionen.zeitpunkt ?? new Date(Date.UTC(1980, 0, 1));
  const { zeit, datum } = dosZeit(zeitpunkt);

  const lokal = new Puffer();
  const zentral = new Puffer();

  for (const eintrag of eintraege) {
    const name = KODIERER.encode(eintrag.pfad);
    const pruefsumme = crc32(eintrag.bytes);
    const offset = lokal.laenge;

    lokal.u32(SIG_LOKAL);
    lokal.u16(VERSION);
    lokal.u16(MERKMAL_UTF8);
    lokal.u16(METHODE_GESPEICHERT);
    lokal.u16(zeit);
    lokal.u16(datum);
    lokal.u32(pruefsumme);
    // Gespeichert heisst: komprimierte und unkomprimierte Groesse sind gleich.
    lokal.u32(eintrag.bytes.length);
    lokal.u32(eintrag.bytes.length);
    lokal.u16(name.length);
    lokal.u16(0); // kein Zusatzfeld
    lokal.roh(name);
    lokal.roh(eintrag.bytes);

    zentral.u32(SIG_ZENTRAL);
    // Erzeugende Fassung; das obere Byte nennt das Dateisystem. 0 heisst
    // MS-DOS/FAT und ist die Angabe, mit der jeder Leser zurechtkommt — die
    // Rechte, die ein Unix-Wert dort mitfuehren wuerde, hat eine Ausgabe
    // dieses Programms ohnehin nicht.
    zentral.u16(VERSION);
    zentral.u16(VERSION);
    zentral.u16(MERKMAL_UTF8);
    zentral.u16(METHODE_GESPEICHERT);
    zentral.u16(zeit);
    zentral.u16(datum);
    zentral.u32(pruefsumme);
    zentral.u32(eintrag.bytes.length);
    zentral.u32(eintrag.bytes.length);
    zentral.u16(name.length);
    zentral.u16(0); // kein Zusatzfeld
    zentral.u16(0); // kein Kommentar
    zentral.u16(0); // Datentraeger 0
    zentral.u16(0); // interne Merkmale
    zentral.u32(0); // externe Merkmale
    zentral.u32(offset);
    zentral.roh(name);
  }

  const ende = new Puffer();
  ende.u32(SIG_ENDE);
  ende.u16(0); // dieser Datentraeger
  ende.u16(0); // Datentraeger mit dem Verzeichnisanfang
  ende.u16(eintraege.length);
  ende.u16(eintraege.length);
  ende.u32(zentral.laenge);
  ende.u32(lokal.laenge);
  ende.u16(0); // kein Archivkommentar

  const lokalBytes = lokal.fertig();
  const zentralBytes = zentral.fertig();
  const endeBytes = ende.fertig();
  const alles = new Uint8Array(lokalBytes.length + zentralBytes.length + endeBytes.length);
  alles.set(lokalBytes, 0);
  alles.set(zentralBytes, lokalBytes.length);
  alles.set(endeBytes, lokalBytes.length + zentralBytes.length);
  return alles;
}

/** Bequemlichkeit: ein Eintrag aus Text, immer UTF-8. */
export function textEintrag(pfad: string, text: string): Zipeintrag {
  return { pfad, bytes: KODIERER.encode(text) };
}
