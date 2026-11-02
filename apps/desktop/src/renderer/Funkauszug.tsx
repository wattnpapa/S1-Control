/**
 * Der Tagebuchauszug einer Einheit, gefiltert auf den Funkplan — die
 * Kurzliste unter der Maske „Funk und Erreichbarkeit" (Option 5d).
 *
 * Geholt mit dem vorhandenen Ruf `tagebuchAnfordern` (Filter Einheit) und
 * hier auf die Funkzeilen geschnitten (`projektion.istFunkzeile`): Rufgruppe,
 * weitere Gruppen, Funkhinweis, Funkrufname, Erreichbarkeit. Unmittelbar über
 * die Brücke und nicht über den Store, damit das offene Blatt „Tagebuch"
 * seinen Filter behält. Gesehen werden die jüngsten {@link AUSZUG_UMFANG}
 * Zeilen der Einheit; wer weiter zurück will, öffnet das Tagebuch.
 */

import { useEffect, useState } from "react";

import { projektion, type Tagebuchzeile } from "@s1/domaene";

import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { uhrzeit } from "./Tagebuch.js";

/** So viele Zeilen der Einheit werden geholt, bevor auf Funk geschnitten wird. */
export const AUSZUG_UMFANG = 200;
/** So viele Funkzeilen stehen in der Maske. */
export const AUSZUG_ZEILEN = 6;

function useFunkzeilen(einheitId: string): readonly Tagebuchzeile[] | undefined {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const [zeilen, setzeZeilen] = useState<readonly Tagebuchzeile[] | undefined>(undefined);
  useEffect(() => {
    if (akteId === undefined) return undefined;
    let gilt = true;
    rufe({ art: "tagebuchAnfordern", akteId, einheitId, anzahl: AUSZUG_UMFANG })
      .then((antwort) => {
        const wert: unknown = antwort;
        // Eine Attrappe oder ein alter Dienst antwortet mit `null`: dann kein Auszug.
        if (!gilt || wert === null || typeof wert !== "object") return;
        setzeZeilen(antwort.zeilen.filter(projektion.istFunkzeile));
      })
      .catch(() => {
        if (gilt) setzeZeilen([]);
      });
    return () => {
      gilt = false;
    };
  }, [akteId, einheitId, lageZeiger]);
  return zeilen;
}

export function Funkauszug({ einheitId }: { readonly einheitId: string }): React.JSX.Element | null {
  const zeilen = useFunkzeilen(einheitId);
  if (zeilen === undefined) return null;
  return (
    <section className="funkauszug" aria-label="Tagebuch zu Funk">
      <span className="feldtitel">Tagebuch · Funk</span>
      {zeilen.length === 0 ? (
        <p className="leise">Noch keine Einträge zu Funk.</p>
      ) : (
        <ul>
          {zeilen.slice(0, AUSZUG_ZEILEN).map((z) => (
            <li key={z.ereignisId}>
              <b>{uhrzeit(z.wanduhr)}</b> {z.satz}
              {z.grund === undefined ? "" : ` · Grund: ${z.grund}`} <span className="leise">({z.akteur})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
