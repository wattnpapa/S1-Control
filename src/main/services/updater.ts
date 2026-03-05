import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { PeerUpdateStatus, UpdaterState } from '../../shared/types';
import { debugSync } from './debug';
import { UpdatePeerService } from './update-peer';
import { resolveDownloadedArtifactPath, toArtifactMeta, type UpdateArtifactMeta } from './updater-artifact';
import {
  isNoPublishedVersionsError,
  isVersionFormatError,
  toDisplayVersion,
} from './updater-versioning';
import { isOfflineLikeError } from './updater-network-errors';
import { checkGitHubReleaseVersion } from './updater-github-check';
import { tryPeerFirstDownload } from './updater-peer-flow';

const GITHUB_OWNER = process.env.S1_UPDATE_OWNER || 'wattnpapa';
const GITHUB_REPO = process.env.S1_UPDATE_REPO || 'S1-Control';
const GENERIC_FEED_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download`;
const LAN_PEER_ENABLED_DEFAULT = process.env.S1_UPDATER_LAN_PEER === '1';

export class UpdaterService {
  private state: UpdaterState = {
    stage: 'idle',
    currentVersion: app.getVersion(),
    source: 'github-release',
    inAppDownloadSupported: false,
    inAppDownloadReason: 'Noch nicht geprüft.',
  };
  private autoUpdaterEnabled = false;
  private canDownloadInApp = false;
  private autoUpdaterInitError: string | null = null;
  private peerEnabled = LAN_PEER_ENABLED_DEFAULT;
  private peerService: UpdatePeerService | null = null;
  private pendingArtifact: UpdateArtifactMeta | null = null;
  private readonly updateCacheDir: string;

  private readonly notify: (state: UpdaterState) => void;

  /**
   * Creates an instance of this class.
   */
  public constructor(notify: (state: UpdaterState) => void, peerEnabled = LAN_PEER_ENABLED_DEFAULT) {
    this.state.currentVersion = this.resolveDisplayVersion();
    this.notify = notify;
    this.updateCacheDir = path.join(app.getPath('userData'), 'update-cache');
    this.peerEnabled = peerEnabled;
    if (this.peerEnabled) {
      this.peerService = new UpdatePeerService(this.updateCacheDir, true);
      this.peerService.startPeerServices();
      debugSync('peer-service', 'enabled', { cacheDir: this.updateCacheDir });
    }
    this.configureAutoUpdater();
  }

  /**
   * Handles Get State.
   */
  public getState(): UpdaterState {
    return this.state;
  }

  /**
   * Handles Get Peer Update Status.
   */
  public getPeerUpdateStatus(): PeerUpdateStatus {
    return (
      this.peerService?.getStatus() ?? {
        enabled: this.peerEnabled,
        seederActive: false,
        discoveryPort: Number(process.env.S1_UPDATER_PEER_PORT || '41234'),
        httpPort: null,
        offeredArtifacts: [],
        discoveredOffers: [],
        lastDiscoveryAt: null,
        lastTransfer: null,
      }
    );
  }

  /**
   * Handles Set Lan Peer Enabled.
   */
  public setLanPeerEnabled(enabled: boolean): void {
    if (enabled === this.peerEnabled) {
      return;
    }
    this.peerEnabled = enabled;
    if (enabled) {
      if (!this.peerService) {
        this.peerService = new UpdatePeerService(this.updateCacheDir, true);
      }
      this.peerService.startPeerServices();
      debugSync('peer-service', 'enabled', { cacheDir: this.updateCacheDir });
      return;
    }
    this.peerService?.stopPeerServices();
    debugSync('peer-service', 'disabled');
  }

  /**
   * Handles Check For Updates.
   */
  public async checkForUpdates(): Promise<void> {
    this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
    this.canDownloadInApp = false;

    try {
      const fallbackReason = this.resolveGitHubFallbackReason();
      if (fallbackReason) {
        await this.runGitHubFallback(fallbackReason);
        return;
      }

      const result = await autoUpdater.checkForUpdates();
      this.canDownloadInApp = true;
      const latestVersion = result?.updateInfo?.version;
      this.pendingArtifact = toArtifactMeta(
        result?.updateInfo as { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> } | undefined,
      );
      if (latestVersion) {
        this.setState({
          latestVersion: toDisplayVersion(latestVersion),
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'In-App-Download ist verfügbar.',
          peerModeStage: 'idle',
          downloadSource: undefined,
          peerHost: undefined,
        });
      }
    } catch (error) {
      await this.handleUpdateCheckError(error);
    }
  }

  /**
   * Handles Download Update.
   */
  public async downloadUpdate(): Promise<void> {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured() || !this.canDownloadInApp) {
      this.setState({
        stage: 'unsupported',
        source: 'github-release',
        inAppDownloadSupported: false,
        message: this.state.inAppDownloadReason ?? 'In-App-Download nicht verfügbar. Bitte über die Release-Seite aktualisieren.',
      });
      return;
    }
    if (this.peerEnabled && this.peerService) {
      const usedPeer = this.pendingArtifact
        ? await tryPeerFirstDownload({
            peerService: this.peerService,
            pendingArtifact: this.pendingArtifact,
            updateCacheDir: this.updateCacheDir,
            genericFeedUrl: GENERIC_FEED_URL,
            setState: (next) => this.setState(next),
            nowIso: () => new Date().toISOString(),
          })
        : false;
      if (usedPeer) {
        return;
      }
      this.setState({
        stage: 'downloading',
        peerModeStage: 'fallback',
        downloadSource: 'internet',
        message: 'Fallback: Internet-Download wird verwendet.',
      });
      debugSync('peer-fallback', 'internet-download');
    }
    await autoUpdater.downloadUpdate();
  }

  /**
   * Handles Install Downloaded Update.
   */
  public installDownloadedUpdate(): void {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured()) {
      return;
    }
    autoUpdater.quitAndInstall();
  }

  /**
   * Handles Shutdown.
   */
  public shutdown(): void {
    this.peerService?.stopPeerServices();
  }

  /**
   * Handles Configure Auto Updater.
   */
  private configureAutoUpdater(): void {
    if (!this.hasAutoUpdaterApi()) {
      this.autoUpdaterEnabled = false;
      this.autoUpdaterInitError = 'electron-updater API nicht verfügbar';
      return;
    }

    try {
      this.configureUpdaterChannelAndFeed();
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      this.registerAutoUpdaterEvents();
      this.autoUpdaterEnabled = true;
      this.autoUpdaterInitError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.autoUpdaterEnabled = false;
      this.autoUpdaterInitError = message;
      this.setState({
        stage: 'idle',
        message: `Auto-Updater deaktiviert: ${message}`,
      });
    }
  }

  /**
   * Checks whether electron-updater API is available.
   */
  private hasAutoUpdaterApi(): boolean {
    return typeof (autoUpdater as unknown as { checkForUpdates?: unknown }).checkForUpdates === 'function';
  }

  /**
   * Configures updater channel and optional generic feed.
   */
  private configureUpdaterChannelAndFeed(): void {
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
      maybeSetFeedUrl({ provider: 'generic', url: GENERIC_FEED_URL });
    } catch {
      // Ignore and continue with app-update.yml based configuration.
    }
  }

  /**
   * Registers all autoUpdater event handlers.
   */
  private registerAutoUpdaterEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
    });

    autoUpdater.on('update-available', (info) => {
      this.pendingArtifact = toArtifactMeta(
        info as { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> },
      );
      this.setState({
        stage: 'available',
        latestVersion: toDisplayVersion(info.version),
        source: 'electron-updater',
        inAppDownloadSupported: true,
        inAppDownloadReason: 'In-App-Download ist verfügbar.',
      });
    });

    autoUpdater.on('update-not-available', () => {
      this.setState({
        stage: 'not-available',
        source: 'electron-updater',
        inAppDownloadSupported: true,
        inAppDownloadReason: 'In-App-Download ist verfügbar.',
      });
    });

    autoUpdater.on('error', (error) => this.handleAutoUpdaterError(error.message || 'Update-Fehler'));

    autoUpdater.on('download-progress', (progress) => {
      this.setState({
        stage: 'downloading',
        progressPercent: progress.percent,
        progressTransferredBytes: progress.transferred,
        progressTotalBytes: progress.total,
        progressBytesPerSecond: progress.bytesPerSecond,
      });
    });

    autoUpdater.on('update-downloaded', (info) => this.handleUpdateDownloaded(info.version, info as { downloadedFile?: string }));
  }

  /**
   * Handles auto-updater error payloads.
   */
  private handleAutoUpdaterError(message: string): void {
    if (isNoPublishedVersionsError(message)) {
      this.setState({
        stage: 'not-available',
        source: 'github-release',
        inAppDownloadSupported: false,
        inAppDownloadReason: 'Noch keine veröffentlichte Release-Metadaten für In-App-Download verfügbar.',
      });
      return;
    }
    if (isOfflineLikeError(message)) {
      this.setState({ stage: 'idle' });
      return;
    }
    this.setState({ stage: 'error', message });
  }

  /**
   * Handles a downloaded update and triggers auto-install.
   */
  private handleUpdateDownloaded(version: string, info: { downloadedFile?: string }): void {
    const localArtifact = resolveDownloadedArtifactPath(
      this.pendingArtifact?.artifactName,
      info.downloadedFile,
      this.updateCacheDir,
      app.getPath('userData'),
    );
    if (this.pendingArtifact && localArtifact) {
      this.peerService?.announceLocalArtifacts([
        {
          ...this.pendingArtifact,
          filePath: localArtifact,
          freshnessTs: new Date().toISOString(),
        },
      ]);
    }
    this.setState({
      stage: 'downloaded',
      latestVersion: toDisplayVersion(version),
      progressPercent: 100,
      progressTransferredBytes: this.state.progressTotalBytes ?? this.state.progressTransferredBytes,
      source: 'electron-updater',
      inAppDownloadSupported: true,
      inAppDownloadReason: 'Update wurde in der App heruntergeladen. Neustart wird ausgeführt.',
    });
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 1800);
  }

  /**
   * Handles Is Auto Updater Configured.
   */
  private isAutoUpdaterConfigured(): boolean {
    return existsSync(path.join(process.resourcesPath, 'app-update.yml'));
  }

  /**
   * Handles Resolve Display Version.
   */
  private resolveDisplayVersion(): string {
    return process.env.S1_APP_VERSION?.trim() || toDisplayVersion(app.getVersion());
  }

  /**
   * Resolves whether updater checks must use GitHub fallback.
   */
  private resolveGitHubFallbackReason(): string | null {
    if (!this.autoUpdaterEnabled) {
      return this.autoUpdaterInitError
        ? `Auto-Updater ist im aktuellen Build nicht aktiv (${this.autoUpdaterInitError}).`
        : 'Auto-Updater ist im aktuellen Build nicht aktiv.';
    }
    if (!this.isAutoUpdaterConfigured()) {
      return '`app-update.yml` fehlt. In-App-Download ist daher nicht möglich.';
    }
    return null;
  }

  /**
   * Runs GitHub fallback check with a reason text.
   */
  private async runGitHubFallback(reason: string): Promise<void> {
    await checkGitHubReleaseVersion({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      reason,
      resolveDisplayVersion: () => this.resolveDisplayVersion(),
      setState: (next) => this.setState(next),
    });
  }

  /**
   * Handles errors from electron-updater check path.
   */
  private async handleUpdateCheckError(error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    if (isNoPublishedVersionsError(message)) {
      await this.runGitHubFallback('Noch keine veröffentlichte Release-Metadaten für In-App-Download verfügbar.');
      return;
    }
    if (isOfflineLikeError(message)) {
      this.setState({ stage: 'idle' });
      return;
    }
    if (isVersionFormatError(message)) {
      await this.runGitHubFallback(`In-App-Download nicht möglich: ${message}`);
      return;
    }
    this.setState({ stage: 'error', message });
  }

  /**
   * Handles Set State.
   */
  private setState(next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>): void {
    this.state = {
      ...this.state,
      ...next,
      currentVersion: this.resolveDisplayVersion(),
    };
    this.notify(this.state);
  }
}
