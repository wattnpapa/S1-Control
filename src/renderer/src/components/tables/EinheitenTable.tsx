import type { EinheitListItem, RecordEditLockInfo } from '@shared/types';
import { faArrowsUpDownLeftRight, faCodeBranch, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { ActionIconButton } from '@renderer/components/common/ActionIconButton';
import { prettyOrganisation } from '@renderer/constants/organisation';
import { TaktischesZeichenEinheit } from '@renderer/components/common/TaktischesZeichenEinheit';

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
  const nameById = new Map(props.einheiten.map((e) => [e.id, e.nameImEinsatz]));

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
          {props.einheiten.map((item) => {
            const lock = props.editLocksById?.[item.id];
            const lockedByOther = Boolean(lock && !lock.isSelf);
            const lockLabel = lockedByOther ? `In Bearbeitung: ${lock?.computerName} (${lock?.userName})` : null;
            return (
            <tr key={item.id} className={item.parentEinsatzEinheitId ? 'split-row' : undefined}>
              <td className="tactical-sign-cell">
                <TaktischesZeichenEinheit
                  organisation={item.organisation}
                  tacticalSignConfigJson={item.tacticalSignConfigJson}
                />
              </td>
              <td>
                <div className={item.parentEinsatzEinheitId ? 'split-name' : undefined}>
                  <span>{item.nameImEinsatz}</span>
                  {item.parentEinsatzEinheitId && (
                    <span className="split-badge">
                      Split von {nameById.get(item.parentEinsatzEinheitId) ?? item.parentEinsatzEinheitId}
                    </span>
                  )}
                  {lockLabel && <span className="lock-badge">{lockLabel}</span>}
                </div>
              </td>
              <td>{prettyOrganisation(item.organisation)}</td>
              <td>{item.aktuelleStaerkeTaktisch ?? `0/0/${item.aktuelleStaerke}/${item.aktuelleStaerke}`}</td>
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
                <ActionIconButton
                  label="Splitten"
                  icon={faCodeBranch}
                  onClick={() => props.onSplit(item.id)}
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
