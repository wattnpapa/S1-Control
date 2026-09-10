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

import { crc32Hex } from "@s1/domaene";
import type { Sha256Hex } from "@s1/domaene";

/**
 * CRC-32 nach §2.1 — **weitergereicht**, nicht hier gerechnet.
 *
 * Die Funktion selbst steht seit M4.0 in `@s1/domaene`. Der Grund ist keine
 * Aufräumlust: `@s1/ausgaben` braucht dieselbe Prüfsumme für die ZIP-Köpfe
 * der Einsatzakte und der XLSX-Ausgabe (M4.2, M4.4), darf dieses Paket als
 * Geschwister im selben Ring aber nicht importieren (02-ZIELBILD.md, „Vier
 * Ringe"). Zwei Tabellen desselben Polynoms wären zwei Wahrheiten über
 * dieselbe Zahl.
 *
 * Was hier bleibt, ist die **Regel**: dass eine Zeile diese Prüfsumme trägt
 * und wie sie geschrieben wird (§2.1). Der Wert kommt aus dem Fachkern —
 * plattformneutral, wie eine Rechnung über Bytes es sein kann.
 */
export { crc32Hex };

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
