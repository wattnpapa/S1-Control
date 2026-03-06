import type { FahrzeugListItem, RecordEditLockInfo } from '@shared/types';
import { useEffect } from 'react';
import { prewarmVehicleSigns } from '@renderer/app/tactical-sign-cache';
import { FahrzeugRow } from '@renderer/components/tables/FahrzeugRow';

interface FahrzeugeTableProps {
  fahrzeuge: FahrzeugListItem[];
  isArchived: boolean;
  editLocksById?: Record<string, RecordEditLockInfo | undefined>;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Handles Fahrzeuge Table.
 */
export function FahrzeugeTable(props: FahrzeugeTableProps): JSX.Element {
  useEffect(() => {
    prewarmVehicleSigns(
      props.fahrzeuge.map((item) => ({
        organisation: item.organisation,
        name: item.name,
        funkrufname: item.funkrufname,
      })),
    );
  }, [props.fahrzeuge]);

  return (
    <>
      <h2>Fahrzeuge im Abschnitt</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Kennzeichen</th>
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
              includeOverviewColumns={false}
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
