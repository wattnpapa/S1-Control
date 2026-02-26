import { ORGANISATION_OPTIONS } from '@renderer/constants/organisation';
import { useEffect, useState } from 'react';
import type { EditEinheitForm, EditFahrzeugForm, KraftOverviewItem } from '@renderer/types/ui';
import type { EinheitHelfer, OrganisationKey } from '@shared/types';

interface InlineEinheitEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditEinheitForm;
  onChange: (next: EditEinheitForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  helfer: EinheitHelfer[];
  onCreateHelfer: (input: {
    name: string;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onUpdateHelfer: (input: {
    helferId: string;
    name: string;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onDeleteHelfer: (helferId: string) => Promise<void>;
}

export function InlineEinheitEditor(props: InlineEinheitEditorProps): JSX.Element | null {
  const [newHelfer, setNewHelfer] = useState({
    name: '',
    funktion: '',
    telefon: '',
    erreichbarkeit: '',
    vegetarisch: false,
    bemerkung: '',
  });
  const [editRows, setEditRows] = useState<Record<string, typeof newHelfer>>({});

  useEffect(() => {
    const next: Record<string, typeof newHelfer> = {};
    for (const row of props.helfer) {
      next[row.id] = {
        name: row.name,
        funktion: row.funktion ?? '',
        telefon: row.telefon ?? '',
        erreichbarkeit: row.erreichbarkeit ?? '',
        vegetarisch: row.vegetarisch,
        bemerkung: row.bemerkung ?? '',
      };
    }
    setEditRows(next);
  }, [props.helfer]);

  if (!props.visible) {
    return null;
  }

  return (
    <section className="inline-editor">
      <header className="inline-editor-header">
        <h3>Einheit bearbeiten</h3>
        <div className="inline-editor-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Speichern
          </button>
          <button onClick={props.onCancel} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </header>
      <table className="inline-form-table">
        <tbody>
          <tr>
            <th>Name im Einsatz</th>
            <td colSpan={3}>
              <input
                value={props.form.nameImEinsatz}
                onChange={(e) => props.onChange({ ...props.form, nameImEinsatz: e.target.value })}
              />
            </td>
          </tr>
          <tr>
            <th>Organisation</th>
            <td>
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
            </td>
            <th>Status</th>
            <td>
              <select
                value={props.form.status}
                onChange={(e) => props.onChange({ ...props.form, status: e.target.value as EditEinheitForm['status'] })}
              >
                <option value="AKTIV">AKTIV</option>
                <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                <option value="ABGEMELDET">ABGEMELDET</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Führung</th>
            <td>
              <input type="number" min={0} value={props.form.fuehrung} onChange={(e) => props.onChange({ ...props.form, fuehrung: e.target.value })} />
            </td>
            <th>Unterführung</th>
            <td>
              <input
                type="number"
                min={0}
                value={props.form.unterfuehrung}
                onChange={(e) => props.onChange({ ...props.form, unterfuehrung: e.target.value })}
              />
            </td>
          </tr>
          <tr>
            <th>Mannschaft</th>
            <td>
              <input type="number" min={0} value={props.form.mannschaft} onChange={(e) => props.onChange({ ...props.form, mannschaft: e.target.value })} />
            </td>
            <th>Vegetarier</th>
            <td>
              <label className="inline-checkbox">
                <input
                  type="checkbox"
                  checked={props.form.vegetarierVorhanden}
                  onChange={(e) => props.onChange({ ...props.form, vegetarierVorhanden: e.target.checked })}
                />
                vorhanden
              </label>
            </td>
          </tr>
          <tr>
            <th>GrFü</th>
            <td><input value={props.form.grFuehrerName} onChange={(e) => props.onChange({ ...props.form, grFuehrerName: e.target.value })} /></td>
            <th>OV</th>
            <td><input value={props.form.ovName} onChange={(e) => props.onChange({ ...props.form, ovName: e.target.value })} /></td>
          </tr>
          <tr>
            <th>OV Telefon</th>
            <td><input value={props.form.ovTelefon} onChange={(e) => props.onChange({ ...props.form, ovTelefon: e.target.value })} /></td>
            <th>OV Fax</th>
            <td><input value={props.form.ovFax} onChange={(e) => props.onChange({ ...props.form, ovFax: e.target.value })} /></td>
          </tr>
          <tr>
            <th>RB</th>
            <td><input value={props.form.rbName} onChange={(e) => props.onChange({ ...props.form, rbName: e.target.value })} /></td>
            <th>RB Telefon</th>
            <td><input value={props.form.rbTelefon} onChange={(e) => props.onChange({ ...props.form, rbTelefon: e.target.value })} /></td>
          </tr>
          <tr>
            <th>RB Fax</th>
            <td><input value={props.form.rbFax} onChange={(e) => props.onChange({ ...props.form, rbFax: e.target.value })} /></td>
            <th>LV</th>
            <td><input value={props.form.lvName} onChange={(e) => props.onChange({ ...props.form, lvName: e.target.value })} /></td>
          </tr>
          <tr>
            <th>LV Telefon</th>
            <td><input value={props.form.lvTelefon} onChange={(e) => props.onChange({ ...props.form, lvTelefon: e.target.value })} /></td>
            <th>LV Fax</th>
            <td><input value={props.form.lvFax} onChange={(e) => props.onChange({ ...props.form, lvFax: e.target.value })} /></td>
          </tr>
          <tr>
            <th>Erreichbarkeiten</th>
            <td colSpan={3}>
              <textarea rows={2} value={props.form.erreichbarkeiten} onChange={(e) => props.onChange({ ...props.form, erreichbarkeiten: e.target.value })} />
            </td>
          </tr>
          <tr>
            <th>Bemerkung</th>
            <td colSpan={3}>
              <textarea rows={2} value={props.form.bemerkung} onChange={(e) => props.onChange({ ...props.form, bemerkung: e.target.value })} />
            </td>
          </tr>
          <tr>
            <th colSpan={4}>Helfer</th>
          </tr>
          <tr>
            <td colSpan={4}>
              <table className="inline-subtable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Funktion</th>
                    <th>Telefon</th>
                    <th>Erreichbarkeit</th>
                    <th>Vegetarisch</th>
                    <th>Bemerkung</th>
                    <th>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {props.helfer.map((row) => {
                    const edit = editRows[row.id];
                    if (!edit) {
                      return null;
                    }
                    return (
                      <tr key={row.id}>
                        <td><input value={edit.name} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, name: e.target.value } }))} /></td>
                        <td><input value={edit.funktion} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, funktion: e.target.value } }))} /></td>
                        <td><input value={edit.telefon} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, telefon: e.target.value } }))} /></td>
                        <td><input value={edit.erreichbarkeit} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, erreichbarkeit: e.target.value } }))} /></td>
                        <td>
                          <input
                            type="checkbox"
                            checked={edit.vegetarisch}
                            onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, vegetarisch: e.target.checked } }))}
                          />
                        </td>
                        <td><input value={edit.bemerkung} onChange={(e) => setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, bemerkung: e.target.value } }))} /></td>
                        <td className="inline-subtable-actions">
                          <button
                            onClick={() =>
                              void props.onUpdateHelfer({
                                helferId: row.id,
                                ...edit,
                              })
                            }
                            disabled={props.busy || props.isArchived}
                          >
                            Speichern
                          </button>
                          <button onClick={() => void props.onDeleteHelfer(row.id)} disabled={props.busy || props.isArchived}>
                            Löschen
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td><input value={newHelfer.name} onChange={(e) => setNewHelfer((prev) => ({ ...prev, name: e.target.value }))} placeholder="Neuer Helfer" /></td>
                    <td><input value={newHelfer.funktion} onChange={(e) => setNewHelfer((prev) => ({ ...prev, funktion: e.target.value }))} /></td>
                    <td><input value={newHelfer.telefon} onChange={(e) => setNewHelfer((prev) => ({ ...prev, telefon: e.target.value }))} /></td>
                    <td><input value={newHelfer.erreichbarkeit} onChange={(e) => setNewHelfer((prev) => ({ ...prev, erreichbarkeit: e.target.value }))} /></td>
                    <td>
                      <input type="checkbox" checked={newHelfer.vegetarisch} onChange={(e) => setNewHelfer((prev) => ({ ...prev, vegetarisch: e.target.checked }))} />
                    </td>
                    <td><input value={newHelfer.bemerkung} onChange={(e) => setNewHelfer((prev) => ({ ...prev, bemerkung: e.target.value }))} /></td>
                    <td className="inline-subtable-actions">
                      <button
                        onClick={async () => {
                          await props.onCreateHelfer(newHelfer);
                          setNewHelfer({
                            name: '',
                            funktion: '',
                            telefon: '',
                            erreichbarkeit: '',
                            vegetarisch: false,
                            bemerkung: '',
                          });
                        }}
                        disabled={props.busy || props.isArchived}
                      >
                        Hinzufügen
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

interface InlineFahrzeugEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditFahrzeugForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: EditFahrzeugForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function InlineFahrzeugEditor(props: InlineFahrzeugEditorProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <section className="inline-editor">
      <header className="inline-editor-header">
        <h3>Fahrzeug bearbeiten</h3>
        <div className="inline-editor-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Speichern
          </button>
          <button onClick={props.onCancel} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </header>
      <table className="inline-form-table">
        <tbody>
          <tr>
            <th>Fahrzeugname</th>
            <td><input value={props.form.name} onChange={(e) => props.onChange({ ...props.form, name: e.target.value })} /></td>
            <th>Kennzeichen</th>
            <td><input value={props.form.kennzeichen} onChange={(e) => props.onChange({ ...props.form, kennzeichen: e.target.value })} /></td>
          </tr>
          <tr>
            <th>Zugeordnete Einheit</th>
            <td>
              <select value={props.form.einheitId} onChange={(e) => props.onChange({ ...props.form, einheitId: e.target.value })}>
                <option value="">Bitte wählen</option>
                {props.allKraefte.map((einheit) => (
                  <option key={einheit.id} value={einheit.id}>
                    {einheit.nameImEinsatz} ({einheit.abschnittName})
                  </option>
                ))}
              </select>
            </td>
            <th>Status</th>
            <td>
              <select
                value={props.form.status}
                onChange={(e) => props.onChange({ ...props.form, status: e.target.value as EditFahrzeugForm['status'] })}
              >
                <option value="AKTIV">AKTIV</option>
                <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                <option value="AUSSER_BETRIEB">AUSSER_BETRIEB</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>FuRn</th>
            <td><input value={props.form.funkrufname} onChange={(e) => props.onChange({ ...props.form, funkrufname: e.target.value })} /></td>
            <th>STAN-konform</th>
            <td>
              <select
                value={props.form.stanKonform}
                onChange={(e) => props.onChange({ ...props.form, stanKonform: e.target.value as EditFahrzeugForm['stanKonform'] })}
              >
                <option value="UNBEKANNT">unbekannt</option>
                <option value="JA">ja</option>
                <option value="NEIN">nein</option>
              </select>
            </td>
          </tr>
          <tr>
            <th>Nutzlast</th>
            <td><input value={props.form.nutzlast} onChange={(e) => props.onChange({ ...props.form, nutzlast: e.target.value })} /></td>
            <th />
            <td />
          </tr>
          <tr>
            <th>Sondergerät / Änderungen</th>
            <td colSpan={3}>
              <textarea rows={3} value={props.form.sondergeraet} onChange={(e) => props.onChange({ ...props.form, sondergeraet: e.target.value })} />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
