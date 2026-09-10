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

import path from "node:path";

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

// ---------------------------------------------------------------------------
// Anlegen und Auffinden (M2.3)
// ---------------------------------------------------------------------------

const kodierer = new TextEncoder();

/**
 * Der Inhalt von `einsatz.json` — der **Anker** eines Einsatzordners (§5.6).
 *
 * Er ist bewusst schmal: Was fachlich zum Einsatz gehört, steht im
 * Ereignisprotokoll und wird gefaltet. Diese Datei beantwortet genau zwei
 * Fragen, und beide stellt sich das Dateisystem und nicht die Führungsstelle:
 * Liegt hier derselbe Einsatz wie vorhin (§5.7)? Und wie heißt der Ordner, den
 * die Auswahlliste zeigt, ohne dass ein Fold laufen muss?
 *
 * Alles darüber hinaus wäre eine zweite Wahrheit neben dem Protokoll.
 */
export interface Einsatzanker {
  readonly einsatzId: string;
  readonly name: string;
  readonly datum: string;
  readonly angelegtAm: string;
  readonly angelegtVon: string;
}

/**
 * Legt den Einsatzordner samt Unterordnern an und schreibt `einsatz.json`.
 *
 * `schreibeNeuAnlegen` und nicht `schreibeUeberOhneSync`: Legen zwei
 * Arbeitsplätze im selben Augenblick denselben Einsatz an, soll der zweite ein
 * `EEXIST` sehen und nicht den ersten überschreiben. Dass diese Atomarität
 * über SMB serverseitig entschieden wird, ist für den einmaligen Anlegevorgang
 * tragbar (§5.6).
 *
 * Die Unterordner werden **vorher** angelegt: Ein Ordner mit `einsatz.json`,
 * aber ohne `ereignisse/`, sähe für jeden anderen Client wie ein gültiger
 * Einsatz aus, den er nicht lesen kann.
 */
export async function legeEinsatzAn(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
  anker: Einsatzanker,
  unterordner: readonly string[],
): Promise<void> {
  for (const name of unterordner) {
    await dateisystem.legeVerzeichnisAn(path.join(ablage.share, name));
  }
  await dateisystem.schreibeNeuAnlegen(
    ablage.shareEinsatzDatei,
    kodierer.encode(`${JSON.stringify(anker, undefined, 2)}\n`),
  );
}

/** Liest den Anker eines Ordners; alles Unlesbare ergibt `undefined`. */
export async function liesEinsatzanker(
  dateisystem: Dateisystem,
  einsatzDatei: string,
): Promise<Einsatzanker | undefined> {
  let bytes: Uint8Array;
  try {
    bytes = await dateisystem.liesAb(einsatzDatei, 0);
  } catch {
    return undefined;
  }
  let inhalt: unknown;
  try {
    inhalt = JSON.parse(dekodierer.decode(bytes));
  } catch {
    return undefined;
  }
  if (typeof inhalt !== "object" || inhalt === null) return undefined;
  const wert = inhalt as Record<string, unknown>;
  if (typeof wert["einsatzId"] !== "string") return undefined;
  return {
    einsatzId: wert["einsatzId"],
    name: typeof wert["name"] === "string" ? wert["name"] : wert["einsatzId"],
    datum: typeof wert["datum"] === "string" ? wert["datum"] : "",
    angelegtAm: typeof wert["angelegtAm"] === "string" ? wert["angelegtAm"] : "",
    angelegtVon: typeof wert["angelegtVon"] === "string" ? wert["angelegtVon"] : "",
  };
}
