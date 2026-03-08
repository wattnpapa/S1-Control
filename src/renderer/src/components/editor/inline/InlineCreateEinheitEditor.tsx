import {
  EinheitContactRows,
  EinheitIdentityRows,
  EinheitNotesRows,
  EinheitStanRows,
  EinheitStrengthRows,
  EinheitTacticalRows,
} from './EinheitFormRows';
import type { InlineCreateEinheitEditorProps } from './types';

/**
 * Renders inline create form for new unit records.
 */
export function InlineCreateEinheitEditor(props: InlineCreateEinheitEditorProps): JSX.Element | null {
  if (!props.visible) {
    return null;
  }

  return (
    <section className="inline-editor">
      <header className="inline-editor-header">
        <h3>Einheit anlegen</h3>
        <div className="inline-editor-actions">
          <button onClick={props.onSubmit} disabled={props.busy || props.isArchived}>
            Anlegen
          </button>
          <button onClick={props.onCancel} disabled={props.busy}>
            Abbrechen
          </button>
        </div>
      </header>
      <table className="inline-form-table">
        <tbody>
          <EinheitIdentityRows form={props.form} onChange={props.onChange} />
          <tr>
            <th>Abschnitt</th>
            <td colSpan={3}>
              <select value={props.form.abschnittId} onChange={(e) => props.onChange({ ...props.form, abschnittId: e.target.value })}>
                <option value="">Bitte wählen</option>
                {props.abschnitte.map((abschnitt) => (
                  <option key={abschnitt.id} value={abschnitt.id}>
                    {abschnitt.name} [{abschnitt.systemTyp}]
                  </option>
                ))}
              </select>
            </td>
          </tr>
          <EinheitStrengthRows form={props.form} onChange={props.onChange} />
          <EinheitTacticalRows form={props.form} onChange={props.onChange} />
          <EinheitStanRows form={props.form} onChange={props.onChange} />
          <EinheitContactRows form={props.form} onChange={props.onChange} />
          <EinheitNotesRows form={props.form} onChange={props.onChange} />
        </tbody>
      </table>
    </section>
  );
}
