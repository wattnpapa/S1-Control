import { EinheitCoreFields, SplitSourceField } from '@renderer/components/dialogs/EinheitFormFields';
import type { KraftOverviewItem, SplitEinheitForm } from '@renderer/types/ui';
import type { JSX } from 'react';
import { useDialogTastatur } from '@renderer/app/useDialogTastatur';

interface SplitEinheitDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: SplitEinheitForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: SplitEinheitForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Handles Split Einheit Dialog.
 */
export function SplitEinheitDialog(props: SplitEinheitDialogProps): JSX.Element | null {
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
        <h3>Einheit splitten</h3>
        <SplitSourceField form={props.form} allKraefte={props.allKraefte} onChange={props.onChange} />
        <EinheitCoreFields form={props.form} onChange={props.onChange} />
        <div className="modal-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Splitten
          </button>
          <button onClick={props.onClose} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}
