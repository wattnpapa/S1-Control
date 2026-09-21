import type { EditEinsatzForm } from '@renderer/types/ui';
import type { JSX } from 'react';
import { useDialogTastatur } from '@renderer/app/useDialogTastatur';

interface EditEinsatzDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditEinsatzForm;
  onChange: (next: EditEinsatzForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Handles Edit Einsatz Basisdaten Dialog.
 */
export function EditEinsatzDialog(props: EditEinsatzDialogProps): JSX.Element | null {
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
        <h3>Basisdaten bearbeiten</h3>
        <label>
          Einsatzname
          <input
            value={props.form.name}
            onChange={(e) => props.onChange({ ...props.form, name: e.target.value })}
          />
        </label>
        <label>
          Führungsstellenname
          <input
            value={props.form.fuestName}
            onChange={(e) => props.onChange({ ...props.form, fuestName: e.target.value })}
          />
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
