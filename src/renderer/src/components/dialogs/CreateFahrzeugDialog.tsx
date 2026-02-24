import type { CreateFahrzeugForm, KraftOverviewItem } from '@renderer/types/ui';

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

export function CreateFahrzeugDialog(props: CreateFahrzeugDialogProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Fahrzeug anlegen</h3>
        <label>
          Fahrzeugname
          <input
            value={props.form.name}
            onChange={(e) => props.onChange({ ...props.form, name: e.target.value })}
            placeholder="z.B. MTW OV Oldenburg"
          />
        </label>
        <label>
          Kennzeichen
          <input
            value={props.form.kennzeichen}
            onChange={(e) => props.onChange({ ...props.form, kennzeichen: e.target.value })}
            placeholder="z.B. THW-1234"
          />
        </label>
        <label>
          Status
          <select
            value={props.form.status}
            onChange={(e) =>
              props.onChange({ ...props.form, status: e.target.value as CreateFahrzeugForm['status'] })
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
            <option value="">Bitte waehlen</option>
            {props.allKraefte.map((einheit) => (
              <option key={einheit.id} value={einheit.id}>
                {einheit.nameImEinsatz} ({einheit.abschnittName})
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
