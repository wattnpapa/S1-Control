import type { AbschnittNode } from '@shared/types';

interface AbschnittSidebarProps {
  abschnitte: AbschnittNode[];
  selectedId: string;
  einsatzName?: string;
  onSelect: (id: string) => void;
  onEditSelected?: () => void;
  editDisabled?: boolean;
}

export function AbschnittSidebar(props: AbschnittSidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <h2>Abschnitte</h2>
      <p className="sidebar-subtitle">{props.einsatzName}</p>
      {props.onEditSelected && (
        <button className="sidebar-edit-button" onClick={props.onEditSelected} disabled={props.editDisabled}>
          Abschnitt bearbeiten
        </button>
      )}
      <AbschnittTree nodes={props.abschnitte} selectedId={props.selectedId} onSelect={props.onSelect} />
    </aside>
  );
}

function AbschnittTree(props: {
  nodes: AbschnittNode[];
  selectedId: string;
  onSelect: (id: string) => void;
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
      <button
        key={node.id}
        className={node.id === props.selectedId ? 'tree-item selected' : 'tree-item'}
        style={{ paddingLeft: `${12 + depth * 12}px` }}
        onClick={() => props.onSelect(node.id)}
      >
        {node.name} [{node.systemTyp}]
      </button>,
      ...renderLevel(node.id, depth + 1),
    ]);
  };

  return <div className="tree">{renderLevel(null, 0)}</div>;
}
