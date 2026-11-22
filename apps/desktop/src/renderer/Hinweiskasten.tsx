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
 *
 * Nachzug (R2-FaBe P3-1, P3-2): „Löschen“ wurde als „Nachricht löschen“
 * gelesen; der Knopf heißt jetzt „Alle schließen“ und fragt einmal nach,
 * wenn Warnungen oder Fehler dabei sind — sie sollen nicht mit den
 * Auskünften verschwinden. Ein Sofort-Hinweis sagt, dass er ohne Ton kommt:
 * Der Ton gilt nur Blitz (Entscheidung 6), wer nicht hinsieht, übersieht ihn.
 */

import { useEffect, useState } from "react";

import { uhrzeitText } from "@s1/domaene";

import { useLaden, type Hinweis } from "./laden.js";

/** So lange steht eine reine Auskunft („In der Nachweisung unter Nummer 7 eingetragen“), dann verschwindet sie. */
export const INFO_VERFALL_MS = 20_000;

/** Die Nummern der Auskünfte, die zur Zeit `jetzt` abgelaufen sind; Hinweise ohne Zeit bleiben. */
export function abgelaufeneInfos(hinweise: readonly Hinweis[], jetzt: number): readonly number[] {
  return hinweise.filter((h) => h.stufe === "info" && h.zeit !== undefined && jetzt - h.zeit >= INFO_VERFALL_MS).map((h) => h.nummer);
}

/** Der Zusatz an einem Sofort-Hinweis: Er kommt ohne Ton (Entscheidung 6, R2-FaBe P3-2). */
export const TEXT_SOFORT_OHNE_TON = "ohne Ton – den Ton gibt es nur bei Blitz";

/** Die Rückfrage, wenn „Alle schließen“ auch Warnungen nähme (R2-FaBe P3-1). */
export const TEXT_ALLE_SCHLIESSEN = "Auch Warnungen schließen? Noch einmal klicken schließt alle.";

/**
 * Fragt „Alle schließen“ nach? Nur, wenn eine Warnung **mit anderen** Hinweisen
 * verschwände (Durchlauf 2026-11-22): Steht nur ein Hinweis im Kasten, nimmt
 * „Alle schließen“ genau ihn, wie sein „×“ — der Sofort-Hinweis (Stufe Warnung)
 * verlangte sonst bei jeder Sofort-Nachricht zwei Klicks.
 */
export function mussNachfragen(hinweise: readonly Pick<Hinweis, "stufe">[]): boolean {
  return hinweise.length > 1 && hinweise.some((h) => h.stufe !== "info");
}

export function Hinweiskasten(): React.JSX.Element | null {
  const [frage, setzeFrage] = useState(false);
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
              {hinweis.text.startsWith("Sofort-Nachricht") && <span className="nebenwert"> ({TEXT_SOFORT_OHNE_TON})</span>}
              <button type="button" className="hinweiszu" aria-label={`Hinweis schließen: ${hinweis.text}`} title="Diesen Hinweis schließen" onClick={() => loesche([hinweis.nummer])}>
                ×
              </button>
            </li>
          ))}
        </ul>
        {frage && (
          <p className="warnung" role="alert">
            {TEXT_ALLE_SCHLIESSEN}
          </p>
        )}
        <button
          type="button"
          title="Alle Hinweise aus der Leiste nehmen; Nachrichten bleiben, wie sie sind"
          onClick={() => {
            if (!frage && mussNachfragen(hinweise)) {
              setzeFrage(true);
              return;
            }
            setzeFrage(false);
            loesche(undefined);
          }}
        >
          {frage ? "Ja, alle schließen" : "Alle schließen"}
        </button>
      </section>
    </div>
  );
}
