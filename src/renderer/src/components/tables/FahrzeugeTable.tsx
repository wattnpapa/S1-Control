import type { FahrzeugListItem, RecordEditLockInfo } from '@shared/types';
import { faArrowsUpDownLeftRight, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { ActionIconButton } from '@renderer/components/common/ActionIconButton';
import { TaktischesZeichenFahrzeug } from '@renderer/components/common/TaktischesZeichenFahrzeug';

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
          {props.fahrzeuge.map((item) => {
            const lock = props.editLocksById?.[item.id];
            const lockedByOther = Boolean(lock && !lock.isSelf);
            const lockLabel = lockedByOther ? `In Bearbeitung: ${lock?.computerName} (${lock?.userName})` : null;
            return (
            <tr key={item.id}>
              <td className="tactical-sign-cell">
                <TaktischesZeichenFahrzeug organisation={item.organisation} />
              </td>
              <td>
                <div className="split-name">
                  <span>{item.name}</span>
                  {lockLabel && <span className="lock-badge">{lockLabel}</span>}
                </div>
              </td>
              <td>{item.kennzeichen || '-'}</td>
              <td>{item.status}</td>
              <td>
                <ActionIconButton
                  label="Verschieben"
                  icon={faArrowsUpDownLeftRight}
                  onClick={() => props.onMove(item.id)}
                  disabled={props.isArchived || lockedByOther}
                />
                <ActionIconButton
                  label={lockedByOther ? `Bearbeiten gesperrt (${lock?.computerName})` : 'Bearbeiten'}
                  icon={faPenToSquare}
                  onClick={() => props.onEdit(item.id)}
                  disabled={props.isArchived || lockedByOther}
                />
              </td>
            </tr>
          )})}
        </tbody>
      </table>
    </>
  );
}
