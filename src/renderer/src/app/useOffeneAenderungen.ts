import { useEffect } from 'react';

/**
 * Warnt vor dem Schließen des Fensters, solange ein Editor offen ist.
 *
 * Ohne diese Warnung sind halb erfasste Einheiten nach einem versehentlichen
 * Schließen oder Neuladen verloren.
 */
export function useOffeneAenderungen(offen: boolean): void {
  useEffect(() => {
    if (!offen) {
      return;
    }
    const beiVerlassen = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beiVerlassen);
    return () => window.removeEventListener('beforeunload', beiVerlassen);
  }, [offen]);
}
