import { AbschnittField, EinheitCaptureFields, EinheitCoreFields } from '@renderer/components/dialogs/EinheitFormFields';
import type { CreateEinheitForm } from '@renderer/types/ui';
import type { AbschnittNode } from '@shared/types';

interface CreateEinheitDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: CreateEinheitForm;
  abschnitte: AbschnittNode[];
  onChange: (next: CreateEinheitForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Handles Create Einheit Dialog.
 */
export function CreateEinheitDialog(props: CreateEinheitDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Einheit anlegen</h3>
        <EinheitCoreFields form={props.form} onChange={props.onChange} showNamePlaceholder />
        <AbschnittField form={props.form} abschnitte={props.abschnitte} onChange={props.onChange} />
        <EinheitCaptureFields form={props.form} onChange={props.onChange} showPlaceholders />
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
