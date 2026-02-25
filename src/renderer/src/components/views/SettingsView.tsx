interface SettingsViewProps {
  busy: boolean;
  dbPath: string;
  selectedEinsatzId: string;
  onChangeDbPath: (value: string) => void;
  onSaveDbPath: () => void;
  onRestoreBackup: () => void;
}

export function SettingsView(props: SettingsViewProps): JSX.Element {
  return (
    <div className="export-panel">
      <h2>Einstellungen</h2>
      <label>
        Einsatz-Verzeichnis
        <input value={props.dbPath} onChange={(e) => props.onChangeDbPath(e.target.value)} />
      </label>
      <button onClick={props.onSaveDbPath} disabled={props.busy}>
        Verzeichnis speichern
      </button>
      <button onClick={props.onRestoreBackup} disabled={props.busy || !props.selectedEinsatzId}>
        Backup laden
      </button>
      <p>
        Für jeden Einsatz wird eine eigene SQLite-Datei erstellt. Backups liegen alle 5 Minuten im Unterordner
        <code>backup</code> neben der Einsatzdatei.
      </p>
    </div>
  );
}
