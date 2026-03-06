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
  toDisplayVersion,
} from './updater-versioning';
import {
  configureAutoUpdaterFeed,
  hasAutoUpdaterApi,
  registerAutoUpdaterEvents,
} from './updater-auto-updater';
import { isOfflineLikeError } from './updater-network-errors';
import {
  handleUpdateCheckError,
  resolveGitHubFallbackReason,
  runGitHubFallback,
} from './updater-check-flow';
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
      const fallbackReason = resolveGitHubFallbackReason({
        autoUpdaterEnabled: this.autoUpdaterEnabled,
        autoUpdaterInitError: this.autoUpdaterInitError,
        isAutoUpdaterConfigured: this.isAutoUpdaterConfigured(),
      });
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
      await handleUpdateCheckError({
        error,
        runGitHubFallback: (reason) => this.runGitHubFallback(reason),
        setState: (next) => this.setState(next),
      });
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
    if (!hasAutoUpdaterApi()) {
      this.autoUpdaterEnabled = false;
      this.autoUpdaterInitError = 'electron-updater API nicht verfügbar';
      return;
    }

    try {
      configureAutoUpdaterFeed(GENERIC_FEED_URL);
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;
      registerAutoUpdaterEvents({
        onCheckingForUpdate: () => {
          this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
        },
        onUpdateAvailable: (info) => {
          this.pendingArtifact = toArtifactMeta(info);
          this.setState({
            stage: 'available',
            latestVersion: toDisplayVersion(info.version),
            source: 'electron-updater',
            inAppDownloadSupported: true,
            inAppDownloadReason: 'In-App-Download ist verfügbar.',
          });
        },
        onUpdateNotAvailable: (info) => {
          this.setState({
            stage: 'not-available',
            latestVersion: info?.version ? toDisplayVersion(info.version) : this.state.latestVersion,
            source: 'electron-updater',
            inAppDownloadSupported: true,
            inAppDownloadReason: 'In-App-Download ist verfügbar.',
          });
        },
        onError: (message) => this.handleAutoUpdaterError(message),
        onDownloadProgress: (progress) => {
          this.setState({
            stage: 'downloading',
            progressPercent: progress.percent,
            progressTransferredBytes: progress.transferred,
            progressTotalBytes: progress.total,
            progressBytesPerSecond: progress.bytesPerSecond,
          });
        },
        onUpdateDownloaded: (version, info) => this.handleUpdateDownloaded(version, info),
      });
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
   * Runs GitHub fallback check with a reason text.
   */
  private async runGitHubFallback(reason: string): Promise<void> {
    await runGitHubFallback({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      reason,
      resolveDisplayVersion: () => this.resolveDisplayVersion(),
      setState: (next) => this.setState(next),
    });
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
