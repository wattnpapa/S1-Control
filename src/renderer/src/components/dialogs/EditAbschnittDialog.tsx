import type { AbschnittNode } from '@shared/types';
import {
  ABSCHNITT_TYP_OPTIONEN,
  abschnittTypErklaerung,
} from '@renderer/constants/abschnitt';
import type { EditAbschnittForm } from '@renderer/types/ui';

interface EditAbschnittDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditAbschnittForm;
  abschnitte: AbschnittNode[];
  onChange: (next: EditAbschnittForm) => void;
  onSubmit: () => void;
  onRemove: () => void;
  onClose: () => void;
}

/**
 * Handles Edit Abschnitt Dialog.
 */
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
          Art des Abschnitts
          <select
            value={props.form.systemTyp}
            onChange={(e) => props.onChange({ ...props.form, systemTyp: e.target.value as AbschnittNode['systemTyp'] })}
          >
            {ABSCHNITT_TYP_OPTIONEN.map((option) => (
              <option key={option.wert} value={option.wert}>
                {option.bezeichnung}
              </option>
            ))}
          </select>
          <span className="feld-hinweis">{abschnittTypErklaerung(props.form.systemTyp)}</span>
        </label>
        <label>
          Übergeordneter Abschnitt (optional)
          <select
            value={props.form.parentId}
            onChange={(e) => props.onChange({ ...props.form, parentId: e.target.value })}
          >
            <option value="">Keiner — steht direkt unter dem Einsatz</option>
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
          <button
            className="btn-gefahr-schlicht"
            onClick={props.onRemove}
            disabled={props.busy || props.isArchived}
            title="Nur möglich, wenn der Abschnitt leer ist"
          >
            Abschnitt entfernen
          </button>
          <button onClick={props.onClose} disabled={props.busy}>
            Abbrechen
          </button>
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
