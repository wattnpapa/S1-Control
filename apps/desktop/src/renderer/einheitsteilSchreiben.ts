/**
 * Der Schreibweg der Untertabellen: Entwurf an den Aktendienst, danach die
 * Untertabelle und die Einheitentabelle frisch holen.
 *
 * Beide, weil derselbe Schritt an zwei Stellen sichtbar wird: in der
 * Untertabelle als Zeile und in der Tabelle als Spalte J oder K. Die
 * Mitteilung des Workers frischt sie ohnehin nach (`frischeAnsichten`); das
 * Holen hier sorgt dafür, dass der eigene Schritt **sofort** dasteht und nicht
 * erst beim nächsten Zeigerstand.
 *
 * Eine Abweisung kommt als Text zurück und nicht als Ausnahme: Die Maske
 * bleibt offen und zeigt ihn, der Bediener verliert seine Eingabe nicht
 * (§8.8 Punkt 1).
 */

import { useCallback } from "react";

import type { Entwurf } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";

/** `undefined` heißt geschrieben; sonst der Grund, aus dem nichts geschrieben wurde. */
export type Schreibausgang = string | undefined;

export function useEinheitsteilSchreiben(einheitId: string): (entwurf: Entwurf) => Promise<Schreibausgang> {
  const bediene = useLaden((zustand) => zustand.bediene);
  const holeUntertabelle = useLaden((zustand) => zustand.holeUntertabelle);
  const holeTabelle = useLaden((zustand) => zustand.holeTabelle);

  return useCallback(
    async (entwurf: Entwurf): Promise<Schreibausgang> => {
      const ergebnis = await bediene(entwurf);
      if (ergebnis === undefined) return "Es ist kein Einsatz geöffnet.";
      if (ergebnis.art !== "geschrieben") {
        return "meldung" in ergebnis ? ergebnis.meldung : "Der Schritt wurde nicht geschrieben.";
      }
      await Promise.all([holeUntertabelle(einheitId), holeTabelle()]);
      return undefined;
    },
    [bediene, einheitId, holeTabelle, holeUntertabelle],
  );
}
