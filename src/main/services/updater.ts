import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { PeerUpdateStatus, UpdaterState } from '../../shared/types';
import { debugSync } from './debug';
import { UpdatePeerService } from './update-peer';
import { resolveDownloadedArtifactPath, toArtifactMeta, type UpdateArtifactMeta } from './updater-artifact';
import {
  compareVersions,
  isNoPublishedVersionsError,
  normalizeVersion,
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
const GITHUB_RELEASE_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const LAN_PEER_ENABLED_DEFAULT = process.env.S1_UPDATER_LAN_PEER === '1';
const IN_APP_CHECK_TIMEOUT_MS = 12000;
const CHECKING_STAGE_TIMEOUT_MS = 15000;
const IN_APP_CHECK_TIMEOUT_MESSAGE = `In-App Update-Check Zeitüberschreitung (URL: ${GENERIC_FEED_URL}).`;
const GITHUB_CHECK_TIMEOUT_MESSAGE = `Update-Check Zeitüberschreitung (GitHub API: ${GITHUB_RELEASE_API_URL}; GitHub Releases: ${GITHUB_RELEASES_URL}).`;
const CHECKING_STAGE_TIMEOUT_MESSAGE = `Update-Check Zeitüberschreitung. Zuletzt versucht: ${GENERIC_FEED_URL}, ${GITHUB_RELEASE_API_URL} oder ${GITHUB_RELEASES_URL}.`;

/**
 * Runs async work with timeout guard.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

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
  private checkInFlight = false;
  private checkingStageTimer: NodeJS.Timeout | null = null;
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
   * Optionally forces GitHub checks (diagnostic override).
   */
  private shouldPreferGitHubChecks(): boolean {
    return process.env.S1_FORCE_GITHUB_UPDATE_CHECK === '1';
  }

  /**
   * Handles Check For Updates.
   */
  public async checkForUpdates(): Promise<void> {
    if (this.checkInFlight) {
      debugSync('updater', 'check:skip-inflight');
      return;
    }
    this.checkInFlight = true;
    debugSync('updater', 'check:start', {
      source: this.shouldPreferGitHubChecks() ? 'github-preferred' : 'auto-updater',
      autoUpdaterEnabled: this.autoUpdaterEnabled,
      autoUpdaterConfigured: this.isAutoUpdaterConfigured(),
    });
    this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
    this.canDownloadInApp = false;

    try {
      if (this.shouldPreferGitHubChecks()) {
        debugSync('updater', 'check:fallback', { reason: 'packaged-prefer-github' });
        await this.runGitHubFallback('Paketbetrieb: stabiler GitHub-Update-Check.');
        return;
      }
      const fallbackReason = resolveGitHubFallbackReason({
        autoUpdaterEnabled: this.autoUpdaterEnabled,
        autoUpdaterInitError: this.autoUpdaterInitError,
        isAutoUpdaterConfigured: this.isAutoUpdaterConfigured(),
      });
      if (fallbackReason) {
        debugSync('updater', 'check:fallback', { reason: fallbackReason });
        await this.runGitHubFallback(fallbackReason);
        return;
      }

      const result = await withTimeout(
        autoUpdater.checkForUpdates(),
        IN_APP_CHECK_TIMEOUT_MS,
        IN_APP_CHECK_TIMEOUT_MESSAGE,
      );
      this.canDownloadInApp = true;
      const latestVersion = result?.updateInfo?.version;
      this.pendingArtifact = toArtifactMeta(
        result?.updateInfo as { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> } | undefined,
      );
      debugSync('updater', 'check:in-app-result', { latestVersion: latestVersion ?? null });
      this.applyInAppCheckResult(latestVersion);
    } catch (error) {
      debugSync('updater', 'check:error', {
        message: error instanceof Error ? error.message : String(error),
      });
      await handleUpdateCheckError({
        error,
        runGitHubFallback: (reason) => this.runGitHubFallback(reason),
        setState: (next) => this.setState(next),
      });
    } finally {
      this.checkInFlight = false;
      debugSync('updater', 'check:done', { stage: this.state.stage, message: this.state.message ?? null });
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
    this.clearCheckingStageTimer();
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
          if (!this.checkInFlight) {
            return;
          }
          if (this.state.stage !== 'checking') {
            this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
          }
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
   * Applies state for in-app updater result payloads.
   */
  private applyInAppCheckResult(latestVersion: string | undefined): void {
    if (!latestVersion) {
      this.setState({
        stage: 'not-available',
        source: 'electron-updater',
        inAppDownloadSupported: true,
        inAppDownloadReason: 'In-App-Download ist verfügbar.',
      });
      return;
    }
    const currentVersion = normalizeVersion(this.resolveDisplayVersion());
    const remoteVersion = normalizeVersion(latestVersion);
    const compare = compareVersions(currentVersion, remoteVersion);
    this.setState({
      stage: compare !== null && compare < 0 ? 'available' : 'not-available',
      latestVersion: toDisplayVersion(latestVersion),
      message: compare === null ? 'Versionsvergleich nicht eindeutig möglich.' : undefined,
      source: 'electron-updater',
      inAppDownloadSupported: true,
      inAppDownloadReason: 'In-App-Download ist verfügbar.',
      peerModeStage: 'idle',
      downloadSource: undefined,
      peerHost: undefined,
    });
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
    debugSync('updater', 'fallback:start', {
      reason,
      apiUrl: GITHUB_RELEASE_API_URL,
      releasesUrl: GITHUB_RELEASES_URL,
    });
    try {
      await withTimeout(
        runGitHubFallback({
          owner: GITHUB_OWNER,
          repo: GITHUB_REPO,
          reason,
          resolveDisplayVersion: () => this.resolveDisplayVersion(),
          setState: (next) => this.setState(next),
        }),
        IN_APP_CHECK_TIMEOUT_MS,
        GITHUB_CHECK_TIMEOUT_MESSAGE,
      );
      debugSync('updater', 'fallback:done', { stage: this.state.stage, message: this.state.message ?? null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === GITHUB_CHECK_TIMEOUT_MESSAGE) {
        debugSync('updater', 'fallback:timeout', { message: GITHUB_CHECK_TIMEOUT_MESSAGE });
        this.setState({ stage: 'error', message: GITHUB_CHECK_TIMEOUT_MESSAGE });
        return;
      }
      debugSync('updater', 'fallback:error', { message });
      this.setState({ stage: 'error', message });
    }
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
    this.handleCheckingStageWatchdog();
    this.notify(this.state);
  }

  /**
   * Ensures checking stage cannot stay active indefinitely.
   */
  private handleCheckingStageWatchdog(): void {
    if (this.state.stage !== 'checking') {
      this.clearCheckingStageTimer();
      return;
    }
    if (this.checkingStageTimer) {
      return;
    }
    this.checkingStageTimer = setTimeout(() => {
      if (this.state.stage !== 'checking') {
        return;
      }
      debugSync('updater', 'checking-watchdog-timeout', {
        timeoutMs: CHECKING_STAGE_TIMEOUT_MS,
        message: CHECKING_STAGE_TIMEOUT_MESSAGE,
      });
      this.setState({
        stage: 'error',
        message: CHECKING_STAGE_TIMEOUT_MESSAGE,
      });
    }, CHECKING_STAGE_TIMEOUT_MS);
  }

  /**
   * Clears pending checking-stage watchdog timer.
   */
  private clearCheckingStageTimer(): void {
    if (!this.checkingStageTimer) {
      return;
    }
    clearTimeout(this.checkingStageTimer);
    this.checkingStageTimer = null;
  }
}
