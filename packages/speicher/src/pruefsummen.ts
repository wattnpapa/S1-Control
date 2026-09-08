/**
 * CRC-32 und SHA-256 — die beiden Prüfsummen aus KONZEPT-SPEICHER.md §2.1 und
 * §2.3.
 *
 * Warum beide: „CRC-32 erkennt Übertragungs- und Speicherfehler, ist aber
 * trivial fälschbar. Die Hash-Kette erkennt darüber hinaus jede nachträgliche
 * Änderung innerhalb einer Schreiberkette, weil sie alle Folgezeilen ungültig
 * macht" (§2.3). Was sie nicht leistet, steht in §8.6.2.
 *
 * SHA-256 kommt aus `node:crypto`, also aus der Standardbibliothek — kein
 * natives Modul (§2.3, 02-ZIELBILD.md „Stack"). Diese Schicht ist zugleich die
 * Naht, an der `@s1/domaene` seine SHA-256-Funktion bekommt: `zustandsHash`
 * nimmt sie als Parameter entgegen, weil der Fachkern `node:` nicht sehen darf.
 */

import { createHash } from "node:crypto";

import type { Sha256Hex } from "@s1/domaene";

/** CRC-32 nach IEEE 802.3, Polynom `0xEDB88320` (§2.1). */
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
 * CRC-32 über Bytes, als genau 8 Hexzeichen in **Kleinbuchstaben** (§2.1).
 *
 * Die Kleinschreibung ist festgelegt und nicht Geschmack: §2.3 verlangt sie
 * ausdrücklich auch für die Kettenprüfsumme, weil „eine offene Groß- und
 * Kleinschreibung eine stille Fehlerquelle wäre" — der Wert wird als
 * Zeichenkette verglichen.
 */
export function crc32Hex(bytes: Uint8Array): string {
  let c = 0xff_ff_ff_ff;
  for (let i = 0; i < bytes.length; i += 1) {
    c = (CRC_TABELLE[(c ^ (bytes[i] as number)) & 0xff] as number) ^ (c >>> 8);
  }
  return ((c ^ 0xff_ff_ff_ff) >>> 0).toString(16).padStart(8, "0");
}

/** SHA-256 über Bytes, volle Länge als 64 Hexzeichen in Kleinbuchstaben. */
export function sha256HexBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * SHA-256 über die UTF-8-Bytes einer Zeichenkette, 64 Hexzeichen (§7.6).
 *
 * Das ist die Funktion, die `@s1/domaene` für `zustandsHash` erwartet. Sie
 * wird hereingereicht, nicht dort importiert: Der Fachkern ist
 * plattformneutral und darf `node:crypto` nicht sehen (02-ZIELBILD.md, „Vier
 * Ringe").
 */
export const sha256Hex: Sha256Hex = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex");

/** Länge der Kettenprüfsumme in Hexzeichen: die ersten 16 Bytes von SHA-256 (§2.3). */
export const KETTE_ZEICHEN = 32;

/** `vorgaenger` der ersten Zeile des ersten Segments eines Clients: 32 Nullen (§2.3). */
export const KETTE_ANFANG = "0".repeat(KETTE_ZEICHEN);

/**
 * Die Kettenprüfsumme einer Zeile (§2.3):
 * SHA-256 über die **vollständigen Bytes der Zeile einschließlich `\n`**,
 * davon die ersten 16 Bytes, hexadezimal in Kleinbuchstaben, 32 Zeichen.
 *
 * Sie ist ein abgeleiteter Wert, kein gespeicherter: Der Leser hat die Zeile
 * vollständig gelesen und rechnet ihn selbst aus. Genau deshalb kann die
 * Abschlusszeile die Prüfsumme ihres Nachfolgers nicht tragen (§4.3) — sie
 * wäre der Hash der eigenen Zeile und damit nicht schreibbar.
 */
export function kettenPruefsumme(zeilenBytes: Uint8Array): string {
  return sha256HexBytes(zeilenBytes).slice(0, KETTE_ZEICHEN);
}

/** `true`, wenn der Text eine Kettenprüfsumme nach §2.3 sein kann. */
export function istKette(text: unknown): text is string {
  return typeof text === "string" && new RegExp(`^[0-9a-f]{${KETTE_ZEICHEN}}$`).test(text);
}
