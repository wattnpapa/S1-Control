/**
 * Die Pfadprüfung vor jedem Spiegelungsversuch — KONZEPT-SPEICHER.md §5.7.
 *
 * > „Wird der Einsatzordner auf dem Share verschoben, umbenannt oder
 * > archiviert, während ein Client noch unübertragene Ereignisse hat, darf der
 * > Wiederholversuch den Ordner **nicht neu anlegen**. Deshalb prüft jeder
 * > Spiegelungsversuch zuerst, ob unter dem gemerkten Pfad eine `einsatz.json`
 * > mit der erwarteten Einsatz-Kennung liegt."
 *
 * Ohne diese Prüfung liefe der Upload eines verschobenen oder archivierten
 * Einsatzes in einen frisch erzeugten, leeren Ordner — die Ereignisse wären
 * dann zwar lokal vollständig, auf dem Share aber an einer Stelle, die niemand
 * öffnet.
 */

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import type { Einsatzablage } from "./pfade.js";

const dekodierer = new TextDecoder("utf-8", { fatal: false });

/** Das Ergebnis der Pfadprüfung. */
export type Ordnerbefund =
  | "inOrdnung"
  /** Nicht da oder mit anderer Kennung — die Spiegelung wird angehalten (§5.7). */
  | "ordnerFort"
  /** Der Zugriff selbst scheiterte; die Klasse entscheidet §8.9. */
  | { readonly art: "zugriffFehlgeschlagen"; readonly fehler: unknown };

/**
 * Liest `einsatz.json` unter dem gemerkten Pfad und vergleicht die Kennung.
 *
 * Gelesen, nicht auf Existenz geprüft: Ein `stat` verböte §5.4.2, und die
 * Kennung will ohnehin gelesen werden.
 */
export async function pruefeEinsatzordner(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
  einsatzId: string,
): Promise<Ordnerbefund> {
  let bytes: Uint8Array;
  try {
    bytes = await dateisystem.liesAb(ablage.shareEinsatzDatei, 0);
  } catch (fehler) {
    if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") return "ordnerFort";
    return { art: "zugriffFehlgeschlagen", fehler };
  }
  let inhalt: unknown;
  try {
    inhalt = JSON.parse(dekodierer.decode(bytes));
  } catch {
    return "ordnerFort";
  }
  const gefunden =
    typeof inhalt === "object" && inhalt !== null
      ? (inhalt as Record<string, unknown>)["einsatzId"]
      : undefined;
  return gefunden === einsatzId ? "inOrdnung" : "ordnerFort";
}
