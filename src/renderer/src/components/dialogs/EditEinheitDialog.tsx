import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import type { EditEinheitForm } from '@renderer/types/ui';
import type { OrganisationKey } from '@shared/types';

interface EditEinheitDialogProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditEinheitForm;
  onChange: (next: EditEinheitForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function EditEinheitDialog(props: EditEinheitDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Einheit bearbeiten</h3>
        <label>
          Name im Einsatz
          <input
            value={props.form.nameImEinsatz}
            onChange={(e) => props.onChange({ ...props.form, nameImEinsatz: e.target.value })}
          />
        </label>
        <label>
          Organisation
          <select
            value={props.form.organisation}
            onChange={(e) => props.onChange({ ...props.form, organisation: e.target.value as OrganisationKey })}
          >
            {ORGANISATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Führung
          <input
            type="number"
            min={0}
            value={props.form.fuehrung}
            onChange={(e) => props.onChange({ ...props.form, fuehrung: e.target.value })}
          />
        </label>
        <label>
          Unterführung
          <input
            type="number"
            min={0}
            value={props.form.unterfuehrung}
            onChange={(e) => props.onChange({ ...props.form, unterfuehrung: e.target.value })}
          />
        </label>
        <label>
          Mannschaft
          <input
            type="number"
            min={0}
            value={props.form.mannschaft}
            onChange={(e) => props.onChange({ ...props.form, mannschaft: e.target.value })}
          />
        </label>
        <label>
          Status
          <select
            value={props.form.status}
            onChange={(e) => props.onChange({ ...props.form, status: e.target.value as EditEinheitForm['status'] })}
          >
            <option value="AKTIV">AKTIV</option>
            <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
            <option value="ABGEMELDET">ABGEMELDET</option>
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
