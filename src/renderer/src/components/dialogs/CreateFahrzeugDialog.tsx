import type { CreateFahrzeugForm, KraftOverviewItem } from '@renderer/types/ui';
import { FahrzeugFormFields } from '@renderer/components/dialogs/FahrzeugFormFields';

interface CreateFahrzeugDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: CreateFahrzeugForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: CreateFahrzeugForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Handles Create Fahrzeug Dialog.
 */
export function CreateFahrzeugDialog(props: CreateFahrzeugDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Fahrzeug anlegen</h3>
        <FahrzeugFormFields
          form={props.form}
          allKraefte={props.allKraefte}
          onChange={props.onChange}
          showPlaceholder
        />
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
