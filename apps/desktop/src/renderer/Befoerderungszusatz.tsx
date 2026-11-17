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
 */

import type { Nachrichtenzeile } from "@s1/domaene";

/** Der Satz über der nachgetragenen Annahme. */
export const TEXT_ANNAHME_MIT = "Annahme wird mit eingetragen (Uhrzeit und Handzeichen der Beförderung).";
/** Die Warnung, solange die Nachricht keine Nummer trägt. */
export const TEXT_OHNE_NUMMER = "Ohne Nachweisungsnummer: Die Nachricht steht noch nicht in der Nachweisung. Nummer hier eintragen oder leer lassen.";
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
          <p className="warnung" role="status">
            {TEXT_OHNE_NUMMER}
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
