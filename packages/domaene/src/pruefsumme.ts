/**
 * CRC-32 nach IEEE 802.3 — die Prüfsumme, die zwei Ringe teilen.
 *
 * Sie steht in Ring 2, obwohl `KONZEPT-SPEICHER.md` §2.1 sie für das
 * Zeilenformat festlegt und `@s1/speicher` sie dort anwendet. Der Grund ist
 * ein zweiter Anwender: Der lokale Dateikopf eines ZIP-Eintrags trägt
 * dieselbe CRC-32 mit demselben Polynom, und `@s1/ausgaben` schreibt seit
 * M4.0 ZIP-Dateien — die Einsatzakte und die XLSX-Auswertung. Die beiden
 * Pakete sind Geschwister im selben Ring und importieren einander nicht
 * (02-ZIELBILD.md, „Vier Ringe“); eine zweite Tabelle desselben Polynoms
 * wären zwei Wahrheiten über dieselbe Zahl.
 *
 * **Die Regel bleibt, wo sie hingehört.** Dass eine Zeile diese Prüfsumme
 * trägt, dass sie mit acht Hexzeichen in Kleinbuchstaben geschrieben wird und
 * was ein Leser tut, wenn sie nicht stimmt, steht weiterhin in §2.1 und in
 * `@s1/speicher`. Hier steht nur die Rechnung, und die ist plattformneutral.
 */

/** Die Tabelle zum Polynom `0xEDB88320`, einmal gerechnet. */
const CRC_TABELLE: Uint32Array = (() => {
  const tabelle = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    }
    tabelle[n] = c >>> 0;
  }
  return tabelle;
})();

/**
 * CRC-32 über Bytes, als vorzeichenlose 32-Bit-Zahl.
 *
 * Diese Form braucht der ZIP-Kopf: Er trägt die Zahl als vier Bytes in
 * Little-Endian und nicht als Text. Die Textform steht daneben — beide über
 * derselben Rechnung, damit sie nie auseinanderlaufen können.
 */
export function crc32(bytes: Uint8Array): number {
  let c = 0xff_ff_ff_ff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = (CRC_TABELLE[(c ^ (bytes[i] as number)) & 0xff] as number) ^ (c >>> 8);
  }
  return (c ^ 0xff_ff_ff_ff) >>> 0;
}

/**
 * Dieselbe Prüfsumme als genau 8 Hexzeichen in **Kleinbuchstaben**
 * (KONZEPT-SPEICHER.md §2.1).
 *
 * Die Kleinschreibung ist festgelegt und nicht Geschmack: §2.3 verlangt sie
 * ausdrücklich auch für die Kettenprüfsumme, weil „eine offene Groß- und
 * Kleinschreibung eine stille Fehlerquelle wäre“ — der Wert wird als
 * Zeichenkette verglichen.
 */
export function crc32Hex(bytes: Uint8Array): string {
  return crc32(bytes).toString(16).padStart(8, "0");
}
