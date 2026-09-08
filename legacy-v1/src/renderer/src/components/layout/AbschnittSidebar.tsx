import type { AbschnittNode, RecordEditLockInfo } from '@shared/types';

interface AbschnittSidebarProps {
  abschnitte: AbschnittNode[];
  selectedId: string;
  einsatzName?: string;
  locksByAbschnittId?: Record<string, RecordEditLockInfo | undefined>;
  onSelect: (id: string) => void;
  onEditSelected?: () => void;
  editDisabled?: boolean;
}

/**
 * Handles Abschnitt Sidebar.
 */
export function AbschnittSidebar(props: AbschnittSidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <h2>Abschnitte</h2>
      <p className="sidebar-subtitle">{props.einsatzName}</p>
      {props.onEditSelected && (
        <button
          className="sidebar-edit-button"
          onClick={props.onEditSelected}
          disabled={props.editDisabled}
          title={props.editDisabled ? 'Abschnitt wird aktuell bearbeitet oder ist nicht editierbar.' : 'Abschnitt bearbeiten'}
        >
          Abschnitt bearbeiten
        </button>
      )}
      <AbschnittTree
        nodes={props.abschnitte}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
        locksByAbschnittId={props.locksByAbschnittId}
      />
    </aside>
  );
}

/**
 * Handles Abschnitt Tree.
 */
function AbschnittTree(props: {
  nodes: AbschnittNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  locksByAbschnittId?: Record<string, RecordEditLockInfo | undefined>;
}): JSX.Element {
  const byParent = new Map<string | null, AbschnittNode[]>();
  for (const node of props.nodes) {
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);
  }

  const renderLevel = (parentId: string | null, depth: number): JSX.Element[] => {
    const nodes = byParent.get(parentId) ?? [];
    return nodes.flatMap((node) => [
      (() => {
        const lock = props.locksByAbschnittId?.[node.id];
        const lockLabel = lock && !lock.isSelf ? `${lock.computerName} (${lock.userName})` : null;
        return (
      <button
        key={node.id}
        className={node.id === props.selectedId ? 'tree-item selected' : 'tree-item'}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={() => props.onSelect(node.id)}
        title={lockLabel ? `Abschnitt wird bearbeitet von ${lockLabel}` : `${node.name} [${node.systemTyp}]`}
      >
        <span>{node.name} [{node.systemTyp}]</span>
        {lockLabel && <span className="tree-lock-note">Gesperrt: {lockLabel}</span>}
      </button>
        );
      })(),
      ...renderLevel(node.id, depth + 1),
    ]);
  };

  return <div className="tree">{renderLevel(null, 0)}</div>;
}
