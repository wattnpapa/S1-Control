import type { WorkspaceView } from '@renderer/types/ui';

interface WorkspaceRailProps {
  activeView: WorkspaceView;
  onSelect: (view: WorkspaceView) => void;
}

export function WorkspaceRail(props: WorkspaceRailProps): JSX.Element {
  return (
    <aside className="workspace-rail">
      <button
        className={props.activeView === 'einsatz' ? 'rail-button active' : 'rail-button'}
        title="Einsatz"
        onClick={() => props.onSelect('einsatz')}
      >
        E
      </button>
      <button
        className={props.activeView === 'fuehrung' ? 'rail-button active' : 'rail-button'}
        title="Führungsstruktur"
        onClick={() => props.onSelect('fuehrung')}
      >
        G
      </button>
      <button
        className={props.activeView === 'kraefte' ? 'rail-button active' : 'rail-button'}
        title="Kräfte"
        onClick={() => props.onSelect('kraefte')}
      >
        K
      </button>
      <button
        className={props.activeView === 'fahrzeuge' ? 'rail-button active' : 'rail-button'}
        title="Fahrzeuge"
        onClick={() => props.onSelect('fahrzeuge')}
      >
        F
      </button>
      <div className="rail-spacer" />
      <button
        className={props.activeView === 'einstellungen' ? 'rail-button active secondary' : 'rail-button secondary'}
        title="Einstellungen"
        onClick={() => props.onSelect('einstellungen')}
      >
        S
      </button>
    </aside>
  );
}
