import type { RecordEditLockInfo } from '@shared/types';
import { useEffect } from 'react';
import { prewarmFormationSigns } from '@renderer/app/tactical-sign-cache';
import { EinheitRow } from '@renderer/components/tables/EinheitRow';
import type { KraftOverviewItem } from '@renderer/types/ui';

interface KraefteOverviewTableProps {
  einheiten: KraftOverviewItem[];
  isArchived: boolean;
  editLocksById?: Record<string, RecordEditLockInfo | undefined>;
  onMove: (id: string) => void;
  onSplit: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Handles Kraefte Overview Table.
 */
export function KraefteOverviewTable(props: KraefteOverviewTableProps): JSX.Element {
  useEffect(() => {
    prewarmFormationSigns(
      props.einheiten.map((item) => ({
        organisation: item.organisation,
        tacticalSignConfigJson: item.tacticalSignConfigJson,
      })),
    );
  }, [props.einheiten]);

  const nameById = new Map(props.einheiten.map((item) => [item.id, item.nameImEinsatz]));

  return (
    <>
      <h2>Alle Kräfte im Einsatz</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Organisation</th>
            <th>Abschnitt</th>
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
              includeAbschnitt
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
