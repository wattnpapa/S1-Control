import type { EinheitListItem, RecordEditLockInfo } from '@shared/types';
import { faArrowsUpDownLeftRight, faCodeBranch, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { ActionIconButton } from '@renderer/components/common/ActionIconButton';
import { prettyOrganisation } from '@renderer/constants/organisation';
import { TaktischesZeichenEinheit } from '@renderer/components/common/TaktischesZeichenEinheit';
import type { JSX } from 'react';

type EinheitRowItem = EinheitListItem & { abschnittName?: string };

interface EinheitRowProps {
  item: EinheitRowItem;
  isArchived: boolean;
  includeAbschnitt: boolean;
  parentName?: string;
  lock?: RecordEditLockInfo;
  onMove: (id: string) => void;
  onSplit: (id: string) => void;
  onEdit: (id: string) => void;
}

/**
 * Builds lock display labels for one unit row.
 */
function resolveLockState(lock: RecordEditLockInfo | undefined): {
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
 * Renders split/lock badges for a unit name.
 */
function NameBadges({
  item,
  parentName,
  lockLabel,
}: {
  item: EinheitRowItem;
  parentName?: string;
  lockLabel: string | null;
}): JSX.Element {
  return (
    <div className={item.parentEinsatzEinheitId ? 'split-name' : undefined}>
      <span>{item.nameImEinsatz}</span>
      {item.parentEinsatzEinheitId ? (
        <span className="split-badge">Split von {parentName ?? item.parentEinsatzEinheitId}</span>
      ) : null}
      {lockLabel ? <span className="lock-badge">{lockLabel}</span> : null}
    </div>
  );
}

/**
 * Renders action icons for one unit row.
 */
function RowActions({
  itemId,
  isArchived,
  lockedByOther,
  editLabel,
  onMove,
  onEdit,
  onSplit,
}: {
  itemId: string;
  isArchived: boolean;
  lockedByOther: boolean;
  editLabel: string;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
  onSplit: (id: string) => void;
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
      <ActionIconButton
        label="Splitten"
        icon={faCodeBranch}
        onClick={() => onSplit(itemId)}
        disabled={isArchived || lockedByOther}
      />
    </>
  );
}

/**
 * Renders one unit table row.
 */
export function EinheitRow(props: EinheitRowProps): JSX.Element {
  const lock = resolveLockState(props.lock);
  return (
    <tr key={props.item.id} className={props.item.parentEinsatzEinheitId ? 'split-row' : undefined}>
      <td className="tactical-sign-cell">
        <TaktischesZeichenEinheit organisation={props.item.organisation} tacticalSignConfigJson={props.item.tacticalSignConfigJson} />
      </td>
      <td>
        <NameBadges item={props.item} parentName={props.parentName} lockLabel={lock.lockLabel} />
      </td>
      <td>{prettyOrganisation(props.item.organisation)}</td>
      {props.includeAbschnitt ? <td>{props.item.abschnittName}</td> : null}
      <td>{props.item.aktuelleStaerkeTaktisch ?? `0/0/${props.item.aktuelleStaerke}/${props.item.aktuelleStaerke}`}</td>
      <td>{props.item.status}</td>
      <td>
        <RowActions
          itemId={props.item.id}
          isArchived={props.isArchived}
          lockedByOther={lock.lockedByOther}
          editLabel={lock.editLabel}
          onMove={props.onMove}
          onEdit={props.onEdit}
          onSplit={props.onSplit}
        />
      </td>
    </tr>
  );
}
