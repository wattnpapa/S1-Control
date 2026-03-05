import { EinheitCaptureFields, EinheitCoreFields } from '@renderer/components/dialogs/EinheitFormFields';
import type { EditEinheitForm } from '@renderer/types/ui';

interface EditEinheitDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditEinheitForm;
  onChange: (next: EditEinheitForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Handles Edit Einheit Dialog.
 */
export function EditEinheitDialog(props: EditEinheitDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Einheit bearbeiten</h3>
        <EinheitCoreFields form={props.form} onChange={props.onChange} />
        <EinheitCaptureFields form={props.form} onChange={props.onChange} />
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
