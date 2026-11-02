/**
 * Die Zelle „Funkhinweis" der Zuordnung im Blatt „Funkplan" (Option 5b): eine
 * Textzelle wie in der Einheitentabelle — Doppelklick oder Enter öffnet,
 * Enter schreibt, Esc verwirft, Wegklicken schreibt (M3.6).
 *
 * Geschrieben wird mit `funkhinweisDerEinheit`, also über die Spalte
 * `funkhinweis` der Einheitentabelle: dieselbe Zelle, dasselbe Ereignis, mit
 * dem Text, den die Zelle beim Öffnen sah, und der Vorwert-Prüfung. Geht das
 * Schreiben nicht durch, bleibt die Eingabe mit dem Grund stehen; Esc
 * verwirft, und das nächste Öffnen beginnt beim neuen Stand. Solange die
 * Zelle offen ist, sperrt sie die Einheit für die anderen Arbeitsplätze.
 */

import { useRef, useState } from "react";

import type { Funkteilnehmer } from "@s1/domaene";

import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { useLaden } from "./laden.js";
import { useFremdsperren, useSperreHalten } from "./useBearbeitungssperre.js";
import { funkhinweisDerEinheit } from "../kontrakt/funkschritte.js";

export interface FunkhinweiszelleEigenschaften {
  readonly teilnehmer: Funkteilnehmer;
  readonly nurLesen: boolean;
}

interface Offen {
  /** Der Text beim Öffnen — der Vorher-Wert des Schritts. */
  readonly vorher: string;
  readonly eingabe: string;
  readonly fehler?: string;
}

export function Funkhinweiszelle({ teilnehmer: t, nurLesen }: FunkhinweiszelleEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState<Offen | undefined>(undefined);
  const bediene = useLaden((z) => z.bediene);
  const melde = useLaden((z) => z.melde);
  const fremd = useFremdsperren();
  useSperreHalten(offen === undefined ? undefined : t.einheitId);
  /**
   * Nimmt die offene Zelle noch eine Eingabe an? Ein zweiter Auslöser (Enter,
   * dann der Blur des verschwindenden Feldes) schreibt nicht noch einmal, und
   * nach Esc schreibt der Blur nicht doch.
   */
  const nimmtAn = useRef(false);

  const oeffne = (): void => {
    if (nurLesen) return;
    const hinweis = fremd.pruefeStart(t.einheitId);
    if (hinweis !== undefined) {
      melde("warnung", hinweis);
      return;
    }
    nimmtAn.current = true;
    setzeOffen({ vorher: t.funkhinweis, eingabe: t.funkhinweis });
  };

  const schreibe = (stand: Offen): void => {
    if (!nimmtAn.current) return;
    nimmtAn.current = false;
    const entwurf = funkhinweisDerEinheit(t.einheitId, stand.vorher === "" ? undefined : stand.vorher, stand.eingabe);
    if (entwurf === undefined) {
      setzeOffen(undefined);
      return;
    }
    void bediene(entwurf).then((ergebnis) => {
      const hinweis = hinweisAusErgebnis(ergebnis);
      if (hinweis === undefined) {
        setzeOffen(undefined);
        return;
      }
      nimmtAn.current = true;
      setzeOffen({ ...stand, fehler: hinweis });
    });
  };

  if (offen === undefined || nurLesen) {
    return (
      <td
        className="bearbeitbar funkhinweis"
        tabIndex={nurLesen ? undefined : 0}
        title={nurLesen ? undefined : "Doppelklick oder Enter: Funkhinweis bearbeiten"}
        onDoubleClick={oeffne}
        onKeyDown={(e) => {
          if (e.key === "Enter") oeffne();
        }}
      >
        {t.funkhinweis === "" ? <span className="leise">—</span> : t.funkhinweis}
      </td>
    );
  }
  return (
    <td className="bearbeitbar offen funkhinweis">
      <input
        autoFocus
        aria-label={`Funkhinweis für ${t.einheit}`}
        aria-invalid={offen.fehler !== undefined}
        value={offen.eingabe}
        onChange={(e) => setzeOffen({ vorher: offen.vorher, eingabe: e.target.value })}
        onBlur={() => schreibe(offen)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            schreibe(offen);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            nimmtAn.current = false;
            setzeOffen(undefined);
          }
        }}
      />
      {offen.fehler !== undefined && <span className="feldfehler">{offen.fehler}</span>}
    </td>
  );
}
