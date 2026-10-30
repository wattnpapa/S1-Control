/**
 * Ein Eingabefeld für eine Zeitangabe in einer Maske.
 *
 * Strg+D schreibt „jetzt“ hinein — dasselbe Kürzel wie in der Zelle der
 * Einheitentabelle und in der Excel (`m_makroFunktionen`, `=Now`). Gelesen
 * wird die Eingabe mit `zeitpunktAusEingabe`: „14:30“, „30.10. 14:30“ oder
 * „30.10.2026 14:30“.
 */

import { zeitpunktText } from "@s1/domaene";

export interface ZeitfeldEigenschaften {
  readonly wert: string;
  readonly aufAenderung: (wert: string) => void;
  readonly platzhalter?: string;
}

export function Zeitfeld({ wert, aufAenderung, platzhalter }: ZeitfeldEigenschaften): React.JSX.Element {
  return (
    <input
      value={wert}
      placeholder={platzhalter}
      title="Strg+D setzt „jetzt“"
      onChange={(e) => {
        aufAenderung(e.target.value);
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
          e.preventDefault();
          aufAenderung(zeitpunktText(new Date().toISOString()));
        }
      }}
    />
  );
}
