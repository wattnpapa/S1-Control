import type { UpdaterState } from '@shared/types';

interface UpdaterNoticesProps {
  updaterState: UpdaterState;
  busy: boolean;
  onDownloadUpdate: () => void;
  onOpenReleasePage: () => void;
}

interface UpdaterOverlayProps {
  updaterState: UpdaterState;
}

/**
 * Handles Format Bytes To Mb.
 */
function formatBytesToMb(bytes?: number): string {
  if (!bytes || bytes < 0) {
    return '-';
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Handles Format Speed Mb.
 */
function formatSpeedMb(bytesPerSecond?: number): string {
  if (!bytesPerSecond || bytesPerSecond <= 0) {
    return '-';
  }
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Handles Format Eta Seconds.
 */
function formatEtaSeconds(seconds?: number): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
    return '-';
  }
  const rounded = Math.max(1, Math.round(seconds));
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  if (mins > 0) {
    return `${mins}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${secs}s`;
}

/**
 * Handles Updater Notices.
 */
export function UpdaterNotices(props: UpdaterNoticesProps): JSX.Element {
  const { updaterState, busy } = props;
  return (
    <>
      {updaterState.stage === 'available' && (
        <div className="update-banner">
          <span>
            Update verfügbar {updaterState.latestVersion ? `(${updaterState.latestVersion})` : ''}. Quelle:{' '}
            {updaterState.source === 'electron-updater' ? 'In-App' : 'GitHub Release'}.
            {updaterState.downloadSource === 'peer-lan' && updaterState.peerHost
              ? ` LAN-Peer: ${updaterState.peerHost}.`
              : ''}
            {updaterState.downloadSource === 'internet' ? ' Fallback: Internet.' : ''}
            {updaterState.message ? ` ${updaterState.message}` : ''}
          </span>
          <div className="update-actions">
            {updaterState.inAppDownloadSupported && (
              <button onClick={props.onDownloadUpdate} disabled={busy}>
                Update herunterladen
              </button>
            )}
            <button onClick={props.onOpenReleasePage} disabled={busy}>
              Release-Seite öffnen
            </button>
          </div>
        </div>
      )}
      {updaterState.stage === 'error' && <div className="error-banner">Update-Fehler: {updaterState.message}</div>}
      {updaterState.stage === 'unsupported' && (
        <div className="update-banner">
          <span>{updaterState.message}</span>
          <button onClick={props.onOpenReleasePage} disabled={busy}>
            Release-Seite öffnen
          </button>
        </div>
      )}
    </>
  );
}

/**
 * Handles Updater Overlay.
 */
export function UpdaterOverlay(props: UpdaterOverlayProps): JSX.Element | null {
  const { updaterState } = props;
  if (updaterState.stage === 'downloading') {
    const etaSeconds =
      updaterState.progressTransferredBytes !== undefined &&
      updaterState.progressTotalBytes !== undefined &&
      updaterState.progressBytesPerSecond
        ? (updaterState.progressTotalBytes - updaterState.progressTransferredBytes) /
          updaterState.progressBytesPerSecond
        : undefined;

    return (
      <div className="overlay-backdrop">
        <div className="overlay-panel">
          <h3>Update wird heruntergeladen</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, updaterState.progressPercent ?? 0))}%` }} />
          </div>
          <p>{Math.round(updaterState.progressPercent ?? 0)}%</p>
          <p>
            {formatBytesToMb(updaterState.progressTransferredBytes)} / {formatBytesToMb(updaterState.progressTotalBytes)}
          </p>
          <p>Geschwindigkeit: {formatSpeedMb(updaterState.progressBytesPerSecond)}</p>
          <p>Restzeit: {formatEtaSeconds(etaSeconds)}</p>
        </div>
      </div>
    );
  }

  if (updaterState.stage === 'downloaded') {
    return (
      <div className="overlay-backdrop">
        <div className="overlay-panel">
          <h3>Update wird durchgeführt</h3>
          <div className="update-install-spinner" aria-label="Update wird durchgeführt" />
          <p>Die Anwendung wird jetzt automatisch neu gestartet.</p>
        </div>
      </div>
    );
  }

  return null;
}
