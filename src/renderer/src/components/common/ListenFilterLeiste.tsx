import type { JSX } from 'react';
import type { StatusFilter } from '@renderer/app/useListenFilter';

interface ListenFilterLeisteProps {
  suche: string;
  onSucheChange: (wert: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (wert: StatusFilter) => void;
  platzhalter: string;
  trefferText: string;
}

/**
 * Suche und Statusfilter über einer Gesamtliste.
 */
export function ListenFilterLeiste(props: ListenFilterLeisteProps): JSX.Element {
  return (
    <div className="listen-filter">
      <input
        type="search"
        value={props.suche}
        placeholder={props.platzhalter}
        onChange={(event) => props.onSucheChange(event.target.value)}
        aria-label="Suchen"
      />
      <select
        value={props.statusFilter}
        onChange={(event) => props.onStatusFilterChange(event.target.value as StatusFilter)}
        aria-label="Nach Status filtern"
      >
        <option value="ALLE">Alle Zustände</option>
        <option value="AKTIV">Nur im Einsatz</option>
        <option value="IN_BEREITSTELLUNG">Nur in Bereitstellung</option>
        <option value="AUSSER_EINSATZ">Nur abgemeldet / außer Betrieb</option>
      </select>
      <span className="listen-filter-treffer">{props.trefferText}</span>
    </div>
  );
}
