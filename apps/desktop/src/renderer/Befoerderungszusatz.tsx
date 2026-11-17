/**
 * Was die Beförderungsmaske über den Beförderungsvermerk hinaus zeigt
 * (Audit LdF P0-1, Sachgebietsleiter P1-6) — eigene Datei, damit
 * `Fmzmasken.tsx` nicht weiter wächst.
 *
 * - Ist keine Annahme vermerkt, steht sichtbar „Annahme wird mit
 *   eingetragen“: Der Worker schreibt sie mit Uhrzeit und Handzeichen der
 *   Beförderung als Folgeschritt (`nachrichtenfolgen.ts`). Befördern ohne
 *   Annahme ließ vorher eine Lücke im Betriebsbuch, die niemand bemerkte.
 * - Ist keine Nummer vergeben, warnt die Maske „Ohne Nachweisungsnummer“
 *   und bietet das Nummernfeld gleich hier an, vorbelegt mit der nächsten
 *   Nummer. Leer lassen bleibt erlaubt — bei Blitz kann Papier vorgehen —,
 *   aber erst mit dem zweiten Klick „Trotzdem ohne Nummer“.
 * - Zweiter Durchlauf (Stand be6f9b9, Bild befoerdern.png): Der Satz
 *   „Ohne Nachweisungsnummer: Die Nachricht steht noch nicht in der
 *   Nachweisung“ stand über einem schon vorbelegten Nummernfeld und las sich,
 *   als ginge die Nachricht ohne Nummer hinaus. Er sagt jetzt, was gilt: Die
 *   Nummer ist vorbelegt; leer lassen heißt ohne Nummer befördern.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

/** Der Satz über der nachgetragenen Annahme. */
export const TEXT_ANNAHME_MIT = "Annahme wird mit eingetragen (Uhrzeit und Handzeichen der Beförderung).";
/** Der Hinweis am vorbelegten Nummernfeld, solange die Nachricht keine Nummer trägt (zweiter Durchlauf). */
export const TEXT_OHNE_NUMMER = "Nummer ist vorbelegt; leer lassen heißt ohne Nummer befördern (zweiter Klick).";
/** Der Hinweis, wenn das Nummernfeld leer ist — es gab keine Vorbelegung, oder sie wurde gelöscht. */
export const TEXT_NUMMER_LEER = "Keine Nummer eingetragen; leer lassen heißt ohne Nummer befördern (zweiter Klick).";
/** Der Satz nach dem ersten Klick mit leerer Nummer. */
export const TEXT_TROTZDEM_OHNE = "Noch einmal „Trotzdem ohne Nummer“ drücken, um ohne Nummer zu befördern; die FmZ zeigt sie dann unter „Ohne Nummer“.";

export interface BefoerderungszusatzEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly nummer: string;
  readonly aufNummer: (wert: string) => void;
  /** Die Warnung vor einer schon vergebenen Nummer (§9), sonst `undefined`. */
  readonly warnung: string | undefined;
  readonly ohneNummerBestaetigt: boolean;
}

export function Befoerderungszusatz({ zeile, nummer, aufNummer, warnung, ohneNummerBestaetigt }: BefoerderungszusatzEigenschaften): React.JSX.Element | null {
  const ohneAnnahme = zeile.annahme === undefined;
  const ohneNummer = zeile.nummer === undefined;
  if (!ohneAnnahme && !ohneNummer) return null;
  return (
    <>
      {ohneAnnahme && (
        <p className="hinweistext" role="status">
          {TEXT_ANNAHME_MIT}
        </p>
      )}
      {ohneNummer && (
        <>
          <p className="hinweistext" role="status">
            {nummer.trim() === "" ? TEXT_NUMMER_LEER : TEXT_OHNE_NUMMER}
          </p>
          <label>
            Nr.
            <input value={nummer} inputMode="numeric" className="mono" title="Vorbelegt mit der nächsten Nummer; leer lassen nur, wenn die Nummer später vergeben wird" onChange={(ev) => aufNummer(ev.target.value)} />
          </label>
        </>
      )}
      {warnung !== undefined && (
        <p className="warnung" role="alert">
          {warnung}
        </p>
      )}
      {ohneNummer && nummer.trim() === "" && ohneNummerBestaetigt && (
        <p className="warnung" role="alert">
          {TEXT_TROTZDEM_OHNE}
        </p>
      )}
    </>
  );
}
