import type { InlineFahrzeugEditorProps } from './types';

/**
 * Renders form body for inline vehicle editing.
 */
function InlineFahrzeugEditorBody(props: InlineFahrzeugEditorProps): JSX.Element {
  return (
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
              onChange={(e) => props.onChange({ ...props.form, status: e.target.value as InlineFahrzeugEditorProps['form']['status'] })}
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
              onChange={(e) => props.onChange({ ...props.form, stanKonform: e.target.value as InlineFahrzeugEditorProps['form']['stanKonform'] })}
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
  );
}

/**
 * Renders inline edit form for vehicle records.
 */
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
      <InlineFahrzeugEditorBody {...props} />
    </section>
  );
}
