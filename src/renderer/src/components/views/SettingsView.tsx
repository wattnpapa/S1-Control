import type { ActiveClientInfo, PeerUpdateStatus } from '@shared/types';

interface SettingsViewProps {
  busy: boolean;
  dbPath: string;
  selectedEinsatzId: string;
  lanPeerUpdatesEnabled: boolean;
  activeClients: ActiveClientInfo[];
  peerUpdateStatus: PeerUpdateStatus | null;
  debugSyncLogs: string[];
  udpDebugLogs: string[];
  onChangeDbPath: (value: string) => void;
  onSaveDbPath: () => void;
  onRestoreBackup: () => void;
  onCheckForUpdates: () => void;
  onToggleLanPeerUpdates: (enabled: boolean) => void;
}

/**
 * Renders active client table body.
 */
function ActiveClientsTable({ activeClients }: Pick<SettingsViewProps, 'activeClients'>): JSX.Element {
  return (
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
        {activeClients.map((client) => (
          <tr key={client.clientId}>
            <td>{client.isMaster ? 'MASTER' : 'STANDBY'}{client.isSelf ? ' (dieser Client)' : ''}</td>
            <td>{client.computerName}</td>
            <td>{client.ipAddress}</td>
            <td>{client.dbPath || '-'}</td>
            <td>{new Date(client.lastSeen).toLocaleTimeString('de-DE')}</td>
          </tr>
        ))}
        {activeClients.length === 0 && (
          <tr>
            <td colSpan={5}>Keine aktiven Clients gefunden.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/**
 * Renders current peer update status.
 */
function PeerUpdateStatusTable({ peerUpdateStatus }: Pick<SettingsViewProps, 'peerUpdateStatus'>): JSX.Element {
  const normalized = normalizePeerStatus(peerUpdateStatus);
  return (
    <table>
      <tbody>
        <tr>
          <th>Feature</th>
          <td>{normalized.featureLabel}</td>
        </tr>
        <tr>
          <th>Seeder</th>
          <td>{normalized.seederLabel}</td>
        </tr>
        <tr>
          <th>Discovery Port</th>
          <td>{normalized.discoveryPort}</td>
        </tr>
        <tr>
          <th>HTTP Port</th>
          <td>{normalized.httpPort}</td>
        </tr>
        <tr>
          <th>Angebotene Artefakte</th>
          <td>{normalized.artifactCount}</td>
        </tr>
        <tr>
          <th>Im Netzwerk gesehen</th>
          <td>{normalized.discoveredCount}</td>
        </tr>
        <tr>
          <th>Letzter Netzwerkscan</th>
          <td>{normalized.lastDiscovery}</td>
        </tr>
        <tr>
          <th>Letzter Transfer</th>
          <td>{normalized.lastTransfer}</td>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * Builds normalized, display-friendly peer status values.
 */
function normalizePeerStatus(peerUpdateStatus: PeerUpdateStatus | null): {
  featureLabel: string;
  seederLabel: string;
  discoveryPort: number | string;
  httpPort: number | string;
  artifactCount: number;
  discoveredCount: number;
  lastDiscovery: string;
  lastTransfer: string;
} {
  if (!peerUpdateStatus) {
    return {
      featureLabel: 'Inaktiv (S1_UPDATER_LAN_PEER=1 setzen)',
      seederLabel: 'Nein',
      discoveryPort: '-',
      httpPort: '-',
      artifactCount: 0,
      discoveredCount: 0,
      lastDiscovery: '-',
      lastTransfer: '-',
    };
  }
  return {
    featureLabel: peerUpdateStatus.enabled ? 'Aktiv' : 'Inaktiv (S1_UPDATER_LAN_PEER=1 setzen)',
    seederLabel: peerUpdateStatus.seederActive ? 'Ja' : 'Nein',
    discoveryPort: peerUpdateStatus.discoveryPort ?? '-',
    httpPort: peerUpdateStatus.httpPort ?? '-',
    artifactCount: peerUpdateStatus.offeredArtifacts.length,
    discoveredCount: peerUpdateStatus.discoveredOffers.length,
    lastDiscovery: formatLastDiscovery(peerUpdateStatus),
    lastTransfer: formatLastTransfer(peerUpdateStatus),
  };
}

/**
 * Formats the last discovery timestamp.
 */
function formatLastDiscovery(peerUpdateStatus: PeerUpdateStatus | null): string {
  if (!peerUpdateStatus?.lastDiscoveryAt) {
    return '-';
  }
  return new Date(peerUpdateStatus.lastDiscoveryAt).toLocaleTimeString('de-DE');
}

/**
 * Formats the last peer transfer summary.
 */
function formatLastTransfer(peerUpdateStatus: PeerUpdateStatus | null): string {
  if (!peerUpdateStatus?.lastTransfer) {
    return '-';
  }
  const transfer = peerUpdateStatus.lastTransfer;
  const sizeMb = Math.round(transfer.bytes / (1024 * 1024));
  return `${transfer.direction.toUpperCase()} ${transfer.artifactName} (${sizeMb} MB)`;
}

/**
 * Renders discovered peer artifacts table.
 */
function PeerArtifactsTable({ peerUpdateStatus }: Pick<SettingsViewProps, 'peerUpdateStatus'>): JSX.Element {
  const offers = peerUpdateStatus?.discoveredOffers ?? [];
  return (
    <table>
      <thead>
        <tr>
          <th>Peer</th>
          <th>Host</th>
          <th>Version</th>
          <th>Artefakt</th>
          <th>Größe</th>
          <th>Freshness</th>
          <th>RTT</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((offer) => (
          <tr key={`${offer.peerId}-${offer.artifactName}`}>
            <td>{offer.peerId.slice(0, 8)}</td>
            <td>{offer.host}</td>
            <td>{offer.version}</td>
            <td>{offer.artifactName}</td>
            <td>{Math.round(offer.size / (1024 * 1024))} MB</td>
            <td>{new Date(offer.freshnessTs).toLocaleTimeString('de-DE')}</td>
            <td>{offer.rttMs ? `${offer.rttMs} ms` : '-'}</td>
          </tr>
        ))}
        {offers.length === 0 && (
          <tr>
            <td colSpan={7}>Noch keine Peer-Artefakte im Netzwerk erkannt.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/**
 * Renders debug log section with title.
 */
function DebugSection({ title, logs, emptyText }: { title: string; logs: string[]; emptyText: string }): JSX.Element {
  return (
    <>
      <h3>{title}</h3>
      <div className="debug-log-panel">
        <pre>{logs.length ? logs.join('\n') : emptyText}</pre>
      </div>
    </>
  );
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
      <button onClick={props.onCheckForUpdates} disabled={props.busy}>
        Auf Updates prüfen
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
      {props.selectedEinsatzId
        ? <ActiveClientsTable activeClients={props.activeClients} />
        : <p>Client-Übersicht ist verfügbar, sobald ein Einsatz geöffnet ist.</p>}

      <h3>Peer Update Status</h3>
      <PeerUpdateStatusTable peerUpdateStatus={props.peerUpdateStatus} />

      <h3>Peer Artefakte im Netzwerk</h3>
      <PeerArtifactsTable peerUpdateStatus={props.peerUpdateStatus} />

      <DebugSection title="Debug Sync Logs" logs={props.debugSyncLogs} emptyText="Noch keine Debug-Ausgaben." />
      <DebugSection title="UDP Debug Monitor" logs={props.udpDebugLogs} emptyText="Noch keine UDP-Nachrichten empfangen." />
    </div>
  );
}
