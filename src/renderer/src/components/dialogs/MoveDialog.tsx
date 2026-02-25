import type { AbschnittNode } from '@shared/types';

interface MoveDialogProps {
  visible: boolean;
  type: 'einheit' | 'fahrzeug';
  abschnitte: AbschnittNode[];
  moveTarget: string;
  isArchived: boolean;
  onChangeTarget: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function MoveDialog(props: MoveDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{props.type === 'einheit' ? 'Einheit verschieben' : 'Fahrzeug verschieben'}</h3>
        <select value={props.moveTarget} onChange={(e) => props.onChangeTarget(e.target.value)}>
          {props.abschnitte.map((abschnitt) => (
            <option key={abschnitt.id} value={abschnitt.id}>
              {abschnitt.name}
            </option>
          ))}
        </select>
        <div className="modal-actions">
          <button onClick={props.onConfirm} disabled={!props.moveTarget || props.isArchived}>
            Bestätigen
          </button>
          <button onClick={props.onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
