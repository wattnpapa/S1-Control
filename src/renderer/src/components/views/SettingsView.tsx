import type { ActiveClientInfo } from '@shared/types';

interface SettingsViewProps {
  busy: boolean;
  dbPath: string;
  selectedEinsatzId: string;
  activeClients: ActiveClientInfo[];
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

      <h3>Aktive Clients</h3>
      {props.selectedEinsatzId ? (
        <table>
          <thead>
            <tr>
              <th>Rolle</th>
              <th>Computer</th>
              <th>IP-Adresse</th>
              <th>Zuletzt gesehen</th>
            </tr>
          </thead>
          <tbody>
            {props.activeClients.map((client) => (
              <tr key={client.clientId}>
                <td>{client.isMaster ? 'MASTER' : 'STANDBY'}{client.isSelf ? ' (dieser Client)' : ''}</td>
                <td>{client.computerName}</td>
                <td>{client.ipAddress}</td>
                <td>{new Date(client.lastSeen).toLocaleTimeString('de-DE')}</td>
              </tr>
            ))}
            {props.activeClients.length === 0 && (
              <tr>
                <td colSpan={4}>Keine aktiven Clients gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <p>Client-Übersicht ist verfügbar, sobald ein Einsatz geöffnet ist.</p>
      )}
    </div>
  );
}
