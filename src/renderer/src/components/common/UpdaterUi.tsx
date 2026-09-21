import { useEffect, useMemo, useState } from 'react';
import type { UpdaterState } from '@shared/types';
import { useConfirm } from '@renderer/app/confirm-context';
import type { JSX } from 'react';

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
 * Builds human readable update source suffix.
 */
function formatUpdateSourceSuffix(updaterState: UpdaterState): string {
  const sourceLabel = updaterState.source === 'electron-updater' ? 'In-App' : 'GitHub Release';
  const peerLabel =
    updaterState.downloadSource === 'peer-lan' && updaterState.peerHost ? ` LAN-Peer: ${updaterState.peerHost}.` : '';
  const fallbackLabel = updaterState.downloadSource === 'internet' ? ' Fallback: Internet.' : '';
  const messageLabel = updaterState.message ? ` ${updaterState.message}` : '';
  return `Quelle: ${sourceLabel}.${peerLabel}${fallbackLabel}${messageLabel}`;
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
 * Hinweis auf ein fertig geladenes Update. Der Neustart wird bestätigt,
 * damit die App sich nicht mitten im Einsatz selbst beendet.
 */
function UpdateDownloadedNotice(props: {
  version: string;
  busy: boolean;
  onDismiss: () => void;
}): JSX.Element {
  const confirm = useConfirm();
  const einbauen = async (): Promise<void> => {
    const ok = await confirm({
      titel: 'Update jetzt einbauen?',
      text: `Version ${props.version} ist geladen. Zum Einbauen wird S1-Control beendet und neu gestartet.`,
      folgen: [
        'Nicht gespeicherte Eingaben in offenen Formularen gehen verloren.',
        'Die Einsatzführung an diesem Platz pausiert, bis der Neustart durch ist.',
      ],
      bestaetigenText: 'Neu starten und einbauen',
      abbrechenText: 'Später',
      gefahr: true,
    });
    if (ok) {
      await window.api.installDownloadedUpdate();
    }
  };

  return (
    <div className="update-banner notice-with-close">
      <span>Version {props.version} ist geladen und kann eingebaut werden.</span>
      <div className="update-actions">
        <button onClick={() => void einbauen()} disabled={props.busy}>
          Neu starten und einbauen
        </button>
        <button className="notice-close-button" onClick={props.onDismiss} aria-label="Update-Meldung schließen">
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Handles Updater Notices.
 */
export function UpdaterNotices(props: UpdaterNoticesProps): JSX.Element {
  const { updaterState } = props;
  const noticeKey = useMemo(
    () =>
      [
        updaterState.stage,
        updaterState.latestVersion ?? '',
        updaterState.message ?? '',
        updaterState.source ?? '',
        updaterState.downloadSource ?? '',
      ].join('|'),
    [updaterState],
  );
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const dismissCurrentNotice = () => {
    setDismissedKey(noticeKey);
  };
  useEffect(() => {
    if (dismissedKey && dismissedKey !== noticeKey) {
      setDismissedKey(null);
    }
  }, [dismissedKey, noticeKey]);
  if (dismissedKey === noticeKey) {
    return <></>;
  }

  return (
    <UpdaterNoticeBody
      {...props}
      onDismiss={dismissCurrentNotice}
    />
  );
}

/**
 * Einzeiliger Hinweis mit Schließen-Schaltfläche.
 */
function SchlichteMeldung(props: { text: string; onDismiss: () => void }): JSX.Element {
  return (
    <div className="update-banner notice-with-close">
      <span>{props.text}</span>
      <button className="notice-close-button" onClick={props.onDismiss} aria-label="Update-Meldung schließen">
        ×
      </button>
    </div>
  );
}

/**
 * Hinweis, der auf die Release-Seite verweist.
 */
function ReleaseSeitenMeldung(props: {
  text: string;
  busy: boolean;
  onOpenReleasePage: () => void;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <div className="update-banner notice-with-close">
      <span>{props.text}</span>
      <div className="update-actions">
        <button onClick={props.onOpenReleasePage} disabled={props.busy}>
          Release-Seite öffnen
        </button>
        <button className="notice-close-button" onClick={props.onDismiss} aria-label="Update-Meldung schließen">
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Wählt die Meldung zum aktuellen Update-Zustand aus.
 */
function UpdaterNoticeBody(props: UpdaterNoticesProps & { onDismiss: () => void }): JSX.Element {
  const { updaterState, busy } = props;
  const dismissCurrentNotice = props.onDismiss;
  if (updaterState.stage === 'error') {
    return (
      <div className="error-banner notice-with-close">
        <span>Update-Fehler: {updaterState.message}</span>
        <button className="notice-close-button" onClick={dismissCurrentNotice} aria-label="Update-Meldung schließen">
          ×
        </button>
      </div>
    );
  }
  if (updaterState.stage === 'unsupported') {
    return (
      <ReleaseSeitenMeldung
        text={updaterState.message ?? ''}
        busy={busy}
        onOpenReleasePage={props.onOpenReleasePage}
        onDismiss={dismissCurrentNotice}
      />
    );
  }
  if (updaterState.stage === 'checking') {
    return <SchlichteMeldung text="Prüfe auf Updates..." onDismiss={dismissCurrentNotice} />;
  }

  if (updaterState.stage === 'not-available') {
    const serverVersionText = updaterState.latestVersion ?? 'nicht ermittelbar';
    return (
      <SchlichteMeldung
        text={`Server-Version: ${serverVersionText}. Ihre Version ist aktuell.`}
        onDismiss={dismissCurrentNotice}
      />
    );
  }

  if (updaterState.stage === 'downloaded') {
    return (
      <UpdateDownloadedNotice
        version={updaterState.latestVersion ?? 'unbekannt'}
        busy={busy}
        onDismiss={dismissCurrentNotice}
      />
    );
  }

  if (updaterState.stage !== 'available') {
    return <></>;
  }

  return (
    <UpdateVerfuegbarMeldung
      updaterState={updaterState}
      busy={busy}
      onDownloadUpdate={props.onDownloadUpdate}
      onOpenReleasePage={props.onOpenReleasePage}
      onDismiss={dismissCurrentNotice}
    />
  );
}

/**
 * Meldung über ein verfügbares Update samt Ladeschaltfläche.
 */
function UpdateVerfuegbarMeldung(props: {
  updaterState: UpdaterState;
  busy: boolean;
  onDownloadUpdate: () => void;
  onOpenReleasePage: () => void;
  onDismiss: () => void;
}): JSX.Element {
  const { updaterState, busy } = props;
  const versionLabel = updaterState.latestVersion ?? 'unbekannt';
  const handleUpdateClick = updaterState.inAppDownloadSupported
    ? props.onDownloadUpdate
    : props.onOpenReleasePage;
  return (
    <div className="update-banner notice-with-close">
      <span>
        Server-Version: {versionLabel}. Update verfügbar. {formatUpdateSourceSuffix(updaterState)}
      </span>
      <div className="update-actions">
        <button onClick={handleUpdateClick} disabled={busy}>
          Updaten
        </button>
        <button onClick={props.onOpenReleasePage} disabled={busy}>
          Release-Seite öffnen
        </button>
        <button className="notice-close-button" onClick={props.onDismiss} aria-label="Update-Meldung schließen">
          ×
        </button>
      </div>
    </div>
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
