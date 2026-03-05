import type { FahrzeugListItem, RecordEditLockInfo } from '@shared/types';
import { faArrowsUpDownLeftRight, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { ActionIconButton } from '@renderer/components/common/ActionIconButton';
import { TaktischesZeichenFahrzeug } from '@renderer/components/common/TaktischesZeichenFahrzeug';
import type { JSX } from 'react';

type FahrzeugRowItem = FahrzeugListItem & { abschnittName?: string; einheitName?: string };

interface FahrzeugRowProps {
  item: FahrzeugRowItem;
  isArchived: boolean;
  includeOverviewColumns: boolean;
  lock?: RecordEditLockInfo;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Builds lock labels for vehicle rows.
 */
function vehicleLockState(lock: RecordEditLockInfo | undefined): {
  lockedByOther: boolean;
  lockLabel: string | null;
  editLabel: string;
} {
  const lockedByOther = Boolean(lock && !lock.isSelf);
  const lockLabel = lockedByOther ? `In Bearbeitung: ${lock?.computerName} (${lock?.userName})` : null;
  const editLabel = lockedByOther ? `Bearbeiten gesperrt (${lock?.computerName})` : 'Bearbeiten';
  return { lockedByOther, lockLabel, editLabel };
}

/**
 * Renders action icons for one vehicle row.
 */
function FahrzeugRowActions({
  itemId,
  isArchived,
  lockedByOther,
  editLabel,
  onMove,
  onEdit,
}: {
  itemId: string;
  isArchived: boolean;
  lockedByOther: boolean;
  editLabel: string;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
}): JSX.Element {
  return (
    <>
      <ActionIconButton
        label="Verschieben"
        icon={faArrowsUpDownLeftRight}
        onClick={() => onMove(itemId)}
        disabled={isArchived || lockedByOther}
      />
      <ActionIconButton
        label={editLabel}
        icon={faPenToSquare}
        onClick={() => onEdit(itemId)}
        disabled={isArchived || lockedByOther}
      />
    </>
  );
}

/**
 * Renders one vehicle row shared by section and overview tables.
 */
export function FahrzeugRow(props: FahrzeugRowProps): JSX.Element {
  const lock = vehicleLockState(props.lock);
  return (
    <tr key={props.item.id}>
      <td className="tactical-sign-cell">
        <TaktischesZeichenFahrzeug
          organisation={props.item.organisation}
          name={props.item.name}
          funkrufname={props.item.funkrufname}
        />
      </td>
      <td>
        <div className="split-name">
          <span>{props.item.name}</span>
          {lock.lockLabel ? <span className="lock-badge">{lock.lockLabel}</span> : null}
        </div>
      </td>
      <td>{props.item.kennzeichen || '-'}</td>
      {props.includeOverviewColumns ? (
        <>
          <td>{props.item.einheitName}</td>
          <td>{props.item.abschnittName}</td>
        </>
      ) : null}
      <td>{props.item.status}</td>
      <td>
        <FahrzeugRowActions
          itemId={props.item.id}
          isArchived={props.isArchived}
          lockedByOther={lock.lockedByOther}
          editLabel={lock.editLabel}
          onMove={props.onMove}
          onEdit={props.onEdit}
        />
      </td>
    </tr>
  );
}
