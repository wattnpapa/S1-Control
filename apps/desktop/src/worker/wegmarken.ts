/**
 * Die Wegmarken der Beförderung (Audits Nachrichten Runde 2: R2-LdF P2-1,
 * P2-2) — geschrieben in die Nutzlast von `NachrichtBefoerdert`, bevor der
 * Worker sie prüft.
 *
 * - **Ohne Vorschlag des LdF**: Führt der Einsatz den LdF als Station, ist er
 *   besetzt und hat er noch keinen Weg vorgeschlagen, befördert die FmZ
 *   trotzdem (Blitz, KONZEPT-NACHRICHTEN.md §5) — aber bisher ohne Spur in
 *   Nachweisung und Tagebuch. Jetzt trägt die Beförderung `ohneVorschlag`.
 *   Ohne besetzten LdF gilt die Ersatzregel (der Vermerk wird zum Vorschlag),
 *   dann keine Marke.
 * - **Abweichend vom Vorschlag**: Schlug der LdF Telefon vor und befördert die
 *   FmZ über Funk, trägt die Beförderung `abweichungVomVorschlag: "Telefon → Funk"`.
 *
 * Die Marken stehen in der Nutzlast und nicht nur in der Zeile, weil das
 * Tagebuch festhalten muss, was **zur Zeit der Beförderung** galt — die
 * Präsenz von damals kennt nach dem Einsatz niemand mehr.
 */

import { ldfStationAn, projektion, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : undefined;
}

/** Der Entwurf mit den Wegmarken; unverändert für jede andere Art, eine Rücknahme oder ein Löschen. */
export function mitWegmarken<T extends Ereignisentwurf>(zustand: Zustand, entwurf: T, ldfBesetzt: boolean): T {
  if (entwurf.typ !== "NachrichtBefoerdert" || entwurf.undoOf !== undefined) return entwurf;
  const nutzlast = objekt(entwurf.nutzlast);
  const neu = objekt(entwurf.neu);
  const id = nutzlast?.["nachrichtId"];
  const nachricht = typeof id === "string" ? zustand.nachrichten?.[id] : undefined;
  if (nutzlast === undefined || neu === undefined || typeof neu["mittel"] !== "string" || nachricht === undefined) return entwurf;
  if (nachricht.richtung.wert !== "AUSGANG" || nachricht.gespraechsnotiz?.wert === true) return entwurf;
  const vorschlag = objekt(nachricht.vorschlag?.wert);
  if (vorschlag !== undefined && typeof vorschlag["mittel"] === "string") {
    const abweichung = projektion.vorschlagsabweichung({ mittel: vorschlag["mittel"] }, { mittel: neu["mittel"] });
    return abweichung === undefined ? entwurf : { ...entwurf, nutzlast: { ...nutzlast, abweichungVomVorschlag: abweichung } };
  }
  const ohne = ldfStationAn(zustand) && ldfBesetzt;
  return ohne ? { ...entwurf, nutzlast: { ...nutzlast, ohneVorschlag: true } } : entwurf;
}

/** Der Hinweis zur Abweichung für den Bediener; `undefined` ohne Abweichung. */
export function abweichungshinweis(entwurf: Ereignisentwurf): string | undefined {
  const abweichung = objekt(entwurf.nutzlast)?.["abweichungVomVorschlag"];
  return typeof abweichung === "string" ? `Befördert abweichend von der Zuteilung des LdF (${abweichung}); Nachweisung und Tagebuch tragen die Marke.` : undefined;
}
