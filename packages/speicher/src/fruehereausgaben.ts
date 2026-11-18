/**
 * Ältere Stände von Tagebuch und Nachweisung in der Einsatzakte (Audits
 * Nachrichten Runde 2, R2-ETB P2-1).
 *
 * Jede Ausgabe legt eine neue Datei mit Zeitmarke in `ausgaben/`
 * („tagebuch_2026-11-17_2036.html“, „…_2040.html“). Die Akte nahm alle mit,
 * nebeneinander, und nichts sagte, welcher Stand gilt: Ein Prüfer fand ein
 * Tagebuch ohne Abschlusszeile neben dem abgeschlossenen. Im Archiv steht
 * deshalb je Liste nur der **jüngste** Stand an seinem Platz; ältere wandern
 * nach `ausgaben/fruehere/`. Gelöscht wird nichts — auf dem Share bleibt
 * jede Datei, wo sie ist, und im Archiv ist sie unter neuem Pfad mit eigener
 * Prüfsumme im Manifest.
 *
 * Betroffen sind nur die Listen, die einen Gesamtstand des Einsatzes zeigen
 * (Tagebuch, Nachweisung, Handzeichenverzeichnis). Ein Stärke- oder
 * Statusausdruck von 10 und 14 Uhr sind zwei Lagen, kein überholter Stand.
 */

import { ORDNER_AUSGABEN } from "./pfade.js";

/** Die Listen, von denen die Akte nur den jüngsten Stand obenauf legt. */
export const NUR_JUENGSTER_STAND: readonly string[] = ["tagebuch", "nachweisung", "handzeichen"];

/** Der Unterordner der älteren Stände im Archiv. */
export const ORDNER_FRUEHERE = "fruehere";

/** „ausgaben/tagebuch_2026-11-17_2040.html“ → Stamm und Marke; sonst `undefined`. */
function zerlege(pfad: string): { stamm: string; marke: string } | undefined {
  const treffer = new RegExp(`^${ORDNER_AUSGABEN}/([a-z]+)_(\\d{4}-\\d{2}-\\d{2}_\\d{4})\\.html$`, "u").exec(pfad);
  if (treffer === null) return undefined;
  const [, stamm, marke] = treffer;
  return stamm !== undefined && marke !== undefined && NUR_JUENGSTER_STAND.includes(stamm) ? { stamm, marke } : undefined;
}

/**
 * Die Einträge mit umgeschriebenem Pfad für die älteren Stände; die Ordnung
 * bleibt, damit zwei Exporte desselben Bestands bitgleich sind.
 */
export function mitFrueherenAusgaben<T extends { readonly pfad: string }>(eintraege: readonly T[]): T[] {
  const juengste = new Map<string, string>();
  for (const e of eintraege) {
    const teil = zerlege(e.pfad);
    if (teil !== undefined && (juengste.get(teil.stamm) ?? "") < teil.marke) juengste.set(teil.stamm, teil.marke);
  }
  return eintraege.map((e) => {
    const teil = zerlege(e.pfad);
    if (teil === undefined || juengste.get(teil.stamm) === teil.marke) return e;
    return { ...e, pfad: `${ORDNER_AUSGABEN}/${ORDNER_FRUEHERE}/${e.pfad.slice(ORDNER_AUSGABEN.length + 1)}` };
  });
}
