/**
 * Fehlerklassen nach KONZEPT-SPEICHER.md §8.8 und §8.9.
 *
 * §8.9 ist der Grund, warum diese Unterscheidung überhaupt im Code steht:
 * „Wird einem Arbeitsplatz im laufenden Betrieb das Schreibrecht auf dem Share
 * entzogen, liefert jeder Versuch `EACCES` — und §6.3 zeigte den Share dabei
 * weiterhin als erreichbar, weil die Lesezugriffe ja funktionieren. Der
 * Bediener sähe ‚alles in Ordnung' und übertrüge nichts mehr." Ein
 * gleichbehandelnder Rückstau wäre also ein stiller Falschzustand.
 */

import { DateisystemFehler } from "./dateisystem.js";

/** Die beiden Klassen aus §8.9, dazu der Sonderfall aus §5.7. */
export type Shareklasse =
  /** Rückstau nach §5.4.4; Anzeige „Share nicht erreichbar seit HH:MM". */
  | "voruebergehend"
  /** Sofort langsamster Takt; die Anzeige trennt Erreichbarkeit vom Zustand. */
  | "dauerhaft"
  /** Ordner verschoben, umbenannt oder archiviert — §5.7, keine der beiden Klassen. */
  | "ordnerFort";

/** §8.9, vorübergehend: Netz- und Belegungsfehler; sie geben sich von selbst. */
const VORUEBERGEHEND: ReadonlySet<string> = new Set([
  "ETIMEDOUT",
  "ENOTCONN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENETDOWN",
  "ECONNRESET",
  "ECONNABORTED",
  "ECONNREFUSED",
  "EBUSY",
  "EAGAIN",
  "EIO",
  // Ein Kurzschreibvorgang (§2.2: ein einziger `write`) ist ein
  // Ubertragungsproblem, kein Rechteproblem; er wird wiederholt.
  "EKURZSCHREIBUNG",
]);

/** §8.9, dauerhaft: Rechte- und Platzfehler; sie geben sich nicht von selbst. */
const DAUERHAFT: ReadonlySet<string> = new Set(["EACCES", "EPERM", "EROFS", "ENOSPC"]);

/**
 * Ordnet einen Share-Fehler einer der Klassen aus §8.9 zu.
 *
 * `ENOENT` „gehört in keine der beiden Klassen, sondern in den Fall aus §5.7
 * (Ordner verschoben, umbenannt oder archiviert)" — daher die dritte Klasse.
 * Ein unbekannter Code gilt als vorübergehend: Ein Wiederholversuch ist
 * folgenlos, während ein fälschlich als dauerhaft gemeldeter Fehler eine
 * Aussage über die Rechte des Bedieners erzeugte, die niemand belegen kann.
 */
export function shareklasse(fehler: unknown): Shareklasse {
  const code = fehler instanceof DateisystemFehler ? fehler.code : "EUNKNOWN";
  if (code === "ENOENT") return "ordnerFort";
  if (DAUERHAFT.has(code)) return "dauerhaft";
  if (VORUEBERGEHEND.has(code)) return "voruebergehend";
  return "voruebergehend";
}

/**
 * §8.8 Punkt 3: `EBUSY` und `EACCES` werden lokal **einmal** nach 250 ms
 * wiederholt — ein Virenscanner-Zugriff ist typischerweise nach Millisekunden
 * vorbei. Alle anderen Codes werden sofort abgewiesen.
 */
export function lokalWiederholbar(fehler: unknown): boolean {
  const code = fehler instanceof DateisystemFehler ? fehler.code : "";
  return code === "EBUSY" || code === "EACCES";
}

/**
 * §8.8 Punkt 4: Bei `ENOSPC` und `EIO` erscheint zusätzlich ein dauerhafter
 * Hinweis in der Statuszeile, bis wieder erfolgreich geschrieben wurde.
 */
export function lokalDauerhafterHinweis(fehler: unknown): boolean {
  const code = fehler instanceof DateisystemFehler ? fehler.code : "";
  return code === "ENOSPC" || code === "EIO";
}

/**
 * Klartext für den Bediener nach §8.8.
 *
 * `ENOSPC` nennt den Grund ausdrücklich, „weil der Bediener ihn selbst beheben
 * kann". Für alles Übrige gilt §8.8 Punkt 1 unverändert: kein technischer
 * Text, aber auch keine Verharmlosung.
 */
export function lokaleSchreibstoerungMeldung(fehler: unknown): string {
  const code = fehler instanceof DateisystemFehler ? fehler.code : "";
  if (code === "ENOSPC") {
    return "Auf diesem Rechner ist kein Speicherplatz mehr frei. Der Eintrag wurde nicht übernommen.";
  }
  return "Der Eintrag konnte auf diesem Rechner nicht gespeichert werden und wurde nicht übernommen.";
}
