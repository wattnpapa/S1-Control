/**
 * Der Hinweiskasten des Arbeitsplatzes (Audits Fernmelder P3-7, LdF P3-4,
 * Sachgebietsleiter P2-10).
 *
 * Vorher lag er unter dem Blatt, blieb über jeden Blattwechsel stehen, füllte
 * die Fläche unter einer Liste und rutschte bei langer Tabelle aus dem Bild.
 * Jetzt steht er wie das Fehlerbild **oben** am Blatt, trägt je Hinweis die
 * Uhrzeit, verlöscht reine Auskünfte (`info`) nach {@link INFO_VERFALL_MS} von
 * selbst und lässt sich mit „Löschen“ räumen. Warnungen und Fehler bleiben, bis
 * jemand sie wegnimmt: Sie zu verlieren, wäre schlimmer als ein Kasten zu viel.
 *
 * Zweite Runde (R2-SGL P2-4, R2-Si P3-1, R2-FaBe): Der Kasten schob beim
 * Einblenden das Blatt um 53 bis 59 Pixel nach unten; wer gerade auf eine
 * Zeile zielte, traf die nächste. Jetzt hängt er an einem Anker ohne Höhe
 * (`hinweisanker`) und überlagert das Blatt oben rechts. Jede Zeile hat ein
 * eigenes „×“: Eine Warnung bleibt, bis sie geschlossen wird, ohne dass man
 * mit „Löschen“ alle anderen mitnimmt.
 */

import { useEffect } from "react";

import { uhrzeitText } from "@s1/domaene";

import { useLaden, type Hinweis } from "./laden.js";

/** So lange steht eine reine Auskunft („In der Nachweisung unter Nummer 7 eingetragen“), dann verschwindet sie. */
export const INFO_VERFALL_MS = 20_000;

/** Die Nummern der Auskünfte, die zur Zeit `jetzt` abgelaufen sind; Hinweise ohne Zeit bleiben. */
export function abgelaufeneInfos(hinweise: readonly Hinweis[], jetzt: number): readonly number[] {
  return hinweise.filter((h) => h.stufe === "info" && h.zeit !== undefined && jetzt - h.zeit >= INFO_VERFALL_MS).map((h) => h.nummer);
}

export function Hinweiskasten(): React.JSX.Element | null {
  const hinweise = useLaden((z) => z.hinweise);
  const loesche = useLaden((z) => z.loescheHinweise);
  const hatInfo = hinweise.some((h) => h.stufe === "info" && h.zeit !== undefined);
  useEffect(() => {
    if (!hatInfo) return undefined;
    const zeitgeber = setInterval(() => {
      const weg = abgelaufeneInfos(useLaden.getState().hinweise, Date.now());
      if (weg.length > 0) loesche(weg);
    }, 2_000);
    return () => clearInterval(zeitgeber);
  }, [hatInfo, loesche]);
  if (hinweise.length === 0) return null;
  return (
    <div className="hinweisanker">
      <section aria-label="Hinweise" className="hinweise hinweiskasten">
        <h2>Hinweise</h2>
        <ul>
          {hinweise.map((hinweis) => (
            <li key={hinweis.nummer} className={hinweis.stufe}>
              {hinweis.zeit === undefined ? "" : <span className="nebenwert mono">{uhrzeitText(hinweis.zeit)} </span>}
              {hinweis.text}
              <button type="button" className="hinweiszu" aria-label={`Hinweis schließen: ${hinweis.text}`} title="Diesen Hinweis schließen" onClick={() => loesche([hinweis.nummer])}>
                ×
              </button>
            </li>
          ))}
        </ul>
        <button type="button" title="Alle Hinweise aus der Leiste nehmen" onClick={() => loesche(undefined)}>
          Löschen
        </button>
      </section>
    </div>
  );
}
