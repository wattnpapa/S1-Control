import type { AbschnittNode } from '@shared/types';
import {
  ABSCHNITT_TYP_OPTIONEN,
  abschnittTypErklaerung,
} from '@renderer/constants/abschnitt';
import type { CreateAbschnittForm } from '@renderer/types/ui';
import type { JSX } from 'react';
import { useDialogTastatur } from '@renderer/app/useDialogTastatur';

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

/**
 * Handles Create Abschnitt Dialog.
 */
export function CreateAbschnittDialog(props: CreateAbschnittDialogProps): JSX.Element | null {
  const rahmenRef = useDialogTastatur({
    visible: props.visible,
    onClose: props.onClose,
    onSubmit: props.onSubmit,
  });
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" ref={rahmenRef}>
        <h3>Abschnitt anlegen</h3>
        <label>
          Name
          <input
            value={props.form.name}
            onChange={(e) => props.onChange({ ...props.form, name: e.target.value })}
            data-testid="abschnitt-name"
            placeholder="z.B. Abschnitt Nord"
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
