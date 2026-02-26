import type { AbschnittNode } from '@shared/types';
import type { EditAbschnittForm } from '@renderer/types/ui';

interface EditAbschnittDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditAbschnittForm;
  abschnitte: AbschnittNode[];
  onChange: (next: EditAbschnittForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EditAbschnittDialog(props: EditAbschnittDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Abschnitt bearbeiten</h3>
        <label>
          Name
          <input
            value={props.form.name}
            onChange={(e) => props.onChange({ ...props.form, name: e.target.value })}
          />
        </label>
        <label>
          Systemtyp
          <select
            value={props.form.systemTyp}
            onChange={(e) => props.onChange({ ...props.form, systemTyp: e.target.value as AbschnittNode['systemTyp'] })}
          >
            <option value="NORMAL">NORMAL</option>
            <option value="FUEST">FUEST</option>
            <option value="ANFAHRT">ANFAHRT</option>
            <option value="LOGISTIK">LOGISTIK</option>
            <option value="BEREITSTELLUNGSRAUM">BEREITSTELLUNGSRAUM</option>
          </select>
        </label>
        <label>
          Parent-Abschnitt (optional)
          <select
            value={props.form.parentId}
            onChange={(e) => props.onChange({ ...props.form, parentId: e.target.value })}
          >
            <option value="">Kein Parent (Root)</option>
            {props.abschnitte
              .filter((abschnitt) => abschnitt.id !== props.form.abschnittId)
              .map((abschnitt) => (
                <option key={abschnitt.id} value={abschnitt.id}>
                  {abschnitt.name} [{abschnitt.systemTyp}]
                </option>
              ))}
          </select>
        </label>
        <div className="modal-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Speichern
          </button>
          <button onClick={props.onClose} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
