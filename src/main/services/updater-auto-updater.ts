import { autoUpdater } from 'electron-updater';

interface RegisterAutoUpdaterEventsParams {
  onCheckingForUpdate: () => void;
  onUpdateAvailable: (info: { version: string; files?: Array<{ url?: string; sha512?: string; size?: number }> }) => void;
  onUpdateNotAvailable: () => void;
  onError: (message: string) => void;
  onDownloadProgress: (progress: {
    percent: number;
    transferred?: number;
    total?: number;
    bytesPerSecond?: number;
  }) => void;
  onUpdateDownloaded: (version: string, info: { downloadedFile?: string }) => void;
}

/**
 * Checks if the runtime exposes electron-updater API.
 */
export function hasAutoUpdaterApi(): boolean {
  return typeof (autoUpdater as unknown as { checkForUpdates?: unknown }).checkForUpdates === 'function';
}

/**
 * Configures stable update channel and generic feed fallback.
 */
export function configureAutoUpdaterFeed(genericFeedUrl: string): void {
  const updaterWithChannel = autoUpdater as unknown as {
    channel?: string;
    allowPrerelease?: boolean;
  };
  updaterWithChannel.channel = 'latest';
  updaterWithChannel.allowPrerelease = false;

  const maybeSetFeedUrl = (autoUpdater as unknown as {
    setFeedURL?: (options: { provider: 'generic'; url: string }) => void;
  }).setFeedURL;
  if (typeof maybeSetFeedUrl !== 'function') {
    return;
  }
  try {
    maybeSetFeedUrl({ provider: 'generic', url: genericFeedUrl });
  } catch {
    // Ignore and continue with app-update.yml based configuration.
  }
}

/**
 * Registers all relevant electron-updater event handlers.
 */
export function registerAutoUpdaterEvents(params: RegisterAutoUpdaterEventsParams): void {
  autoUpdater.on('checking-for-update', () => params.onCheckingForUpdate());
  autoUpdater.on('update-available', (info) =>
    params.onUpdateAvailable(info as { version: string; files?: Array<{ url?: string; sha512?: string; size?: number }> }),
  );
  autoUpdater.on('update-not-available', () => params.onUpdateNotAvailable());
  autoUpdater.on('error', (error) => params.onError(error.message || 'Update-Fehler'));
  autoUpdater.on('download-progress', (progress) =>
    params.onDownloadProgress({
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    }),
  );
  autoUpdater.on('update-downloaded', (info) => params.onUpdateDownloaded(info.version, info as { downloadedFile?: string }));
}
