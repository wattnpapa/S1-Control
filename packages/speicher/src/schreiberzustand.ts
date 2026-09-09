/**
 * `schreiber.json` — der lokale Schreiberzustand nach KONZEPT-SPEICHER.md §4.4.
 *
 * ```json
 * { "clientId": "…", "laufnummer": 4711, "segment": 3,
 *   "lokalerOffset": 1234567, "letzteKette": "a1b2…" }
 * ```
 *
 * Liegt ausschließlich lokal, nie auf dem Share. Geschrieben wird per `.tmp`
 * plus Rename — auf dem Share ist Rename im Datenpfad verboten (§1.3), lokal
 * gilt dieses Verbot nicht.
 *
 * **Auf Atomarität verlässt sich dabei nichts.**
 * `MoveFileEx(MOVEFILE_REPLACE_EXISTING)` ist unter Windows nicht als atomar
 * dokumentiert (`nas-speicher-recherche.md` §1.4), und diese Datei trägt mit
 * der Laufnummer genau den Wert, dessen Verlust nach §3.3 zu einer
 * Doppelvergabe führte. Deshalb ist sie **wiederherstellbar** ausgelegt: fehlt
 * sie, ist sie leer oder nicht parsebar, wird ihr Inhalt aus dem lokalen
 * Spiegel rekonstruiert. Sie ist ein Beschleuniger des Starts, kein
 * Wahrheitsträger — dieselbe Rolle, die §1.3 Satz 3 allen abgeleiteten Dateien
 * zuweist.
 *
 * Geschrieben wird **ohne** `fsync` (§5.2): Genau ein `fsync` je Ereignis, und
 * das ist der des lokalen Anhangs. Sonst kostete jedes Ereignis lokal zwei bis
 * drei Synchronisierungen statt einer, und Annahme A1 wäre gegen ein zu
 * schmales Kostenmodell geprüft.
 */

import type { Dateisystem } from "./dateisystem.js";
import { KETTE_ANFANG, istKette } from "./pruefsummen.js";

const kodierer = new TextEncoder();

let tmpZaehler = 0;
/** Fortlaufende Nummer für eindeutige `.tmp`-Namen. */
function naechsteTmpNummer(): number {
  tmpZaehler += 1;
  return tmpZaehler;
}
const dekodierer = new TextDecoder("utf-8", { fatal: false });

/** Der Inhalt von `schreiber.json` (§4.4). */
export interface Schreiberzustand {
  /** Die aktuelle Kennung dieses Clients (§3.3). */
  readonly clientId: string;
  /** Zuletzt **vergebene** Laufnummer; 0 heißt „noch keine" (§3.3). */
  readonly laufnummer: number;
  /** Das laufende eigene Segment (§4.2). */
  readonly segment: number;
  /** Byte-Offset hinter der letzten vollständigen, kettenrichtigen Zeile des laufenden Segments. */
  readonly lokalerOffset: number;
  /** Kettenprüfsumme an genau diesem Offset (§2.3). */
  readonly letzteKette: string;
  /**
   * Aufgegebene Kennungen nach einem Kennungswechsel (§4.5 Reaktion, Schritt 1).
   *
   * „Die alte bleibt dort als `frühereClientIds` erhalten, damit die Prüfung
   * nach Schritt 1 die alten Dateien weiterhin als eigene erkennt." Die
   * Schreibweise des Feldes ist die des Konzepts.
   */
  readonly frühereClientIds?: readonly string[];
}

/** Ein frischer Zustand für einen Client, der in diesem Einsatz noch nichts geschrieben hat. */
export function neuerSchreiberzustand(clientId: string, segment = 0): Schreiberzustand {
  return { clientId, laufnummer: 0, segment, lokalerOffset: 0, letzteKette: KETTE_ANFANG };
}

/**
 * Liest `schreiber.json`.
 *
 * Liefert `undefined`, wenn die Datei fehlt, leer oder nicht brauchbar ist —
 * jeder dieser Fälle ist nach §4.4 vorgesehen und führt beim Aufrufer zur
 * Rekonstruktion aus dem lokalen Spiegel, nicht zu einem Fehler.
 */
export async function liesSchreiberzustand(
  dateisystem: Dateisystem,
  pfad: string,
): Promise<Schreiberzustand | undefined> {
  let bytes: Uint8Array;
  try {
    bytes = await dateisystem.liesAb(pfad, 0);
  } catch {
    return undefined;
  }
  return deuteSchreiberzustand(dekodierer.decode(bytes));
}

/** Prüft einen gelesenen Text auf einen brauchbaren Schreiberzustand (§4.4). */
export function deuteSchreiberzustand(text: string): Schreiberzustand | undefined {
  if (text.trim().length === 0) return undefined;
  let wert: unknown;
  try {
    wert = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof wert !== "object" || wert === null || Array.isArray(wert)) return undefined;
  const objekt = wert as Record<string, unknown>;
  const clientId = objekt["clientId"];
  const laufnummer = objekt["laufnummer"];
  const segment = objekt["segment"];
  const lokalerOffset = objekt["lokalerOffset"];
  const letzteKette = objekt["letzteKette"];
  if (typeof clientId !== "string" || clientId.length === 0) return undefined;
  if (!ganzzahlAb(laufnummer, 0)) return undefined;
  if (!ganzzahlAb(segment, 0)) return undefined;
  if (!ganzzahlAb(lokalerOffset, 0)) return undefined;
  if (!istKette(letzteKette)) return undefined;
  const frühere = objekt["frühereClientIds"];
  const frühereClientIds =
    Array.isArray(frühere) && frühere.every((e) => typeof e === "string")
      ? (frühere as readonly string[])
      : undefined;
  return frühereClientIds === undefined
    ? { clientId, laufnummer, segment, lokalerOffset, letzteKette }
    : { clientId, laufnummer, segment, lokalerOffset, letzteKette, frühereClientIds };
}

function ganzzahlAb(wert: unknown, untergrenze: number): wert is number {
  return typeof wert === "number" && Number.isInteger(wert) && wert >= untergrenze;
}

/**
 * Schreibt `schreiber.json` per `.tmp` plus Rename, **ohne** `fsync` (§4.4, §5.2).
 *
 * Scheitert das Umbenennen, bleibt der alte Stand stehen. Das ist kein Fehler,
 * den der Aufrufer behandeln müsste: Der alte Stand ist höchstens veraltet, und
 * ein veralteter Stand führt nach §4.4 zu einer Lücke in der Laufnummer, die
 * §3.3 ausdrücklich erlaubt — niemals zu einem Rückschritt.
 */
export async function schreibeSchreiberzustand(
  dateisystem: Dateisystem,
  pfad: string,
  zustand: Schreiberzustand,
): Promise<void> {
  // Eindeutig je Schreibvorgang: §6.2 lässt Takte unabhängig laufen, und zwei
  // gleichzeitige Läufe teilten sich sonst dieselbe `.tmp`-Datei — der eine
  // benennt sie um, der andere findet sie nicht mehr und scheitert mit ENOENT
  // an einer Datei, die es nie hätte geben dürfen.
  const tmp = `${pfad}.${naechsteTmpNummer()}.tmp`;
  const bytes = kodierer.encode(`${JSON.stringify(zustand, undefined, 2)}\n`);
  await dateisystem.schreibeUeberOhneSync(tmp, bytes);
  await dateisystem.benenneUm(tmp, pfad);
}
