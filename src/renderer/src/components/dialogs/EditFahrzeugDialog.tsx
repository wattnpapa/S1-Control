import type { EditFahrzeugForm, KraftOverviewItem } from '@renderer/types/ui';
import { FahrzeugFormFields } from '@renderer/components/dialogs/FahrzeugFormFields';

interface EditFahrzeugDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditFahrzeugForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: EditFahrzeugForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Handles Edit Fahrzeug Dialog.
 */
export function EditFahrzeugDialog(props: EditFahrzeugDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Fahrzeug bearbeiten</h3>
        <FahrzeugFormFields form={props.form} allKraefte={props.allKraefte} onChange={props.onChange} />
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
