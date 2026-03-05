import type { EinheitListItem, RecordEditLockInfo } from '@shared/types';
import { EinheitRow } from '@renderer/components/tables/EinheitRow';

interface EinheitenTableProps {
  einheiten: EinheitListItem[];
  isArchived: boolean;
  editLocksById?: Record<string, RecordEditLockInfo | undefined>;
  onMove: (id: string) => void;
  onSplit: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Handles Einheiten Table.
 */
export function EinheitenTable(props: EinheitenTableProps): JSX.Element {
  const nameById = new Map(props.einheiten.map((item) => [item.id, item.nameImEinsatz]));

  return (
    <>
      <h2>Einheiten im Abschnitt</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Organisation</th>
            <th>Stärke (taktisch)</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {props.einheiten.map((item) => (
            <EinheitRow
              key={item.id}
              item={item}
              isArchived={props.isArchived}
              includeAbschnitt={false}
              parentName={item.parentEinsatzEinheitId ? nameById.get(item.parentEinsatzEinheitId) : undefined}
              lock={props.editLocksById?.[item.id]}
              onMove={props.onMove}
              onEdit={props.onEdit}
              onSplit={props.onSplit}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}
