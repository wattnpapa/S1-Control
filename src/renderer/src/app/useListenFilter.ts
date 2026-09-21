import { useMemo, useState } from 'react';

export type StatusFilter = 'ALLE' | 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_EINSATZ';

interface FilterbaresElement {
  status: string;
  abschnittName?: string;
}

/**
 * Wendet Suche, Statusfilter und Sortierung an.
 *
 * Als eigene Funktion, damit die Regeln ohne React geprüft werden können.
 */
export function filtereListe<T extends FilterbaresElement>(
  elemente: T[],
  suchfelder: (element: T) => string[],
  suche: string,
  statusFilter: StatusFilter,
): T[] {
  const begriff = suche.trim().toLowerCase();
  return elemente
    .filter((element) => {
      if (statusFilter === 'AUSSER_EINSATZ') {
        return element.status === 'ABGEMELDET' || element.status === 'AUSSER_BETRIEB';
      }
      if (statusFilter !== 'ALLE') {
        return element.status === statusFilter;
      }
      return true;
    })
    .filter((element) => {
      if (!begriff) {
        return true;
      }
      return suchfelder(element).some((feld) => feld.toLowerCase().includes(begriff));
    })
    .sort((a, b) => (a.abschnittName ?? '').localeCompare(b.abschnittName ?? '', 'de'));
}

/**
 * Suche, Statusfilter und Sortierung für die Gesamtlisten.
 *
 * Bei mehr als einer Handvoll Einheiten ist eine ungefilterte Liste im
 * Einsatz nicht mehr zu überblicken.
 */
export function useListenFilter<T extends FilterbaresElement>(
  elemente: T[],
  suchfelder: (element: T) => string[],
) {
  const [suche, setSuche] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALLE');

  const gefiltert = useMemo(
    () => filtereListe(elemente, suchfelder, suche, statusFilter),
    [elemente, statusFilter, suche, suchfelder],
  );

  return { suche, setSuche, statusFilter, setStatusFilter, gefiltert };
}
