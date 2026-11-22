/**
 * Zwei Prüfungen der Beförderungsmaske, die die Fernmeldezentrale vor dem
 * Schreiben braucht — eigene Datei, damit `Fmzmasken.tsx` unter der
 * Strukturgrenze bleibt (AGENTS.md §6).
 *
 * - **Zweites Befördern** (R2-FM P2-7): Der Schritt schickt seit jeher den
 *   Vorwert vom Öffnen mit `vorwertPruefen`; der Worker weist ab, wenn ein
 *   anderer Platz inzwischen befördert hat. Kam das fremde Ereignis aber
 *   noch nicht im eigenen Worker an (unter drei Sekunden Abstand), sah der
 *   Worker „leer gegen leer“ und schrieb — der zweite Vermerk ersetzte den
 *   ersten still. Die Maske holt deshalb unmittelbar vor dem Schreiben die
 *   Nachricht neu: Trägt sie inzwischen eine andere Beförderung, steht die
 *   lesbare Konfliktmeldung mit „Neu laden“ da, und nichts wird geschrieben.
 *   Ganz schließen lässt sich das Fenster so nicht (zwei Rechner, ein
 *   Share), aber es wird so klein wie die Synchronisation.
 * - **Abweichung vom Vorschlag** (R2-LdF P2-2): Wählt der Fernmelder ein
 *   anderes Mittel als der LdF vorgeschlagen hat, sagt die Maske es vor dem
 *   Schreiben; erlaubt bleibt es (Funkstörung).
 * - **Befördern vor dem Vorschlag** (R2-LdF P2-1): Führt der Einsatz den LdF
 *   als Station und ist er besetzt, fragt die Maske einmal, bevor sie ohne
 *   seinen Vorschlag befördert — vorher kam der Hinweis erst danach.
 */

import { eigeneFernmelder, istZugeteilt, kanonischeSerialisierung, projektion, type KanonischerWert, type Nachrichtenzeile } from "@s1/domaene";

import { rufe } from "./bruecke.js";
import type { Rueckfrage } from "./maskenrueckfragen.js";
import { useLaden } from "./laden.js";
import { vermerkwert } from "./Vorwertkonflikt.js";

function wert(zeile: Pick<Nachrichtenzeile, "befoerderung" | "gegenstelle">): string {
  const b = zeile.befoerderung;
  return b === undefined ? "leer" : kanonischeSerialisierung({ ...b, ...(zeile.gegenstelle === undefined ? {} : { gegenstelle: zeile.gegenstelle }) } as unknown as KanonischerWert);
}

/** Der Satz, wenn die frische Nachricht eine andere Beförderung trägt als die beim Öffnen; sonst `undefined`. */
export function befoerderungGeaendert(beimOeffnen: Pick<Nachrichtenzeile, "befoerderung" | "gegenstelle">, frisch: Pick<Nachrichtenzeile, "befoerderung" | "gegenstelle"> | undefined): string | undefined {
  if (frisch === undefined || frisch.befoerderung === undefined || wert(frisch) === wert(beimOeffnen)) return undefined;
  const neu = { ...frisch.befoerderung, ...(frisch.gegenstelle === undefined ? {} : { gegenstelle: frisch.gegenstelle }) };
  return `Inzwischen von einem anderen Arbeitsplatz befördert: Beförderung ist jetzt ${vermerkwert(neu)}.`;
}

/** Holt die Nachricht neu und vergleicht (R2-FM P2-7); scheitert das Holen, gilt still die Prüfung des Workers allein. */
export async function befoerderungInzwischen(zeile: Nachrichtenzeile): Promise<string | undefined> {
  const akteId = useLaden.getState().akteId;
  if (akteId === undefined) return undefined;
  try {
    const frisch = await rufe({ art: "nachrichtAnfordern", akteId, nachrichtId: zeile.id });
    return befoerderungGeaendert(zeile, frisch === null || typeof frisch !== "object" ? undefined : frisch);
  } catch {
    return undefined;
  }
}

/** „Weicht vom Vorschlag des LdF ab: Telefon (Fm2)“ — oder nichts (R2-LdF P2-2). */
export function abweichungshinweis(zeile: Pick<Nachrichtenzeile, "vorschlag">, mittel: string): string | undefined {
  const v = zeile.vorschlag;
  if (v === undefined || v.mittel === mittel) return undefined;
  return `Weicht vom Vorschlag des LdF ab: ${projektion.mittelWort(v.mittel)} (${v.fernmelder}). Erlaubt, die Nachweisung markiert es.`;
}

/** Die Rückfrage vor dem Befördern ohne Vorschlag des besetzten LdF (R2-LdF P2-1); sonst keine. */
export function ohneVorschlagFrage(zeile: Pick<Nachrichtenzeile, "vorschlag">, ldfWartet: boolean): Rueckfrage | undefined {
  if (!ldfWartet || zeile.vorschlag !== undefined) return undefined;
  return { id: "ohneVorschlag", frage: "Der LdF ist besetzt, hat für diese Nachricht aber noch keinen Weg vorgeschlagen. Ohne seinen Vorschlag befördern?", knopf: "Ohne Vorschlag befördern" };
}

/**
 * Review 2026-11-21: Befördern einer Nachricht, die der LdF einem anderen
 * Fernmelder zugeteilt hat — eine Rückfrage, keine Sperre: Fällt Fm1 aus,
 * darf Fm2 übernehmen, aber nicht aus Versehen doppelt übertragen.
 */
export function fremdeZuteilungFrage(zeile: Pick<Nachrichtenzeile, "vorschlag">, stellen: readonly string[], besetzung: Readonly<Record<string, string>> | undefined): Rueckfrage | undefined {
  const fm = zeile.vorschlag?.fernmelder.trim() ?? "";
  if (fm === "" || eigeneFernmelder(stellen).length === 0 || istZugeteilt(fm, stellen)) return undefined;
  const wer = besetzung?.[fm] === undefined ? fm : `${fm} · ${besetzung[fm]}`;
  return { id: "fremdeZuteilung", frage: `Der LdF hat diese Nachricht ${wer} zugeteilt. Trotzdem selbst befördern? Bitte vorher absprechen, sonst geht sie doppelt hinaus.`, knopf: "Trotzdem selbst befördern" };
}

/** Review 2026-11-21: Zuteilung an einen Fernmelder, den gerade niemand besetzt. */
export function unbesetztFrage(fernmelder: string, besetzung: Readonly<Record<string, string>> | undefined): Rueckfrage | undefined {
  if (besetzung === undefined || !/^Fm\d$/u.test(fernmelder) || besetzung[fernmelder] !== undefined) return undefined;
  return { id: "unbesetzt", frage: `${fernmelder} ist nicht besetzt. Trotzdem ${fernmelder} zuteilen? Die Nachricht wartet dann, bis jemand ${fernmelder} übernimmt.`, knopf: `Trotzdem ${fernmelder} zuteilen` };
}
