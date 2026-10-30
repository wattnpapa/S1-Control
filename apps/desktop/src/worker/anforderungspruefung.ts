/**
 * Die Prüfungen über das Schema hinaus für Zusage und Eintreffen einer
 * Anforderung (§5.6.2) — ein Teil von `pruefeNeu` im Aktendienst.
 *
 * `AbloesungZugesagt` und `AnforderungErledigt` tragen ihren Wert im Rahmen
 * (`neu`), nicht in der Nutzlast; das Katalogschema prüft dort nichts. Eine
 * unlesbare Zeit stünde für immer im Protokoll, und die Spalten „Zugesagt
 * für“ und „Ablösung angefordert“ der Einheitentabelle zeigten sie roh.
 * Ebenso eine ablösende Einheit, die keine Kennung ist. Die Rücknahmen
 * setzen `null` und sind davon ausgenommen.
 *
 * Eine eigene Datei, weil `aktendienst.ts` weit über der Grenze für neue
 * Dateien liegt; dort steht nur der Aufruf.
 */

import type { Ereignisentwurf } from "@s1/speicher";

/** Je Art: der Schlüssel der Zeit im Wert und die Meldung, wenn sie nicht lesbar ist. */
const ZEITEN: Readonly<Record<string, readonly [string, string]>> = {
  AbloesungZugesagt: ["zugesagtFuer", "„Zugesagt für“ ist keine lesbare Zeitangabe."],
  AnforderungErledigt: ["erledigtAm", "Die Eintreffzeit ist keine lesbare Zeitangabe."],
};

function lesbareZeit(wert: unknown): boolean {
  return typeof wert === "string" && !Number.isNaN(new Date(wert).getTime());
}

/** Liefert die Meldung, wenn der Entwurf nicht geschrieben werden darf. */
export function pruefeAnforderung(entwurf: Ereignisentwurf): string | undefined {
  const zeit = ZEITEN[entwurf.typ];
  if (zeit === undefined || entwurf.neu === null || entwurf.neu === undefined) return undefined;
  if (typeof entwurf.neu !== "object") return "Der Wert muss eine Zeitangabe mit Angaben tragen.";
  const wert = entwurf.neu as Record<string, unknown>;
  if (!lesbareZeit(wert[zeit[0]])) return zeit[1];
  const von = wert["zugesagtVon"];
  if (von !== undefined && typeof von !== "string") return "„Zugesagt von“ muss ein Text sein.";
  const einheit = wert["abloesendeEinheitId"];
  if (einheit !== undefined && (typeof einheit !== "string" || einheit.trim() === "")) {
    return "Die ablösende Einheit ist keine Kennung.";
  }
  return undefined;
}
