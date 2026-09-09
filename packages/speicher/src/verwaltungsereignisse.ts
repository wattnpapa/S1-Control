/**
 * Die beiden Ereignisarten, die die Speicherschicht selbst erzeugt —
 * KONZEPT-SPEICHER.md §2.4, §4.3 und §4.6.
 *
 * Mehr kennt sie nicht: „Dieses Dokument behandelt Ereignisse als
 * undurchsichtige Nutzlast mit einem festen Rahmen" (§1.2). Der
 * Ereigniskatalog gehört nach `KONZEPT-EREIGNISSE.md` (M1.2), und M0.3
 * erweitert ihn nicht.
 *
 * Beide sind **Verwaltungsereignisse** (§2.4): „Der Fold ändert an ihnen
 * keinen fachlichen Zustand, und das Einsatztagebuch zeigt sie nicht an; ein
 * Segmentwechsel ist kein Vorgang der Lage." Sichtbar werden sie allein in
 * `s1 akte pruefe` und in der Diagnoseansicht. Das steht hier, weil M3.3
 * zusagt, das Einsatztagebuch zeige „jedes Ereignis" — ohne diese Ausnahme
 * stünde dort der Dateiverwaltungsverkehr zwischen den Meldungen.
 */

/** Letzte Zeile eines Segments beim Wechsel nach Größe (§4.3). */
export const TYP_SEGMENT_ABGESCHLOSSEN = "SegmentAbgeschlossen";

/** Erste Zeile eines Ersatzsegments nach einer Beschädigung (§4.6). */
export const TYP_SEGMENT_ERSETZT = "SegmentErsetzt";

/** Die beiden Arten zusammen — für Aufrufer, die sie aus dem Tagebuch heraushalten. */
export const VERWALTUNGSTYPEN: ReadonlySet<string> = new Set([
  TYP_SEGMENT_ABGESCHLOSSEN,
  TYP_SEGMENT_ERSETZT,
]);

/** `true`, wenn dieser Typ ein Verwaltungsereignis nach §2.4 ist. */
export function istVerwaltungsereignis(typ: string): boolean {
  return VERWALTUNGSTYPEN.has(typ);
}

/**
 * Nutzlast der Abschlusszeile (§4.3).
 *
 * „Dessen Nutzlast allein die Nummer des Nachfolgesegments trägt." Die
 * Kettenprüfsumme des Nachfolgers trägt sie ausdrücklich **nicht** — sie wäre
 * der SHA-256 über die Bytes der Abschlusszeile selbst und damit nicht
 * schreibbar. Der Leser hat die Zeile vollständig gelesen und rechnet den Wert
 * selbst aus.
 */
export interface AbschlussNutzlast {
  readonly nachfolger: number;
}

/**
 * Nutzlast der ersten Zeile eines Ersatzsegments (§4.6, Schritt 2).
 *
 * „Ihre Nutzlast nennt das ersetzte Segment und den Offset, ab dem der Ersatz
 * gilt."
 *
 * **Das Präfix gehört dazu, sobald die Kennung wechseln kann.** Seit §4.5
 * Schritt 6 die alte Datei für die *Prüfung* eigen lässt, repariert ein Client
 * auch ein Segment unter einer **aufgegebenen** Kennung — das Ersatzsegment
 * steht dann unter der neuen, das ersetzte unter der alten. Nennte die Nutzlast
 * nur die Nummer, hielte jeder Auswerter das Segment gleicher Nummer der
 * **eigenen** Kennung für ersetzt: Es fiele aus der Vollprüfung nach §4.6.1 und
 * aus dem Versionsvektor nach §7.6, und `kettenanker` suchte den Anker in der
 * falschen Datei.
 *
 * `praefix` fehlt, wenn das ersetzte Segment dieselbe Kennung trägt wie das
 * Ersatzsegment. Zeilen aus der Zeit vor dieser Festlegung tragen es nie und
 * sind genau so zu lesen — als „eigenes Präfix".
 */
export interface ErsatzNutzlast {
  readonly ersetztesSegment: number;
  readonly abOffset: number;
  /** Kennungspräfix des ersetzten Segments; fehlt, wenn es das eigene ist. */
  readonly praefix?: string;
}

/** Liest die Nachfolgenummer aus einer Abschlusszeile; `undefined`, wenn sie fehlt. */
export function nachfolgerAus(nutzlast: unknown): number | undefined {
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  const wert = (nutzlast as Record<string, unknown>)["nachfolger"];
  return typeof wert === "number" && Number.isInteger(wert) && wert >= 0 ? wert : undefined;
}

/**
 * Liest das ersetzte Segment, den Offset und — wenn genannt — das Präfix aus
 * einer `SegmentErsetzt`-Zeile (§4.6, Schritt 2).
 *
 * Ein fehlendes `praefix` heißt „eigenes Präfix", nicht „unbekannt": So sind
 * die Zeilen zu lesen, die vor dieser Festlegung geschrieben wurden. Ein
 * `praefix`, das keine Kennung sein kann, wird verworfen statt geraten — sonst
 * suchte der Auswerter in einer Datei, die es nicht gibt, und meldete den Anker
 * als unbestimmbar.
 */
export function ersatzAus(nutzlast: unknown): ErsatzNutzlast | undefined {
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  const objekt = nutzlast as Record<string, unknown>;
  const ersetztesSegment = objekt["ersetztesSegment"];
  const abOffset = objekt["abOffset"];
  if (!Number.isInteger(ersetztesSegment) || !Number.isInteger(abOffset)) return undefined;
  const praefix = objekt["praefix"];
  const gueltig = typeof praefix === "string" && /^[0-9a-f]{1,8}$/.test(praefix);
  return {
    ersetztesSegment: ersetztesSegment as number,
    abOffset: abOffset as number,
    ...(gueltig ? { praefix: praefix as string } : {}),
  };
}
