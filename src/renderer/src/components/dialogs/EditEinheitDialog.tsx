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
        <h4>Erfassungsbogen (optional)</h4>
        <label>
          GrFü
          <input
            value={props.form.grFuehrerName}
            onChange={(e) => props.onChange({ ...props.form, grFuehrerName: e.target.value })}
          />
        </label>
        <label>
          OV
          <input value={props.form.ovName} onChange={(e) => props.onChange({ ...props.form, ovName: e.target.value })} />
        </label>
        <label>
          OV Telefon
          <input value={props.form.ovTelefon} onChange={(e) => props.onChange({ ...props.form, ovTelefon: e.target.value })} />
        </label>
        <label>
          OV Fax
          <input value={props.form.ovFax} onChange={(e) => props.onChange({ ...props.form, ovFax: e.target.value })} />
        </label>
        <label>
          RB
          <input value={props.form.rbName} onChange={(e) => props.onChange({ ...props.form, rbName: e.target.value })} />
        </label>
        <label>
          RB Telefon
          <input value={props.form.rbTelefon} onChange={(e) => props.onChange({ ...props.form, rbTelefon: e.target.value })} />
        </label>
        <label>
          RB Fax
          <input value={props.form.rbFax} onChange={(e) => props.onChange({ ...props.form, rbFax: e.target.value })} />
        </label>
        <label>
          LV
          <input value={props.form.lvName} onChange={(e) => props.onChange({ ...props.form, lvName: e.target.value })} />
        </label>
        <label>
          LV Telefon
          <input value={props.form.lvTelefon} onChange={(e) => props.onChange({ ...props.form, lvTelefon: e.target.value })} />
        </label>
        <label>
          LV Fax
          <input value={props.form.lvFax} onChange={(e) => props.onChange({ ...props.form, lvFax: e.target.value })} />
        </label>
        <label>
          Bemerkung
          <textarea
            rows={2}
            value={props.form.bemerkung}
            onChange={(e) => props.onChange({ ...props.form, bemerkung: e.target.value })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={props.form.vegetarierVorhanden}
            onChange={(e) => props.onChange({ ...props.form, vegetarierVorhanden: e.target.checked })}
          />
          Vegetarier in der Einheit
        </label>
        <label>
          Erreichbarkeiten
          <textarea
            rows={2}
            value={props.form.erreichbarkeiten}
            onChange={(e) => props.onChange({ ...props.form, erreichbarkeiten: e.target.value })}
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
