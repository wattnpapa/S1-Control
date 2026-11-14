/**
 * Der Schreibweg der Vokabularkorrektur: Einheiten, die mit `#3` statt
 * „Zugtrupp Technischer Zug" aus einem Erfassungsbogen übernommen wurden,
 * bekommen ihre Namen aus dem gespeicherten Bogen.
 *
 * Was zu schreiben ist, rechnet der Fachkern (`vokabelkorrekturen`); hier
 * steht nur, wie es geschrieben und gezählt wird. Jedes Feldereignis geht
 * über den gewöhnlichen Bedienweg: Sperren, Nur-Lesen eines beendeten
 * Einsatzes und Sync-Broadcast gelten wie bei jeder Eingabe.
 */

import { vokabelkorrekturen, type Zustand } from "@s1/domaene";

import type { Bedienergebnis, Vokabelkorrekturergebnis } from "../kontrakt/index.js";
import type { Ereignisentwurf } from "@s1/speicher";

/**
 * Wie viele Einheiten offen sind.
 *
 * Gezählt wird je Meldung, und der Grund nennt sie (`Vokabularkorrektur EEB
 * <meldungId>`): Personen und Fahrzeuge eines Bogens gehören zur Einheit
 * dieses Bogens und zählen nicht extra.
 */
export function offeneVokabelkorrekturen(zustand: Zustand): number {
  return new Set(vokabelkorrekturen(zustand).map((entwurf) => entwurf.grund)).size;
}

/** Schreibt alle offenen Korrekturen nacheinander; bricht beim ersten Abweisen ab. */
export async function vokabelnKorrigieren(
  zustand: Zustand,
  bediene: (entwurf: Ereignisentwurf) => Promise<Bedienergebnis>,
): Promise<Vokabelkorrekturergebnis> {
  const entwuerfe = vokabelkorrekturen(zustand);
  const einheiten = new Set<string | undefined>();
  let ereignisse = 0;
  for (const entwurf of entwuerfe) {
    const ergebnis = await bediene(entwurf as Ereignisentwurf);
    if (ergebnis.art !== "geschrieben") {
      const meldung = "meldung" in ergebnis ? ergebnis.meldung : "Das Schreiben wurde abgewiesen.";
      return { art: "abgewiesen", meldung, ereignisse };
    }
    einheiten.add(entwurf.grund);
    ereignisse += 1;
  }
  return { art: "korrigiert", einheiten: einheiten.size, ereignisse };
}
