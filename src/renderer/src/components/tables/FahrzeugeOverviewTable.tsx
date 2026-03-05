import type { RecordEditLockInfo } from '@shared/types';
import type { FahrzeugOverviewItem } from '@renderer/types/ui';
import { FahrzeugRow } from '@renderer/components/tables/FahrzeugRow';

interface FahrzeugeOverviewTableProps {
  fahrzeuge: FahrzeugOverviewItem[];
  isArchived: boolean;
  editLocksById?: Record<string, RecordEditLockInfo | undefined>;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Handles Fahrzeuge Overview Table.
 */
export function FahrzeugeOverviewTable(props: FahrzeugeOverviewTableProps): JSX.Element {
  return (
    <>
      <h2>Alle Fahrzeuge im Einsatz</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Kennzeichen</th>
            <th>Zugeordnete Einheit</th>
            <th>Abschnitt</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {props.fahrzeuge.map((item) => (
            <FahrzeugRow
              key={item.id}
              item={item}
              isArchived={props.isArchived}
              includeOverviewColumns
              lock={props.editLocksById?.[item.id]}
              onMove={props.onMove}
              onEdit={props.onEdit}
            />
          ))}
        </tbody>
      </table>
    </>
  );
}
