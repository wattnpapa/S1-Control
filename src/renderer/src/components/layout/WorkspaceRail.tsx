import {
  faBoxesStacked,
  faClipboardCheck,
  faClockRotateLeft,
  faGear,
  faSitemap,
  faTruck,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { WorkspaceView } from '@renderer/types/ui';
import type { JSX } from 'react';

interface WorkspaceRailProps {
  activeView: WorkspaceView;
  onSelect: (view: WorkspaceView) => void;
}

/**
 * Die Navigation trägt Klartext statt Einzelbuchstaben: im Einsatz bleibt
 * keine Zeit, sich E, G, K und F zu merken.
 */
const EINTRAEGE: Array<{ view: WorkspaceView; text: string; icon: IconDefinition }> = [
  { view: 'einsatz', text: 'Einsatz', icon: faBoxesStacked },
  { view: 'fuehrung', text: 'Gliederung', icon: faSitemap },
  { view: 'kraefte', text: 'Kräfte', icon: faUsers },
  { view: 'fahrzeuge', text: 'Fahrzeuge', icon: faTruck },
  { view: 'journal', text: 'Bewegungen', icon: faClockRotateLeft },
  { view: 'abschluss', text: 'Abschluss', icon: faClipboardCheck },
];

/**
 * Handles Workspace Rail.
 */
export function WorkspaceRail(props: WorkspaceRailProps): JSX.Element {
  return (
    <aside className="workspace-rail">
      {EINTRAEGE.map((eintrag) => (
        <button
          key={eintrag.view}
          className={props.activeView === eintrag.view ? 'rail-button active' : 'rail-button'}
          title={eintrag.text}
          aria-current={props.activeView === eintrag.view ? 'page' : undefined}
          onClick={() => props.onSelect(eintrag.view)}
        >
          <FontAwesomeIcon icon={eintrag.icon} />
          <span className="rail-text">{eintrag.text}</span>
        </button>
      ))}
      <div className="rail-spacer" />
      <button
        className={
          props.activeView === 'einstellungen' ? 'rail-button active secondary' : 'rail-button secondary'
        }
        title="Einstellungen"
        aria-current={props.activeView === 'einstellungen' ? 'page' : undefined}
        onClick={() => props.onSelect('einstellungen')}
      >
        <FontAwesomeIcon icon={faGear} />
        <span className="rail-text">Einstellungen</span>
      </button>
    </aside>
  );
}
