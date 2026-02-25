interface SettingsViewProps {
  busy: boolean;
  dbPath: string;
  onChangeDbPath: (value: string) => void;
  onSaveDbPath: () => void;
}

export function SettingsView(props: SettingsViewProps): JSX.Element {
  return (
    <div className="export-panel">
      <h2>Einstellungen</h2>
      <label>
        DB-Pfad
        <input value={props.dbPath} onChange={(e) => props.onChangeDbPath(e.target.value)} />
      </label>
      <button onClick={props.onSaveDbPath} disabled={props.busy}>
        DB-Pfad speichern
      </button>
      <p>
        Hinweis: Bei Änderung wird die Datenbank neu verbunden. Bei Fehlern erfolgt Fallback auf lokale sichere
        Pfade.
      </p>
    </div>
  );
}
