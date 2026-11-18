/**
 * Die Prüfungen des Papier-Nachtrags (Audits Nachrichten Runde 2: R2-SGL
 * P2-1, R2-LdF P3-7).
 *
 * Der Nachtrag trägt Zeiten und Handzeichen vom Blatt. Bisher prüfte er nichts:
 * eine Beförderung vor der Annahme, eine Annahme vor der Abfassung oder eine
 * Zeit in der Zukunft (Zahlendreher „2140“ statt „2104“) standen still in
 * Nachweisung und Tagebuch. **Papier geht vor** (§6 „Papier-Rückfall“): Was auf
 * dem Blatt steht, wird geschrieben, auch wenn es nicht passt — der Bediener
 * erfährt es aber sofort als Warnung und kann mit „Annehmen“, „Befördern“
 * oder „Nachweisen“ berichtigen. Eine doppelte Nummer meldet weiter
 * `nachrichtenfolgen.ts` (`doppelhinweis`).
 */

import { datumZeitGruppe } from "@s1/domaene";

/** So viel darf eine Zeit vom Blatt vor der Uhr des Workers liegen: eine Minute (Vordruck kennt Minuten). */
const SPIELRAUM_MS = 60_000;

interface Zeitangabe {
  readonly wort: string;
  readonly ms: number;
  readonly iso: string;
}

function zeit(wort: string, wert: unknown): Zeitangabe | undefined {
  const iso = typeof wert === "string" ? wert : (wert as { zeitpunkt?: unknown } | null | undefined)?.zeitpunkt;
  if (typeof iso !== "string") return undefined;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? { wort, ms, iso } : undefined;
}

function uhr(z: Zeitangabe): string {
  return datumZeitGruppe(z.iso).slice(2, 6);
}

/** Was der Nachtrag an Zeiten mitbringt: Anlage (Abfassung, Aufnahme) und Folgewerte (Annahme, Beförderung). */
export interface Nachtragszeiten {
  readonly abfassungszeit?: unknown;
  readonly aufnahme?: unknown;
  readonly annahme?: unknown;
  readonly befoerderung?: unknown;
}

/**
 * Die Warnungen eines Nachtrags: Abfassung ≤ Annahme (bzw. Aufnahme) ≤
 * Beförderung ≤ jetzt. Leer, wenn alles passt oder eine Angabe fehlt.
 */
export function nachtragswarnungen(zeiten: Nachtragszeiten, jetztMs: number): readonly string[] {
  const folge = [
    zeit("Abfassung", zeiten.abfassungszeit),
    zeit("Aufnahme", zeiten.aufnahme),
    zeit("Annahme", zeiten.annahme),
    zeit("Beförderung", zeiten.befoerderung),
  ].filter((z): z is Zeitangabe => z !== undefined);
  const warnungen: string[] = [];
  for (const [index, spaeter] of folge.entries()) {
    const frueher = folge.slice(0, index).find((f) => f.ms > spaeter.ms);
    if (frueher !== undefined) warnungen.push(`Nachtrag: ${spaeter.wort} (${uhr(spaeter)}) liegt vor ${frueher.wort === "Abfassung" ? "der Abfassung" : `der ${frueher.wort}`} (${uhr(frueher)}). Bitte am Blatt prüfen; geschrieben ist, was auf dem Blatt steht.`);
    if (spaeter.ms > jetztMs + SPIELRAUM_MS) warnungen.push(`Nachtrag: ${spaeter.wort} (${uhr(spaeter)}) liegt in der Zukunft. Zahlendreher? Berichtigen über „${spaeter.wort === "Beförderung" ? "Befördern" : spaeter.wort === "Annahme" ? "Annehmen" : "Aufnahme berichtigen"}“.`);
  }
  return warnungen;
}
