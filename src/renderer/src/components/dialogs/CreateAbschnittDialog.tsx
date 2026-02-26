import type { AbschnittNode } from '@shared/types';
import type { CreateAbschnittForm } from '@renderer/types/ui';

interface CreateAbschnittDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: CreateAbschnittForm;
  abschnitte: AbschnittNode[];
  onChange: (next: CreateAbschnittForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function CreateAbschnittDialog(props: CreateAbschnittDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Abschnitt anlegen</h3>
        <label>
          Name
          <input
            value={props.form.name}
            onChange={(e) => props.onChange({ ...props.form, name: e.target.value })}
            placeholder="z.B. Abschnitt Nord"
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
            {props.abschnitte.map((abschnitt) => (
              <option key={abschnitt.id} value={abschnitt.id}>
                {abschnitt.name} [{abschnitt.systemTyp}]
              </option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Anlegen
          </button>
          <button onClick={props.onClose} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
