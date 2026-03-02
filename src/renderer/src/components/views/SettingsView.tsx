import type { ActiveClientInfo, PeerUpdateStatus } from '@shared/types';

interface SettingsViewProps {
  busy: boolean;
  dbPath: string;
  selectedEinsatzId: string;
  lanPeerUpdatesEnabled: boolean;
  activeClients: ActiveClientInfo[];
  peerUpdateStatus: PeerUpdateStatus | null;
  debugSyncLogs: string[];
  onChangeDbPath: (value: string) => void;
  onSaveDbPath: () => void;
  onRestoreBackup: () => void;
  onToggleLanPeerUpdates: (enabled: boolean) => void;
}

/**
 * Handles Settings View.
 */
export function SettingsView(props: SettingsViewProps): JSX.Element {
  return (
    <div className="export-panel settings-panel">
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
      <label className="settings-toggle">
        LAN-Peer-Updates
        <input
          type="checkbox"
          checked={props.lanPeerUpdatesEnabled}
          onChange={(event) => props.onToggleLanPeerUpdates(event.target.checked)}
          disabled={props.busy}
        />
      </label>
      <p>
        Für jeden Einsatz wird eine eigene SQLite-Datei mit der Endung <code>.s1control</code> erstellt. Backups
        liegen alle 5 Minuten im Unterordner <code>backup</code> neben der Einsatzdatei.
      </p>

      <h3>Aktive Clients</h3>
      {props.selectedEinsatzId ? (
        <table>
          <thead>
            <tr>
              <th>Rolle</th>
              <th>Computer</th>
              <th>IP-Adresse</th>
              <th>DB-Pfad</th>
              <th>Zuletzt gesehen</th>
            </tr>
          </thead>
          <tbody>
            {props.activeClients.map((client) => (
              <tr key={client.clientId}>
                <td>{client.isMaster ? 'MASTER' : 'STANDBY'}{client.isSelf ? ' (dieser Client)' : ''}</td>
                <td>{client.computerName}</td>
                <td>{client.ipAddress}</td>
                <td>{client.dbPath || '-'}</td>
                <td>{new Date(client.lastSeen).toLocaleTimeString('de-DE')}</td>
              </tr>
            ))}
            {props.activeClients.length === 0 && (
              <tr>
                <td colSpan={5}>Keine aktiven Clients gefunden.</td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <p>Client-Übersicht ist verfügbar, sobald ein Einsatz geöffnet ist.</p>
      )}

      <h3>Peer Update Status</h3>
      <table>
        <tbody>
          <tr>
            <th>Feature</th>
            <td>{props.peerUpdateStatus?.enabled ? 'Aktiv' : 'Inaktiv (S1_UPDATER_LAN_PEER=1 setzen)'}</td>
          </tr>
          <tr>
            <th>Seeder</th>
            <td>{props.peerUpdateStatus?.seederActive ? 'Ja' : 'Nein'}</td>
          </tr>
          <tr>
            <th>Discovery Port</th>
            <td>{props.peerUpdateStatus?.discoveryPort ?? '-'}</td>
          </tr>
          <tr>
            <th>HTTP Port</th>
            <td>{props.peerUpdateStatus?.httpPort ?? '-'}</td>
          </tr>
          <tr>
            <th>Angebotene Artefakte</th>
            <td>{props.peerUpdateStatus?.offeredArtifacts.length ?? 0}</td>
          </tr>
          <tr>
            <th>Letzter Transfer</th>
            <td>
              {props.peerUpdateStatus?.lastTransfer
                ? `${props.peerUpdateStatus.lastTransfer.direction.toUpperCase()} ${props.peerUpdateStatus.lastTransfer.artifactName} (${Math.round(props.peerUpdateStatus.lastTransfer.bytes / (1024 * 1024))} MB)`
                : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Debug Sync Logs</h3>
      <div className="debug-log-panel">
        <pre>{props.debugSyncLogs.length ? props.debugSyncLogs.join('\n') : 'Noch keine Debug-Ausgaben.'}</pre>
      </div>
    </div>
  );
}
