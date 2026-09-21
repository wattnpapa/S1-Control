import { useCallback, useEffect, useState } from 'react';

export type AnzeigeThema = 'automatisch' | 'hell' | 'dunkel';

const SPEICHER_SCHLUESSEL = 's1-control.anzeige-thema';

function lesenAusSpeicher(): AnzeigeThema {
  try {
    const wert = window.localStorage.getItem(SPEICHER_SCHLUESSEL);
    if (wert === 'hell' || wert === 'dunkel' || wert === 'automatisch') {
      return wert;
    }
  } catch {
    // Kein Speicher verfügbar — dann gilt die Einstellung des Systems.
  }
  return 'automatisch';
}

/**
 * Steuert helle und dunkle Darstellung.
 *
 * Vorgabe ist die Einstellung des Betriebssystems; im Einsatz lässt sie sich
 * fest umstellen, etwa wenn der Rechner hell eingestellt ist, der
 * Führungsraum aber abgedunkelt.
 */
export function useAnzeigeThema() {
  const [thema, setThemaState] = useState<AnzeigeThema>(lesenAusSpeicher);

  useEffect(() => {
    const wurzel = document.documentElement;
    if (thema === 'automatisch') {
      wurzel.removeAttribute('data-theme');
    } else {
      wurzel.setAttribute('data-theme', thema);
    }
  }, [thema]);

  const setThema = useCallback((naechstes: AnzeigeThema) => {
    setThemaState(naechstes);
    try {
      window.localStorage.setItem(SPEICHER_SCHLUESSEL, naechstes);
    } catch {
      // Ohne Speicher gilt die Wahl nur für diese Sitzung.
    }
  }, []);

  return { thema, setThema };
}
