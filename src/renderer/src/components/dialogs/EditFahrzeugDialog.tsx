import type { EditFahrzeugForm, KraftOverviewItem } from '@renderer/types/ui';

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

export function EditFahrzeugDialog(props: EditFahrzeugDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Fahrzeug bearbeiten</h3>
        <label>
          Fahrzeugname
          <input
            value={props.form.name}
            onChange={(e) => props.onChange({ ...props.form, name: e.target.value })}
          />
        </label>
        <label>
          Kennzeichen
          <input
            value={props.form.kennzeichen}
            onChange={(e) => props.onChange({ ...props.form, kennzeichen: e.target.value })}
          />
        </label>
        <label>
          Status
          <select
            value={props.form.status}
            onChange={(e) =>
              props.onChange({ ...props.form, status: e.target.value as EditFahrzeugForm['status'] })
            }
          >
            <option value="AKTIV">AKTIV</option>
            <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
            <option value="AUSSER_BETRIEB">AUSSER_BETRIEB</option>
          </select>
        </label>
        <label>
          Zugeordnete Einheit
          <select
            value={props.form.einheitId}
            onChange={(e) => props.onChange({ ...props.form, einheitId: e.target.value })}
            disabled={props.allKraefte.length === 0}
          >
            <option value="">Bitte wählen</option>
            {props.allKraefte.map((einheit) => (
              <option key={einheit.id} value={einheit.id}>
                {einheit.nameImEinsatz} ({einheit.abschnittName})
              </option>
            ))}
          </select>
        </label>
        <h4>Erfassungsbogen (optional)</h4>
        <label>
          FuRn
          <input
            value={props.form.funkrufname}
            onChange={(e) => props.onChange({ ...props.form, funkrufname: e.target.value })}
          />
        </label>
        <label>
          Ausstattung nach STAN
          <select
            value={props.form.stanKonform}
            onChange={(e) => props.onChange({ ...props.form, stanKonform: e.target.value as EditFahrzeugForm['stanKonform'] })}
          >
            <option value="UNBEKANNT">unbekannt</option>
            <option value="JA">ja</option>
            <option value="NEIN">nein</option>
          </select>
        </label>
        <label>
          Sondergerät / Änderungen
          <textarea
            rows={2}
            value={props.form.sondergeraet}
            onChange={(e) => props.onChange({ ...props.form, sondergeraet: e.target.value })}
          />
        </label>
        <label>
          Nutzlast
          <input
            value={props.form.nutzlast}
            onChange={(e) => props.onChange({ ...props.form, nutzlast: e.target.value })}
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
